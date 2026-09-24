// Envios guardados no celular quando a internet cai: só saem em nome de quem
// registrou, nunca duplicam por conta própria e não travam a fila.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const store = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
const owner = "user-a";
let online = true;
const calls: { url: string; body: string }[] = [];
let respond: (url: string) => Promise<Response> = async () => new Response("{}", { status: 201 });

Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    dispatchEvent: (event: Event) => void listeners.get(event.type)?.forEach((fn) => fn()),
    addEventListener: (type: string, fn: () => void) => void (listeners.get(type) ?? listeners.set(type, new Set()).get(type))!.add(fn),
    removeEventListener: (type: string, fn: () => void) => void listeners.get(type)?.delete(fn),
  },
  document: { querySelector: () => ({ dataset: { pvOwner: owner } }) },
  fetch: async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) });
    return respond(url);
  },
});
Object.defineProperty(globalThis, "navigator", { configurable: true, get: () => ({ onLine: online }) });

const outbox = await import("../components/patient/outbox.ts");

test("sem internet: guarda em nome de quem registrou, sem chamar o servidor", async () => {
  online = false;
  calls.length = 0;
  const sent = await outbox.sendOrQueue("/api/v1/clinics/t/daily-check-ins", { request_key: "k1" }, "Check-in");
  assert.equal(sent.queued, true);
  assert.equal(calls.length, 0);
  assert.equal(outbox.pendingFor("user-a").length, 1);
  assert.equal(outbox.pendingFor("user-b").length, 0);
});

test("falha de rede no meio do envio também guarda", async () => {
  online = true;
  respond = async () => {
    throw new TypeError("Failed to fetch");
  };
  const sent = await outbox.sendOrQueue("/api/v1/clinics/t/measurements", { client_request_id: "k2" }, "Peso");
  assert.equal(sent.queued, true);
  assert.equal(outbox.pendingFor("user-a").length, 2);
});

test("outra conta no mesmo aparelho não envia o que não é dela", async () => {
  respond = async () => new Response("{}", { status: 201 });
  calls.length = 0;
  await outbox.flushOutbox("user-b");
  assert.equal(calls.length, 0);
  assert.equal(outbox.pendingFor("user-a").length, 2);
});

test("quando a conexão volta, envia na ordem com a mesma chave e limpa a fila", async () => {
  calls.length = 0;
  await outbox.flushOutbox("user-a");
  assert.deepEqual(
    calls.map((call) => JSON.parse(call.body)),
    [{ request_key: "k1" }, { client_request_id: "k2" }],
  );
  assert.equal(outbox.pendingFor("user-a").length, 0);
});

test("recusa definitiva (4xx) sai da fila; erro do servidor (5xx) espera", async () => {
  online = false;
  await outbox.sendOrQueue("/a", { request_key: "bad" }, "Check-in");
  await outbox.sendOrQueue("/b", { request_key: "later" }, "Check-in");
  online = true;
  respond = async (url) => new Response("{}", { status: url === "/a" ? 422 : 503 });
  await outbox.flushOutbox("user-a");
  assert.deepEqual(outbox.pendingFor("user-a").map((item) => item.url), ["/b"]);
});

test("as telas de check-in, peso e refeição usam a fila e dizem que ficou no celular", () => {
  for (const file of ["../components/patient/check-in-flow.tsx", "../components/patient-measurements.tsx", "../components/patient/meal-quick.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /sendOrQueue\(/, file);
    assert.match(source, /Salvo no seu celular/, file);
    assert.match(source, /Aguardando conexão/, file);
  }
  const shell = readFileSync(new URL("../components/patient-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /<ConnectionStatus owner=\{user\.id\} \/>/);
  assert.match(shell, /data-pv-owner=\{user\.id\}/);
});

test("carregando e erro próprios do paciente, sem dados de exemplo", () => {
  const dir = "../app/clinicas/[tenantId]/meu-cuidado/[section]/";
  const loading = readFileSync(new URL(dir + "loading.tsx", import.meta.url), "utf8");
  const error = readFileSync(new URL(dir + "error.tsx", import.meta.url), "utf8");
  assert.match(loading, /Carregando suas informações…/);
  assert.doesNotMatch(loading, /\d+[,.]\d+ ?kg/);
  assert.match(error, /Não conseguimos carregar agora/);
  assert.match(error, /Seus registros estão seguros/);
  assert.match(error, /Tentar de novo/);
});
