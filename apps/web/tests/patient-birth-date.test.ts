import assert from "node:assert/strict";
import test from "node:test";
import { patientBirthDate, patientBirthLabel } from "../modules/patients/birth-date.ts";

test("submitted onboarding birth date fills an empty clinical registration", () => {
  assert.deepEqual(patientBirthDate(null, "1990-03-12"), {
    date: "1990-03-12",
    source: "patient",
  });
  assert.equal(
    patientBirthLabel(null, "1990-03-12", "2026-10-10"),
    "36 anos · nascimento informado pelo paciente em 12/03/1990",
  );
});

test("registered birth date takes priority without changing either source", () => {
  assert.deepEqual(patientBirthDate("1989-04-20", "1990-03-12"), {
    date: "1989-04-20",
    source: "registered",
  });
  assert.deepEqual(patientBirthDate(null, null), { date: null, source: null });
  assert.equal(
    patientBirthLabel("1989-04-20", "1990-03-12", "2026-10-10"),
    "37 anos · nascimento em 20/04/1989",
  );
  assert.equal(patientBirthLabel(null, null, "2026-10-10"), "Nascimento não informado");
});
