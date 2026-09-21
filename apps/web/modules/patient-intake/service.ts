import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { patientIntakeInput } from "./validation";
import type { PatientIntakeContext } from "./types";

export class PatientIntakeError extends DomainError {}

const fields =
  "id,tenant_id,patient_id,questionnaire_version,status,reason_text,expected_outcome,first_priority,source,recorded_by,recorded_by_name,version,completed_at,updated_at" as const;

function databaseError(error: { code?: string }): never {
  if (error.code === "40001")
    throw new PatientIntakeError(
      "Este acolhimento mudou em outra tela. Atualize antes de continuar.",
      409,
    );
  if (error.code === "42501")
    throw new PatientIntakeError("Você não pode alterar este acolhimento.", 403);
  if (error.code === "23514")
    throw new PatientIntakeError("Revise as três respostas antes de salvar.", 409);
  throw new Error("Patient intake database operation failed");
}

function mapIntake(row: Record<string, unknown>): PatientIntakeContext {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    patientId: row.patient_id as string,
    questionnaireVersion: "vivance-acolhimento-v1",
    status: row.status as PatientIntakeContext["status"],
    reason: row.reason_text as string,
    expectedOutcome: row.expected_outcome as string,
    firstPriority: row.first_priority as string,
    source: row.source as PatientIntakeContext["source"],
    recordedBy: row.recorded_by as string,
    recordedByName: row.recorded_by_name as string,
    version: row.version as number,
    completedAt: row.completed_at as string | null,
    updatedAt: row.updated_at as string,
  };
}

export async function getPatientIntake(id: string, patientId: string) {
  const tenant = tenantId(id);
  const patient = tenantId(patientId);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client
    .from("patient_intake_contexts")
    .select(fields)
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .maybeSingle();
  if (result.error) databaseError(result.error);
  return result.data ? mapIntake(result.data as Record<string, unknown>) : null;
}

export async function canInvitePatientToIntake(id: string, patientId: string) {
  const tenant = tenantId(id);
  const patient = tenantId(patientId);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("patient_intake_invitation_available", {
    target_tenant: tenant,
    target_patient: patient,
  });
  if (result.error) databaseError(result.error);
  return result.data === true;
}

export async function getOwnPatientIntake(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const account = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (account.error) databaseError(account.error);
  if (!account.data) return null;
  const result = await client
    .from("patient_intake_contexts")
    .select(fields)
    .eq("tenant_id", tenant)
    .eq("patient_id", account.data.patient_id)
    .maybeSingle();
  if (result.error) databaseError(result.error);
  return result.data ? mapIntake(result.data as Record<string, unknown>) : null;
}

export async function savePatientIntake(
  id: string,
  patientId: string,
  input: unknown,
) {
  const tenant = tenantId(id);
  const patient = tenantId(patientId);
  const values = patientIntakeInput(input);
  const { client } = await requireClinic(tenant, ["doctor", "patient"]);
  const result = await client
    .from("patient_intake_contexts")
    .update(values)
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .eq("version", values.expected_version)
    .select(fields)
    .maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data)
    throw new PatientIntakeError(
      "Este acolhimento mudou em outra tela. Atualize antes de continuar.",
      409,
    );
  return mapIntake(result.data as Record<string, unknown>);
}
