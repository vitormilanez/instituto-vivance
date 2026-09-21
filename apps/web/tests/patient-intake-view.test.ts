import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { staffIntakeView } from "../modules/patient-intake/view.ts";

const live = {
  id: "intake-1",
  tenant_id: "tenant-1",
  patient_id: "patient-1",
  status: "completed",
  reason_text: "Sono ruim",
  expected_outcome: "Dormir melhor",
  first_priority: "Entender os despertares",
  source: "patient_reported",
  recorded_by: "user-2",
  recorded_by_name: "Paciente",
  version: 3,
  completed_at: "2026-09-21T01:00:00.000Z",
  updated_at: "2026-09-21T01:00:00.000Z",
};

const history = {
  intake_id: "intake-1",
  tenant_id: "tenant-1",
  patient_id: "patient-1",
  status: "draft",
  reason_text: "Sono ruim",
  expected_outcome: "Dormir melhor",
  first_priority: "Entender os despertares",
  source: "staff_assisted",
  recorded_by: "user-1",
  recorded_by_name: "Dra. Ana",
  version: 1,
  completed_at: null,
  created_at: "2026-09-20T23:00:00.000Z",
};

test("a readable intake is shown as it is, with nothing pending", () => {
  assert.deepEqual(staffIntakeView(live, null), {
    awaitingPatient: false,
    record: {
      id: "intake-1",
      tenantId: "tenant-1",
      patientId: "patient-1",
      questionnaireVersion: "vivance-acolhimento-v1",
      status: "completed",
      reason: "Sono ruim",
      expectedOutcome: "Dormir melhor",
      firstPriority: "Entender os despertares",
      source: "patient_reported",
      recordedBy: "user-2",
      recordedByName: "Paciente",
      version: 3,
      completedAt: "2026-09-21T01:00:00.000Z",
      updatedAt: "2026-09-21T01:00:00.000Z",
    },
  });
});

test("a private patient draft keeps the team's own record visible as awaiting", () => {
  const view = staffIntakeView(null, history);
  assert.equal(view?.awaitingPatient, true);
  assert.equal(view?.record.id, "intake-1");
  assert.equal(view?.record.version, 1);
  assert.equal(view?.record.source, "staff_assisted");
  assert.equal(view?.record.recordedByName, "Dra. Ana");
  assert.equal(view?.record.updatedAt, "2026-09-20T23:00:00.000Z");
});

test("no readable record and no history stays an honest empty state", () => {
  assert.equal(staffIntakeView(null, null), null);
});

test("the awaiting state never reopens the record for editing", () => {
  const page = readFileSync(
    new URL("../app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx", import.meta.url),
    "utf8",
  );
  const panel = readFileSync(
    new URL("../components/patient-intake-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /canEdit=\{context\.clinic\.role === "doctor" && !intake\.awaitingPatient\}/);
  assert.match(panel, /Aguardando envio do paciente/);
});
