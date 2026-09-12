import assert from "node:assert/strict";
import test from "node:test";
import {
  reportApprovalInput,
  reportCreateInput,
  reportPatchInput,
} from "../modules/reports/validation.ts";

const patientId = "11111111-1111-4111-8111-111111111111";
const sourceId = "22222222-2222-4222-8222-222222222222";

test("report creation accepts only one patient and a bounded period", () => {
  assert.deepEqual(
    reportCreateInput({
      patient_id: patientId,
      period_start: "2026-09-01",
      period_end: "2026-09-12",
    }),
    {
      patientId,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-12",
    },
  );
  assert.throws(() =>
    reportCreateInput({
      patient_id: patientId,
      period_start: "2026-09-12",
      period_end: "2026-09-01",
    }),
  );
  assert.throws(() =>
    reportCreateInput({
      patient_id: patientId,
      period_start: "2025-01-01",
      period_end: "2026-09-12",
    }),
  );
});

test("draft remains flexible while review requires complete human content and a source", () => {
  assert.deepEqual(
    reportPatchInput({
      version: 1,
      status: "draft",
      title: "  Acompanhamento  ",
      summary: "",
      consultation_points: "",
      sources: [],
    }),
    {
      version: 1,
      status: "draft",
      title: "Acompanhamento",
      summary: "",
      consultationPoints: "",
      sources: [],
    },
  );
  assert.deepEqual(
    reportPatchInput({
      version: 2,
      status: "in_review",
      title: "Acompanhamento",
      summary: "Relato organizado manualmente.",
      consultation_points: "Confirmar evolução na consulta.",
      sources: [{ type: "check_in", id: sourceId }],
    }).sources,
    [{ type: "check_in", id: sourceId }],
  );
  assert.throws(() =>
    reportPatchInput({
      version: 2,
      status: "in_review",
      title: "Acompanhamento",
      summary: "Relato",
      consultation_points: "",
      sources: [],
    }),
  );
  assert.throws(() =>
    reportPatchInput({
      version: 2,
      status: "approved",
      title: "Acompanhamento",
      summary: "Relato",
      consultation_points: "Ponto",
      sources: [{ type: "check_in", id: sourceId }],
    }),
  );
});

test("report sources are allowlisted, unique and capped", () => {
  const base = {
    version: 1,
    status: "draft",
    title: "",
    summary: "",
    consultation_points: "",
  };
  assert.throws(() =>
    reportPatchInput({
      ...base,
      sources: [
        { type: "check_in", id: sourceId },
        { type: "check_in", id: sourceId },
      ],
    }),
  );
  assert.throws(() =>
    reportPatchInput({
      ...base,
      sources: [{ type: "generated_summary", id: sourceId }],
    }),
  );
});

test("approval requires an explicit confirmation for the current version", () => {
  assert.deepEqual(reportApprovalInput({ version: 3, confirmed: true }), {
    version: 3,
  });
  assert.throws(() => reportApprovalInput({ version: 3, confirmed: false }));
  assert.throws(() => reportApprovalInput({ version: 0, confirmed: true }));
});
