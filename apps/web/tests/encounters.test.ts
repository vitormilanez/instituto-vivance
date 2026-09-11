import test from "node:test";
import assert from "node:assert/strict";
import {
  encounterAddendum,
  encounterPatch,
  encounterStart,
} from "../modules/encounters/validation.ts";
test("encounters require explicit start and reject identity injection", () => {
  const start = {
    appointment_id: "00000000-0000-0000-0000-000000000001",
    accept_care: true,
  };
  assert.deepEqual(encounterStart(start), start);
  for (const value of [
    { ...start, accept_care: false },
    { ...start, doctor_id: "other" },
    { ...start, appointment_id: "bad" },
    null,
  ])
    assert.throws(() => encounterStart(value));
});
test("clinical drafts allow blanks; finalization requires reviewed text and version", () => {
  const body = { reason: "", evolution: "", status: "draft", version: 1 };
  assert.equal(encounterPatch(body).values.reason, "");
  for (const patch of [
    { status: "finalized" },
    { status: "published" },
    { version: 0 },
    { version: "1" },
    { version: 1.1 },
    { reason: "a".repeat(2001) },
    { evolution: "a".repeat(10001) },
    { evolution: "\0" },
    { doctor_id: "injected" },
    { tenant_id: "injected" },
    { finalized_at: "injected" },
  ])
    assert.throws(() => encounterPatch({ ...body, ...patch }));
  assert.deepEqual(
    encounterPatch({
      ...body,
      reason: " Motivo ",
      evolution: " Registro\nmanual ",
      status: "finalized",
    }).values,
    { reason: "Motivo", evolution: "Registro\nmanual", status: "finalized" },
  );
});

test("addenda require a source version, reason and correction without identity injection", () => {
  const valid = {
    encounter_version: 3,
    reason: " Correção de informação ",
    content: " Texto correto\ncomplementar ",
  };
  assert.deepEqual(encounterAddendum(valid), {
    encounter_version: 3,
    reason: "Correção de informação",
    content: "Texto correto\ncomplementar",
  });
  for (const patch of [
    { encounter_version: 0 },
    { encounter_version: "3" },
    { encounter_version: 3.1 },
    { reason: "" },
    { reason: "a".repeat(1001) },
    { content: " " },
    { content: "a".repeat(10001) },
    { content: "texto\0inválido" },
    { actor_user_id: "injected" },
    { created_at: "injected" },
    { addendum_number: 99 },
    { tenant_id: "injected" },
  ])
    assert.throws(() => encounterAddendum({ ...valid, ...patch }));
});
