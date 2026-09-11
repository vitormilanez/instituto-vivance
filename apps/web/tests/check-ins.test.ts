import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requestInput,
  reviewInput,
  submissionInput,
} from "../modules/check-ins/validation.ts";

const patientId = "11111111-1111-4111-8111-111111111111";

test("check-in inputs preserve the manual flow and reject forged or partial data", () => {
  assert.deepEqual(
    requestInput({
      patient_id: patientId,
      prompt: "Como você se sentiu desde a consulta?",
      due_on: null,
    }),
    {
      patientId,
      prompt: "Como você se sentiu desde a consulta?",
      dueOn: null,
    },
  );
  assert.deepEqual(
    submissionInput({
      report: "Mantive a rotina combinada.",
      reported_on: "2026-09-11",
      measure_label: "Peso",
      measure_value: 78.4,
      measure_unit: "kg",
      confirmed: true,
    }),
    {
      report: "Mantive a rotina combinada.",
      reportedOn: "2026-09-11",
      measureLabel: "Peso",
      measureValue: 78.4,
      measureUnit: "kg",
    },
  );
  assert.throws(() =>
    submissionInput({
      report: "Relato",
      reported_on: "2026-09-11",
      measure_label: "Peso",
      measure_value: null,
      measure_unit: "kg",
      confirmed: true,
    }),
  );
  assert.throws(() =>
    reviewInput({ note: "Revisado", confirmed: true, status: "urgent" }),
  );
});
