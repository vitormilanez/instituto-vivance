import test from "node:test";
import assert from "node:assert/strict";
import {
  encounterAddendum,
  encounterCursor,
  encounterDetailCursor,
  encounterPatch,
  encounterSearch,
  encounterStart,
} from "../modules/encounters/validation.ts";
test("encounters require explicit start and reject identity injection", () => {
  const start = {
    appointment_id: "00000000-0000-0000-0000-000000000001",
    appointment_version: 1,
    accept_care: true,
  };
  assert.deepEqual(encounterStart(start), start);
  for (const value of [
    { ...start, accept_care: false },
    { ...start, doctor_id: "other" },
    { ...start, appointment_id: "bad" },
    { ...start, appointment_version: 0 },
    { ...start, appointment_version: "1" },
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

test("clinical search uses a tenant-bound opaque cursor and bounded literal text", () => {
  const clinic = "00000000-0000-0000-0000-000000000001";
  const otherClinic = "00000000-0000-0000-0000-000000000002";
  const id = "00000000-0000-0000-0000-000000000003";
  const createdAt = "2026-09-11T12:00:00.123456+00:00";
  const cursor = encounterCursor(clinic, createdAt, id, "Maria % _");
  assert.deepEqual(encounterSearch({ query: "  Maria % _  ", cursor }, clinic), {
    query: "Maria % _",
    beforeCreatedAt: createdAt,
    beforeId: id,
  });
  assert.deepEqual(encounterSearch({}, clinic), {
    query: "",
    beforeCreatedAt: null,
    beforeId: null,
  });
  for (const value of [
    { query: "a".repeat(81) },
    { query: "line\nbreak" },
    { query: "patient", cursor: "not-json" },
    { query: "patient", cursor: `${cursor}x` },
    { query: "patient", cursor },
    {
      query: "patient",
      cursor: encounterCursor(otherClinic, createdAt, id, "patient"),
    },
    { query: "patient", extra: true },
  ])
    assert.throws(() => encounterSearch(value, clinic));
});

test("detail history cursor accepts only a positive bounded integer", () => {
  assert.equal(encounterDetailCursor(undefined), undefined);
  assert.equal(encounterDetailCursor("20"), 20);
  for (const value of ["", "0", "01", "-1", "1.2", "1000000000", ["2"]])
    assert.throws(() => encounterDetailCursor(value));
});
