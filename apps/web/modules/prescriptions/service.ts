import "server-only";
import { DomainError, databaseFailure as databaseFailureFor } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { prescriptionInput } from "./validation";
import type { PrescriptionArchive, PrescriptionCursor } from "./types";

export class PrescriptionError extends DomainError {}
const databaseFailure: (code?: string) => never = databaseFailureFor({
  error: PrescriptionError,
  denied: "Seu acesso a este histórico mudou. Atualize a página.",
  conflict: "Esta receita não pôde ser adicionada ao histórico.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Prescription archive operation failed",
});
const missingTable = (code?: string) =>
  code === "42P01" || code === "PGRST202" || code === "PGRST205";
const pageSize = 20;

async function requirePatientAccess(
  tenant: string,
  patient: string,
  context: Awaited<ReturnType<typeof requireClinic>>,
) {
  if (context.clinic.role === "patient") {
    const account = await context.client
      .from("patient_accounts")
      .select("patient_id")
      .eq("tenant_id", tenant)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (account.error) databaseFailure(account.error.code);
    if (account.data?.patient_id !== patient)
      throw new PrescriptionError("Este histórico não pertence à sua conta.", 403);
    return;
  }
  const relationship = await context.client
    .from("care_relationships")
    .select("id")
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .eq("professional_id", context.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (relationship.error) databaseFailure(relationship.error.code);
  if (!relationship.data)
    throw new PrescriptionError(
      "Seu vínculo de cuidado com este paciente não está ativo.",
      403,
    );
}

export async function listPrescriptions(
  id: string,
  patientId: string,
  cursor: PrescriptionCursor | null,
): Promise<PrescriptionArchive> {
  const tenant = tenantId(id);
  const patient = tenantId(patientId);
  const context = await requireClinic(tenant, ["doctor", "nurse", "patient"]);
  await requirePatientAccess(tenant, patient, context);
  const result = await context.client.rpc("list_patient_prescriptions_page", {
    target_tenant: tenant,
    target_patient: patient,
    before_prescribed_on: cursor?.prescribedOn ?? null,
    before_created_at: cursor?.createdAt ?? null,
    before_id: cursor?.id ?? null,
    page_limit: pageSize + 1,
  });
  if (missingTable(result.error?.code)) return { available: false, prescriptions: [] };
  if (result.error) databaseFailure(result.error.code);
  const page = (result.data ?? []).slice(0, pageSize);
  const prescriptions = page.map((row) => ({
    id: row.id,
    title: row.title,
    prescribedOn: row.prescribed_on,
    sourceType: row.source_type as "document" | "memed",
    documentId: row.document_id,
    memedUrl: row.memed_url,
    visibility: row.visibility as "internal" | "shared",
    createdAt: row.created_at,
  }));
  const last = prescriptions.at(-1);
  return {
    available: true,
    prescriptions,
    nextCursor:
      (result.data?.length ?? 0) > pageSize && last
        ? { prescribedOn: last.prescribedOn, createdAt: last.createdAt, id: last.id }
        : null,
  };
}

export async function addPrescription(id: string, input: unknown) {
  const tenant = tenantId(id);
  const value = prescriptionInput(input);
  const context = await requireClinic(tenant, ["doctor", "nurse", "patient"]);
  await requirePatientAccess(tenant, value.patientId, context);
  const result = await context.client.rpc("record_patient_prescription", {
    target_tenant: tenant,
    target_patient: value.patientId,
    request_key: value.requestKey,
    title_text: value.title,
    prescription_date: value.prescribedOn,
    source_kind: value.source.type,
    source_document: value.source.type === "document" ? value.source.documentId : null,
    source_url: value.source.type === "memed" ? value.source.url : null,
    input_visibility: value.visibility,
    explicit_patient_consent: value.patientConsent,
  });
  if (result.error) databaseFailure(result.error.code);
  if (!result.data) throw new Error("Prescription archive returned an invalid response");
  return { id: result.data };
}
