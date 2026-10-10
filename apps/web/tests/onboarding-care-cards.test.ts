import test from "node:test";
import assert from "node:assert/strict";
import { withSubmittedOnboarding, type ContextCard } from "../modules/workspace/patient-context-cards.ts";
const cards = ["measurements", "goals"].map(id => ({ id, title: id, state: "Ausente", pending: true, action: "Abrir", href: "/original", request: null, history: null })) as ContextCard[];
const snapshot = { measurements: { weightKg: 76.1, heightCm: 175, waistCm: null }, answers: { goal: "Ter mais disposição" } };
test("submitted initial context replaces false absence with a source-specific link", () => {
  const result = withSubmittedOnboarding(cards, snapshot, "/patient");
  assert.equal(result[0].state, "Informadas no cadastro inicial");
  assert.equal(result[1].state, "Informado no cadastro inicial");
  assert.ok(result.every(card => !card.pending && card.href.endsWith("#cadastro-paciente")));
  assert.ok(cards.every(card => card.pending));
});
test("missing initial context and existing longitudinal facts retain their states", () => {
  assert.equal(withSubmittedOnboarding(cards, null, "/patient"), cards);
  const existing = { ...cards[0], pending: false, state: "Última atualização em 10/10" };
  assert.equal(withSubmittedOnboarding([existing], snapshot, "/patient")[0], existing);
  const empty = { measurements: { weightKg: null, heightCm: null, waistCm: null }, answers: { goal: "" } };
  assert.deepEqual(withSubmittedOnboarding(cards, empty, "/patient"), cards);
});
