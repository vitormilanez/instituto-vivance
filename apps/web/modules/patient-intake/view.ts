import type { PatientIntakeContext, StaffPatientIntake } from "./types";

type Row = Record<string, unknown>;

export const intakeFields =
  "id,tenant_id,patient_id,questionnaire_version,status,reason_text,expected_outcome,first_priority,source,recorded_by,recorded_by_name,version,completed_at,updated_at" as const;

export const intakeVersionFields =
  "intake_id,tenant_id,patient_id,questionnaire_version,status,reason_text,expected_outcome,first_priority,source,recorded_by,recorded_by_name,version,completed_at,created_at" as const;

function answers(row: Row) {
  return {
    tenantId: row.tenant_id as string,
    patientId: row.patient_id as string,
    questionnaireVersion: "vivance-acolhimento-v1" as const,
    status: row.status as PatientIntakeContext["status"],
    reason: row.reason_text as string,
    expectedOutcome: row.expected_outcome as string,
    firstPriority: row.first_priority as string,
    source: row.source as PatientIntakeContext["source"],
    recordedBy: row.recorded_by as string,
    recordedByName: row.recorded_by_name as string,
    version: row.version as number,
    completedAt: row.completed_at as string | null,
  };
}

export function mapIntake(row: Row): PatientIntakeContext {
  return { id: row.id as string, ...answers(row), updatedAt: row.updated_at as string };
}

export function mapIntakeVersion(row: Row): PatientIntakeContext {
  return {
    id: row.intake_id as string,
    ...answers(row),
    updatedAt: row.created_at as string,
  };
}

// The patient's own draft stays private until they send it. When that draft
// hides the live row, the care team still sees the last version it may read
// instead of an empty state that would deny a record it created.
export function staffIntakeView(
  live: Row | null,
  history: Row | null,
): StaffPatientIntake | null {
  if (live) return { record: mapIntake(live), awaitingPatient: false };
  if (history) return { record: mapIntakeVersion(history), awaitingPatient: true };
  return null;
}
