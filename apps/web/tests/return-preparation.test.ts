import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  requestPreparationInput,
  reviewPreparationInput,
  savePreparationInput,
  submitPreparationInput,
} from "../modules/return-preparation/validation.ts";

const appointment = "11111111-1111-4111-8111-111111111111";
const requestKey = "22222222-2222-4222-8222-222222222222";

test("return preparation accepts optional answers and omits skipped blanks", () => {
  assert.deepEqual(requestPreparationInput({ appointment_id: appointment, request_key: requestKey }), {
    appointmentId: appointment,
    requestKey,
  });
  assert.deepEqual(savePreparationInput({ version: 0, answers: { changes: "  Melhor sono  ", progress: "" } }), {
    version: 0,
    answers: { changes: "Melhor sono" },
  });
  assert.deepEqual(submitPreparationInput({ version: 2, answers: {}, confirmed: true }), {
    version: 2,
    answers: {},
  });
});

test("return preparation rejects forged fields, stale shapes and missing confirmations", () => {
  assert.throws(() => requestPreparationInput({ appointment_id: appointment, request_key: requestKey, patient_id: appointment }));
  assert.throws(() => savePreparationInput({ version: -1, answers: {} }));
  assert.throws(() => savePreparationInput({ version: 0, answers: { unknown: 42 } }));
  assert.throws(() => submitPreparationInput({ version: 0, answers: {}, confirmed: false }));
  assert.throws(() => reviewPreparationInput({ version: 1, note: "Revisado", confirmed: false }));
  assert.deepEqual(reviewPreparationInput({ version: 3, note: "  Revisado no contexto do retorno.  ", confirmed: true }), {
    version: 3,
    note: "Revisado no contexto do retorno.",
  });
});

test("patient UI requires an explicit final confirmation and keeps cancelled submissions readable", () => {
  const component = readFileSync(
    new URL("../components/return-preparation-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /checked=\{confirmed\}/);
  assert.match(component, /disabled=\{pending \|\| !confirmed\}/);
  assert.match(component, /item\.status === "cancelled" && !item\.submission/);
  assert.match(component, /seu envio continua no histórico/);
});
