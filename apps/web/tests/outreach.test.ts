import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { outreachInput } from "../modules/messages/outreach-validation.ts";
import { outreachRecipientKey } from "../modules/messages/outreach-key.ts";
import { mergeOutreachResults, pendingOutreachRecipients, type OutreachAttempt } from "../modules/messages/outreach-attempt.ts";

test("outreach bounds each batch, normalizes reviewed content, and rejects caller-selected identity", () => {
  const id = randomUUID(), batchKey = randomUUID();
  assert.deepEqual(outreachInput({ patient_ids: [id], content: "  Olá,\n juntos. " }, batchKey), { patientIds: [id], content: "Olá, juntos.", batchKey });
  for (const input of [{ patient_ids: [id, id], content: "Oi" }, { patient_ids: Array.from({ length: 6 }, randomUUID), content: "Oi" }, { patient_ids: [id], content: "Oi", doctor_id: id }, { patient_ids: [], content: "Oi" }]) assert.throws(() => outreachInput(input, batchKey));
  assert.throws(() => outreachInput({ patient_ids: [id], content: "Oi" }, null));
  assert.throws(() => outreachInput({ patient_ids: [id], content: "x".repeat(4001) }, batchKey));
});

test("per-patient keys survive retries and remain distinct across patients and deliberate sends", () => {
  const batch = randomUUID(), a = randomUUID(), b = randomUUID();
  assert.equal(outreachRecipientKey(batch, a), outreachRecipientKey(batch, a));
  assert.notEqual(outreachRecipientKey(batch, a), outreachRecipientKey(batch, b));
  assert.notEqual(outreachRecipientKey(batch, a), outreachRecipientKey(randomUUID(), a));
  assert.match(outreachRecipientKey(batch, a), /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-8[\da-f]{3}-[\da-f]{12}$/);
});

test("partial outcomes never downgrade successful sends and retry only uncertain/retryable patients", () => {
  const initial: OutreachAttempt = { tenantId: randomUUID(), doctorId: randomUUID(), batchKey: randomUUID(), content: "Oi", patientIds: ["a", "b", "c", "d"], results: [] };
  const partial = mergeOutreachResults(initial, [{ patientId: "a", status: "sent" }, { patientId: "b", status: "failed", retryable: true }, { patientId: "c", status: "failed", retryable: false }]);
  assert.deepEqual(pendingOutreachRecipients(partial), ["b", "d"]);
  const retry = mergeOutreachResults(partial, [{ patientId: "a", status: "failed" }, { patientId: "b", status: "sent" }, { patientId: "unrelated", status: "sent" }]);
  assert.deepEqual(pendingOutreachRecipients(retry), ["d"]);
  assert.equal(retry.results.find((result) => result.patientId === "a")?.status, "sent");
  assert.equal(retry.results.length, 3);
  assert.equal(retry.batchKey, initial.batchKey);
  assert.equal(retry.content, initial.content);
});
