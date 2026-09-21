import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  requestPreparationInput,
  reviewPreparationInput,
  savePreparationInput,
  submitPreparationInput,
  questionInput,
  priorityInput,
} from "../modules/return-preparation/validation.ts";
import { preparationQuestions, preparationActionPending } from "../modules/return-preparation/questionnaire.ts";

test("five editable question snapshots preserve stable ids and doctor ordering", () => {
  const reordered = [...preparationQuestions].reverse();
  assert.deepEqual(questionInput(reordered), reordered);
  assert.equal(questionInput(reordered.map((question) => ({ ...question, label: `  ${question.label}  ` })))[0].label, reordered[0].label);
  assert.throws(() => questionInput(reordered.slice(1)));
  assert.throws(() => questionInput([...reordered.slice(1), reordered[1]]));
  assert.throws(() => questionInput(reordered.map((question) => ({ ...question, label: " " }))));
  assert.throws(() => questionInput(reordered.map((question) => ({ ...question, label: "x".repeat(601) }))));
  assert.throws(() => questionInput(reordered.map((question) => ({ ...question, tenant_id: "forged" }))));
});

test("patient priorities are explicit, ordered and bounded, never inferred from missing answers", () => {
  assert.deepEqual(priorityInput([]), []);
  assert.deepEqual(priorityInput(["sleep", "energy", "other"]), ["sleep", "energy", "other"]);
  for (const value of [["sleep", "sleep"], ["diagnosis"], [["sleep"]], null, ["sleep", "energy", "other", "movement"]])
    assert.throws(() => priorityInput(value));
  assert.deepEqual(savePreparationInput({ version: 0, answers: {}, priorities: ["sleep"] }), { version: 0, answers: {}, priorities: ["sleep"] });
  assert.throws(() => submitPreparationInput({ version: 0, answers: {}, priorities: [], confirmed: true }));
});

test("action badges follow task state, not unread notifications", () => {
  for (const status of ["requested", "draft"]) assert.equal(preparationActionPending(status), true);
  for (const status of ["submitted", "reviewed", "cancelled", "unknown"]) assert.equal(preparationActionPending(status), false);
  const service = readFileSync(new URL("../modules/return-preparation/service.ts", import.meta.url), "utf8");
  assert.match(service, /count: "exact"/);
  assert.match(service, /if \(requestInput\) query\.eq\("id", tenantId\(requestInput\)\)/);
});

const appointment = "11111111-1111-4111-8111-111111111111";
const requestKey = "22222222-2222-4222-8222-222222222222";

test("return preparation saves partial drafts but requires all five answers to submit", () => {
  assert.deepEqual(requestPreparationInput({ appointment_id: appointment, request_key: requestKey }), {
    appointmentId: appointment,
    requestKey,
  });
  assert.deepEqual(savePreparationInput({ version: 0, answers: { changes: "  Melhor sono  ", progress: "" } }), {
    version: 0,
    answers: { changes: "Melhor sono" },
  });
  const complete = Object.fromEntries(
    preparationQuestions.map((question) => [question.id, `Resposta sobre ${question.id}`]),
  );
  assert.throws(() => submitPreparationInput({ version: 2, answers: { goal: "Objetivo" }, confirmed: true }));
  assert.deepEqual(submitPreparationInput({ version: 2, answers: complete, confirmed: true }), {
    version: 2,
    answers: complete,
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
  assert.match(component, /disabled=\{pending \|\| !complete \|\| !confirmed\}/);
  assert.match(component, /aria-required="true"/);
  assert.match(component, /Pré-consulta obrigatória/);
  assert.match(component, /item\.status === "cancelled" && !item\.submission/);
  assert.match(component, /seu envio continua no histórico/);
});
