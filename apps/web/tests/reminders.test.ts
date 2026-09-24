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
