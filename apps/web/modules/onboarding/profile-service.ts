import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import type { Json } from "@/lib/supabase/database.types";
import { emptyNutrition, emptyPhotos, type PatientProfileContext, type SubmittedPatientProfileContext } from "./profile-types";
import { profilePatchInput, profileSubmissionInput } from "./profile-validation";

export class ProfileContextError extends DomainError {}

const draftFields = "tenant_id,patient_id,version,nutrition,photos,exams_status,exams_document_ids,nutrition_submitted_at,photos_submitted_at,exams_submitted_at,updated_at" as const;

function databaseError(error: { code?: string }): never {
  if (error.code === "40001") throw new ProfileContextError("Este perfil mudou em outra tela. Atualize antes de continuar.", 409);
  if (error.code === "23514") throw new ProfileContextError("Confira os dados e documentos deste perfil.", 422);
  if (error.code === "42501") throw new ProfileContextError("Você não pode realizar esta ação.", 403);
  throw new Error("Profile context database operation failed");
}
function mapDraft(row: Record<string, unknown>): PatientProfileContext {
  return {
    tenantId: row.tenant_id as string, patientId: row.patient_id as string,
    version: row.version as number, nutrition: row.nutrition as PatientProfileContext["nutrition"],
    photos: row.photos as PatientProfileContext["photos"],
    examsStatus: row.exams_status as PatientProfileContext["examsStatus"],
    examsDocumentIds: row.exams_document_ids as string[],
    nutritionSubmittedAt: row.nutrition_submitted_at as string | null,
    photosSubmittedAt: row.photos_submitted_at as string | null,
    examsSubmittedAt: row.exams_submitted_at as string | null,
    updatedAt: row.updated_at as string,
  };
}

export async function getPatientProfileContext(id: string): Promise<PatientProfileContext> {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const account = await client.from("patient_accounts").select("patient_id").eq("tenant_id", tenant).eq("user_id", user.id).maybeSingle();
  if (account.error) databaseError(account.error);
  if (!account.data) throw new ProfileContextError("Perfil de paciente não encontrado.", 404);
  const result = await client.from("patient_profile_context").select(draftFields).eq("tenant_id", tenant).eq("user_id", user.id).maybeSingle();
  if (result.error) databaseError(result.error);
  return result.data ? mapDraft(result.data) : {
    tenantId: tenant, patientId: account.data.patient_id, version: 1,
    nutrition: emptyNutrition(), photos: emptyPhotos(), examsStatus: "not_started",
    examsDocumentIds: [], nutritionSubmittedAt: null, photosSubmittedAt: null,
    examsSubmittedAt: null, updatedAt: null,
  };
}

export async function savePatientProfileContext(id: string, input: unknown): Promise<PatientProfileContext> {
  const tenant = tenantId(id);
  const { readVersion, patch } = profilePatchInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("save_patient_profile_context", { target_tenant: tenant, read_version: readVersion, patch: patch as unknown as Json });
  if (result.error) databaseError(result.error);
  return getPatientProfileContext(tenant);
}

export async function submitPatientProfileContext(id: string, input: unknown): Promise<PatientProfileContext> {
  const tenant = tenantId(id);
  const { readVersion, section } = profileSubmissionInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("submit_patient_profile_context", {
    target_tenant: tenant, read_version: readVersion, target_section: section, explicit_share_consent: true,
  });
  if (result.error) databaseError(result.error);
  return getPatientProfileContext(tenant);
}

export async function getSubmittedPatientProfileContext(id: string, patientId: string): Promise<SubmittedPatientProfileContext> {
  const tenant = tenantId(id), patient = tenantId(patientId);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const rows = await Promise.all((["nutrition", "photos", "exams"] as const).map((section) =>
    client.from("patient_profile_context_submissions")
      .select("section,payload,submitted_at,source_version")
      .eq("tenant_id", tenant).eq("patient_id", patient).eq("section", section)
      .order("submitted_at", { ascending: false }).limit(1)));
  for (const result of rows) if (result.error) databaseError(result.error);
  const output: SubmittedPatientProfileContext = { nutrition: null, photos: null, exams: null };
  for (const row of rows.flatMap((result) => result.data ?? [])) {
    if (row.section === "nutrition" && !output.nutrition)
      output.nutrition = { ...(row.payload as object as PatientProfileContext["nutrition"]), submittedAt: row.submitted_at };
    if (row.section === "photos" && !output.photos)
      output.photos = { ...(row.payload as object as PatientProfileContext["photos"]), submittedAt: row.submitted_at };
    if (row.section === "exams" && !output.exams)
      output.exams = { ...(row.payload as object as { status: "shared" | "none_now"; documentIds: string[] }), submittedAt: row.submitted_at };
  }
  return output;
}
