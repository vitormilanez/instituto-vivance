import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { patientIntakeInput } from "./validation";
import {
  intakeFields,
  intakeVersionFields,
  mapIntake,
  staffIntakeView,
} from "./view";

export class PatientIntakeError extends DomainError {}

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

export async function getPatientIntake(id: string, patientId: string) {
  const tenant = tenantId(id);
  const patient = tenantId(patientId);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const live = await client
    .from("patient_intake_contexts")
    .select(intakeFields)
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .maybeSingle();
  if (live.error) databaseError(live.error);
  if (live.data) return staffIntakeView(live.data as Record<string, unknown>, null);
  const history = await client
    .from("patient_intake_context_versions")
    .select(intakeVersionFields)
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (history.error) databaseError(history.error);
  return staffIntakeView(
    null,
    (history.data as Record<string, unknown> | null) ?? null,
  );
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
    .select(intakeFields)
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
    .select(intakeFields)
    .maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data)
    throw new PatientIntakeError(
      "Este acolhimento mudou em outra tela. Atualize antes de continuar.",
      409,
    );
  return mapIntake(result.data as Record<string, unknown>);
}
