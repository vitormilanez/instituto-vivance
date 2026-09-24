import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reminderInput, reminderLabel, reminderMessage, subscriptionInput } from "../modules/reminders/model.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("preferência salva descreve horário, sem alegar inscrição do aparelho", () => {
  assert.deepEqual(reminderInput({ enabled: true, time: "09:00" }), { enabled: true, time: "09:00" });
  assert.equal(reminderLabel({ reminder_enabled: true, reminder_time: "20:00:00" }, 3), "A cada 3 dias às 20:00 · horário salvo");
  assert.equal(reminderLabel(null, 1), "Desligado");
  assert.doesNotMatch(reminderLabel({ reminder_enabled: true, reminder_time: "09:00:00" }, 1), /notificação ativa/i);
});

test("ativação só é anunciada quando o aparelho confirma subscribed", () => {
  const welcome = read("../components/patient/welcome-flow.tsx");
  assert.ok(welcome.indexOf("await save(enabled)") < welcome.indexOf("subscribeThisDevice(tenantId)"));
  assert.match(welcome, /outcome !== "subscribed"/);
  assert.match(welcome, /setNote\(outcome\)/);
  assert.match(welcome, /notificações não estão ativas neste aparelho/);
  assert.match(welcome, /enabled \? "\?enviado=lembrete" : ""/);
});

test("cliente distingue inscrito, negado, sem suporte e falha", () => {
  const push = read("../components/patient/push.ts");
  for (const outcome of ["subscribed", "denied", "unsupported", "failed"]) assert.match(push, new RegExp(`"${outcome}"`));
  assert.match(push, /return response\.ok \? "subscribed" : "failed"/);
});

test("validação e texto genérico do push continuam protegidos", () => {
  assert.throws(() => subscriptionInput({ endpoint: "http://x", keys: { p256dh: "a".repeat(40), auth: "b".repeat(16) } }));
  assert.doesNotMatch(`${reminderMessage.title} ${reminderMessage.body}`, /peso|remédio|medicamento|tratamento|dose|efeito/i);
});

// Exercise the client against browser doubles, without permission prompts or
// a real service worker/network. Failed registration must never mean enabled.
test("push só confirma ativação após permissão e persistência da inscrição", async (t) => {
  const { pushSupport, subscribeThisDevice } = await import("../components/patient/push.ts");
  const names = ["window", "navigator", "Notification", "fetch"] as const;
  const descriptors = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const originalKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  t.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalKey;
  });
  const set = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  set("window", {});
  set("navigator", { userAgent: "test" });
  assert.equal(pushSupport(), "unsupported");
  assert.equal(await subscribeThisDevice("clinic"), "unsupported");
  set("navigator", { userAgent: "iPhone" });
  assert.equal(pushSupport(), "needs-install");

  let permission = "denied", registrationFails = false, posted = 0, accepted = false;
  const subscription = { toJSON: () => ({ endpoint: "https://push.example.test/sub", keys: { p256dh: "test", auth: "test" } }) };
  set("window", { PushManager: {}, Notification: {} });
  set("Notification", { requestPermission: async () => permission });
  set("navigator", { userAgent: "test", serviceWorker: {
    ready: Promise.resolve(),
    register: async () => {
      if (registrationFails) throw new Error("registration failed");
      return { pushManager: { getSubscription: async () => subscription } };
    },
  } });
  set("fetch", async () => { posted++; return { ok: accepted }; });
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AQ";
  assert.equal(await subscribeThisDevice("clinic"), "denied");
  assert.equal(posted, 0);
  permission = "granted";
  registrationFails = true;
  assert.equal(await subscribeThisDevice("clinic"), "failed");
  assert.equal(posted, 0);
  registrationFails = false;
  assert.equal(await subscribeThisDevice("clinic"), "failed");
  accepted = true;
  assert.equal(await subscribeThisDevice("clinic"), "subscribed");
  assert.equal(posted, 2);
});
