import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { beforeEach } from "node:test";

const store = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
let online = true;
let failWrites = false;
let activeOwner = "user-a";
const calls: { url: string; body: string }[] = [];
let respond: (url: string) => Promise<Response> = async () => new Response("{}", { status: 201 });

Object.assign(globalThis, {
  window: {
    location: { pathname: "/clinicas/t/meu-cuidado/hoje" },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new DOMException("quota", "QuotaExceededError");
        store.set(key, value);
      },
      removeItem: (key: string) => {
        if (failWrites) throw new DOMException("quota", "QuotaExceededError");
        store.delete(key);
      },
    },
    dispatchEvent: (event: Event) => void listeners.get(event.type)?.forEach((fn) => fn()),
    addEventListener: (type: string, fn: () => void) => void (listeners.get(type) ?? listeners.set(type, new Set()).get(type))!.add(fn),
    removeEventListener: (type: string, fn: () => void) => void listeners.get(type)?.delete(fn),
  },
  document: { querySelector: () => ({ dataset: { pvOwner: activeOwner } }) },
  fetch: async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) });
    return respond(url);
  },
});
Object.defineProperty(globalThis, "navigator", { configurable: true, get: () => ({ onLine: online }) });

const outbox = await import("../components/patient/outbox.ts");

beforeEach(() => {
  store.clear();
  calls.length = 0;
  online = true;
  failWrites = false;
  activeOwner = "user-a";
  respond = async () => new Response("{}", { status: 201 });
});

test("só confirma fila depois que o armazenamento aceita o registro", async () => {
  online = false;
  failWrites = true;
  await assert.rejects(
    outbox.sendOrQueue("/api/v1/clinics/t/daily-check-ins", { request_key: "k1" }, "Check-in"),
    /Não foi possível guardar/,
  );
  assert.equal(calls.length, 0);
  assert.equal(outbox.pendingFor("user-a", "t").length, 0);
});

test("fila separa conta e clínica e nunca reenvia no escopo atual errado", async () => {
  online = false;
  const sent = await outbox.sendOrQueue("/api/v1/clinics/t/daily-check-ins", { request_key: "original" }, "Check-in");
  assert.equal(sent.queued, true);
  assert.equal(outbox.pendingFor("user-a", "t").length, 1);
  assert.equal(outbox.pendingFor("user-b", "t").length, 0);
  assert.equal(outbox.pendingFor("user-a", "outra").length, 0);

  online = true;
  await outbox.flushOutbox("user-b", "t");
  await outbox.flushOutbox("user-a", "outra");
  assert.equal(calls.length, 0);
});

test("recuperação mantém o corpo e a chave originais e mostra o envio concluído", async () => {
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/measurements", { client_request_id: "mesma-chave", weight_kg: 80 }, "Peso");
  online = true;
  await outbox.flushOutbox("user-a", "t");
  assert.deepEqual(calls.map((call) => JSON.parse(call.body)), [{ client_request_id: "mesma-chave", weight_kg: 80 }]);
  const items = outbox.outboxSnapshot("user-a", "t").items;
  assert.equal(items[0].status, "sent");
  assert.equal(items[0].body, "");
  assert.equal(outbox.pendingFor("user-a", "t").length, 0);
});

test("recusa permanente fica visível e pode ser tentada de novo ou descartada", async () => {
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "meal-key" }, "Refeição");
  online = true;
  respond = async () => new Response("{}", { status: 422 });
  await outbox.flushOutbox("user-a", "t");
  let item = outbox.outboxSnapshot("user-a", "t").items[0];
  assert.equal(item.status, "failed");
  assert.equal(item.failure, "rejected");

  calls.length = 0;
  respond = async () => new Response("{}", { status: 201 });
  await outbox.retryOutboxItem(item.id, "user-a", "t");
  assert.deepEqual(calls.map((call) => JSON.parse(call.body)), [{ request_key: "meal-key" }]);
  item = outbox.outboxSnapshot("user-a", "t").items[0];
  assert.equal(item.status, "sent");
  assert.equal(outbox.discardOutboxItem(item.id, "user-a", "t"), true);
  assert.equal(outbox.outboxSnapshot("user-a", "t").items.length, 0);
});

test("403 vira falha visível; só 401 permanece pendente para outra sessão", async () => {
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "forbidden" }, "Refeição");
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "signed-out" }, "Refeição");
  online = true;
  respond = async () => {
    const key = JSON.parse(calls.at(-1)!.body).request_key;
    return new Response("{}", { status: key === "forbidden" ? 403 : 401 });
  };
  await outbox.flushOutbox("user-a", "t");
  const items = outbox.outboxSnapshot("user-a", "t").items;
  assert.deepEqual(items.map((item) => item.status), ["failed", "pending"]);
});

test("novo registro durante fetch não é sobrescrito pela resposta anterior", async () => {
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "first" }, "Refeição");
  let release!: (response: Response) => void;
  respond = async () => new Promise<Response>((resolve) => { release = resolve; });
  online = true;
  const flushing = outbox.flushOutbox("user-a", "t");
  await new Promise((resolve) => setTimeout(resolve, 0));
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "concurrent" }, "Refeição");
  online = true;
  release(new Response("{}", { status: 201 }));
  await flushing;
  const items = outbox.outboxSnapshot("user-a", "t").items;
  assert.deepEqual(items.map((item) => [JSON.parse(item.body || "{}").request_key ?? "stripped", item.status]), [
    ["stripped", "sent"],
    ["concurrent", "pending"],
  ]);
});

test("descarte durante fetch vence e a resposta não ressuscita o item", async () => {
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "discarded" }, "Refeição");
  const id = outbox.pendingFor("user-a", "t")[0].id;
  let release!: (response: Response) => void;
  respond = async () => new Promise<Response>((resolve) => { release = resolve; });
  online = true;
  const flushing = outbox.flushOutbox("user-a", "t");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(outbox.discardOutboxItem(id, "user-a", "t"), true);
  release(new Response("{}", { status: 201 }));
  await flushing;
  assert.deepEqual(outbox.outboxSnapshot("user-a", "t").items, []);
});

test("troca de conta interrompe a fila antes do próximo reenvio", async () => {
  online = false;
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "first" }, "Refeição");
  await outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "second" }, "Refeição");
  let release!: (response: Response) => void;
  respond = async () => new Promise<Response>((resolve) => { release = resolve; });
  online = true;
  const flushing = outbox.flushOutbox("user-a", "t");
  await new Promise((resolve) => setTimeout(resolve, 0));
  activeOwner = "user-b";
  release(new Response("{}", { status: 201 }));
  await flushing;
  assert.equal(calls.length, 1);
  assert.deepEqual(outbox.outboxSnapshot("user-a", "t").items.map((item) => item.status), ["sent", "pending"]);
});

test("expiração e limite não apagam registros silenciosamente", async () => {
  const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const item = (index: number, createdAt = Date.now()) => ({
    id: `id-${index}`, owner: "user-a", tenantId: "t", url: "/api/v1/clinics/t/meals",
    body: JSON.stringify({ request_key: `k-${index}` }), label: "Refeição", createdAt, status: "pending",
  });
  store.set("pv-outbox-v1", JSON.stringify([item(0, old)]));
  const expired = outbox.outboxSnapshot("user-a", "t").items[0];
  assert.equal(expired.status, "failed");
  assert.equal(expired.failure, "expired");

  store.set("pv-outbox-v1", JSON.stringify(Array.from({ length: 30 }, (_, index) => item(index))));
  online = false;
  await assert.rejects(
    outbox.sendOrQueue("/api/v1/clinics/t/meals", { request_key: "overflow" }, "Refeição"),
    /fila do celular está cheia/,
  );
  assert.equal(outbox.outboxSnapshot("user-a", "t").items.length, 30);
});

test("falha ao persistir normalização é sinalizada sem disparar eventos em ciclo", () => {
  const legacy = {
    id: "legacy", owner: "user-a", url: "/api/v1/clinics/t/meals",
    body: JSON.stringify({ request_key: "legacy-key" }), label: "Refeição", createdAt: Date.now(),
  };
  store.set("pv-outbox-v1", JSON.stringify([legacy]));
  let events = 0;
  const listener = () => { events += 1; };
  listeners.set("pv-outbox", new Set([listener]));
  failWrites = true;
  const snapshot = outbox.outboxSnapshot("user-a", "t");
  assert.equal(snapshot.storageError, true);
  assert.equal(snapshot.items.length, 1);
  assert.equal(events, 0);
});

test("interface expõe pendente, enviado e falhou com recuperação explícita", () => {
  const status = readFileSync(new URL("../components/patient/connection-status.tsx", import.meta.url), "utf8");
  assert.match(status, /pendente/);
  assert.match(status, /enviado/);
  assert.match(status, /não aceito/);
  assert.match(status, /Tentar novamente/);
  assert.match(status, /window\.confirm/);
  assert.match(status, /Descartar envio/);
  assert.match(status, /Fechar confirmação/);
  assert.match(status, /Fotos e pré-consulta precisam de internet/);
});

test("check-in, peso e refeição sem foto usam a fila; foto não ganha promessa offline", () => {
  for (const file of ["../components/patient/check-in-flow.tsx", "../components/patient-measurements.tsx", "../components/patient/meal-quick.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /sendOrQueue\(/, file);
  }
  const meal = readFileSync(new URL("../components/patient/meal-quick.tsx", import.meta.url), "utf8");
  assert.ok(meal.indexOf("uploadDocument(") < meal.indexOf("sendOrQueue("));
  const preparation = readFileSync(new URL("../components/patient/preparation-flow.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(preparation, /sendOrQueue\(/);
});
