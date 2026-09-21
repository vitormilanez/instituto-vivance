import { DomainError } from "@/lib/errors";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { identity, requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import {
  acceptInvitationInput,
  claimInvitationInput,
  onboardingPatchInput,
  onboardingSubmissionInput,
  patientInvitationInput,
} from "./validation";
import type { OnboardingRecord, PatientInvitation } from "./types";
import type { Database } from "@/lib/supabase/database.types";

export class OnboardingError extends DomainError {}

const onboardingFields = "tenant_id,patient_id,status,current_step,skipped_steps,questionnaire_version,exam_document_ids,photo_document_id,birth_date,weight_kg,height_cm,waist_cm,measured_on,answer_goal,answer_history,answer_routine,answer_treatments,answer_questions,share_consent,version,submitted_at,updated_at" as const;
const submissionFields = "tenant_id,patient_id,current_step,skipped_steps,questionnaire_version,exam_document_ids,photo_document_id,birth_date,weight_kg,height_cm,waist_cm,measured_on,answer_goal,answer_history,answer_routine,answer_treatments,answer_questions,share_consent,source_version,submitted_at" as const;

function databaseError(error: { code?: string }): never {
  if (error.code === "40001") throw new OnboardingError("Este rascunho mudou em outra tela. Atualize antes de continuar.", 409);
  if (error.code === "23505") throw new OnboardingError("Esta conta já possui uma identidade de paciente nesta clínica.", 409);
  if (error.code === "23514") throw new OnboardingError("O convite ou onboarding não está mais disponível neste estado.", 409);
  if (error.code === "42501") throw new OnboardingError("Você não pode realizar esta ação.", 403);
  throw new Error("Onboarding database operation failed");
}

function mapOnboarding(row: Record<string, unknown>): OnboardingRecord {
  const number = (value: unknown) => value == null ? null : Number(value);
  return {
    tenantId: row.tenant_id as string,
    patientId: row.patient_id as string,
    status: row.status as OnboardingRecord["status"],
    currentStep: row.current_step as OnboardingRecord["currentStep"],
    skippedSteps: row.skipped_steps as OnboardingRecord["skippedSteps"],
    examDocumentIds: row.exam_document_ids as string[],
    version: row.version as number,
    questionnaireVersion: row.questionnaire_version as "vivance-preconsulta-v1",
    profile: { photoDocumentId: row.photo_document_id as string | null, birthDate: row.birth_date as string | null },
    measurements: { weightKg: number(row.weight_kg), heightCm: number(row.height_cm), waistCm: number(row.waist_cm), measuredOn: row.measured_on as string | null },
    answers: { goal: row.answer_goal as string, history: row.answer_history as string, routine: row.answer_routine as string, treatments: row.answer_treatments as string, questions: row.answer_questions as string },
    shareConsent: row.share_consent as boolean,
    submittedAt: row.submitted_at as string | null,
    updatedAt: row.updated_at as string,
  };
}

export async function listInvitationDoctors(id: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["admin"]);
  const result = await client.from("memberships").select("user_id,display_name").eq("tenant_id", tenant).eq("role", "doctor").eq("status", "active").order("display_name").limit(500);
  if (result.error) throw new Error("Unable to list invitation doctors");
  return (result.data ?? []).map((doctor) => ({ id: doctor.user_id, displayName: doctor.display_name ?? "Médico" }));
}

export async function listClinicPatientInvitations(id: string) {
  const tenant = tenantId(id);
  const { client, clinic } = await requireClinic(tenant, ["admin", "doctor"]);
  const [invitations, doctors] = await Promise.all([
    client.rpc("list_clinic_patient_invitations", { target_tenant: tenant }),
    clinic.role === "admin" ? listInvitationDoctors(tenant) : Promise.resolve([]),
  ]);
  if (invitations.error) databaseError(invitations.error);
  return { doctors, invitations: (invitations.data ?? []).map((row) => ({
    id: row.id, displayName: row.display_name, channel: row.channel,
    status: row.status, doctorId: row.doctor_id,
    delivery: { status: row.delivery_status }, expiresAt: row.expires_at,
    createdAt: row.created_at,
  })) };
}

export async function revokePatientInvitation(id: string, invitationId: string) {
  const tenant = tenantId(id); const invitation = tenantId(invitationId);
  const { client } = await requireClinic(tenant, ["admin", "doctor"]);
  const result = await client.rpc("revoke_patient_invitation", { target_tenant: tenant, target_invitation: invitation });
  if (result.error) databaseError(result.error);
  if (!result.data) throw new OnboardingError("Convite não encontrado.", 404);
  return { invitation: { id: invitation, status: "revoked" as const } };
}

export async function createPatientInvitation(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = patientInvitationInput(input);
  const { client } = await requireClinic(tenant, ["admin", "doctor"]);
  const session = await client.auth.getSession();
  if (session.error || !session.data.session) throw new OnboardingError("Sua sessão expirou. Entre novamente.", 401);
  const invoked = await client.functions.invoke("invite-patient", {
    body: { tenantId: tenant, ...values },
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
  });
  if (invoked.error) {
    const context = "context" in invoked.error ? invoked.error.context : undefined;
    if (context instanceof Response) {
      let message = "Não foi possível criar o convite.";
      try { const body = await context.clone().json() as { error?: unknown }; if (typeof body.error === "string") message = body.error; } catch {}
      throw new OnboardingError(message, context.status >= 400 && context.status < 600 ? context.status : 503);
    }
    throw new Error("Patient invitation function failed");
  }
  const body = invoked.data as { invitation?: PatientInvitation; shareUrl?: string } | null;
  if (!body?.invitation) throw new Error("Invalid patient invitation response");
  return body;
}

export async function claimPatientInvitation(input: unknown) {
  const values = claimInvitationInput(input);
  const client = await createClient();
  const invoked = await client.functions.invoke("claim-patient-invitation", { body: values });
  if (invoked.error) throw new Error("Patient invitation claim failed");
  return { verificationRequested: true as const };
}

export async function listMyPatientInvitations() {
  const { client } = await identity();
  const result = await client.rpc("list_my_patient_invitations");
  if (result.error) databaseError(result.error);
  return (result.data ?? []).map((row) => ({
    id: row.id, tenantId: row.tenant_id, clinicName: row.clinic_name,
    displayName: row.display_name, status: row.status as "pending",
    expiresAt: row.expires_at, createdAt: row.created_at,
  }));
}

export async function acceptPatientInvitation(input: unknown) {
  const values = acceptInvitationInput(input);
  const { client } = await identity();
  const result = await client.rpc("accept_patient_invitation", { target_invitation: values.invitationId, explicit_accept: true }).single();
  if (result.error) databaseError(result.error);
  const row = result.data;
  const onboarding = await getPatientOnboarding(row.tenant_id);
  return { invitation: { id: row.invitation_id, status: "accepted" as const }, clinic: { tenantId: row.tenant_id }, patient: { id: row.patient_id }, onboarding };
}

export async function getPatientOnboarding(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const result = await client.from("patient_onboarding").select(onboardingFields).eq("tenant_id", tenant).eq("user_id", user.id).maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data) throw new OnboardingError("Onboarding não encontrado.", 404);
  return mapOnboarding(result.data);
}

export async function getPatientOnboardingContext(id: string) {
  const tenant = tenantId(id);
  const onboarding = await getPatientOnboarding(tenant);
  const { client } = await requireClinic(tenant, ["patient"]);
  const context = await client.rpc("get_my_patient_onboarding_context", { target_tenant: tenant }).maybeSingle();
  if (context.error) databaseError(context.error);
  if (!context.data) throw new OnboardingError("Contexto do onboarding não encontrado.", 404);
  return { clinicName: context.data.clinic_name, doctorName: context.data.doctor_name, onboarding };
}

export async function savePatientOnboarding(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = onboardingPatchInput(input);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const result = await client.from("patient_onboarding").update(values as Database["public"]["Tables"]["patient_onboarding"]["Update"]).eq("tenant_id", tenant).eq("user_id", user.id).eq("version", values.expected_version as number).select(onboardingFields).maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data) throw new OnboardingError("Este rascunho mudou em outra tela. Atualize antes de continuar.", 409);
  return mapOnboarding(result.data);
}

export async function submitPatientOnboarding(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = onboardingSubmissionInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const submitted = await client.rpc("submit_patient_onboarding", { target_tenant: tenant, read_version: values.version, explicit_share_consent: true });
  if (submitted.error) databaseError(submitted.error);
  return getPatientOnboarding(tenant);
}

export async function getSubmittedPatientOnboarding(id: string, patientId: string) {
  const tenant = tenantId(id);
  const patient = tenantId(patientId);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client.from("patient_onboarding_submissions").select(submissionFields).eq("tenant_id", tenant).eq("patient_id", patient).maybeSingle();
  if (result.error) databaseError(result.error);
  return result.data ? mapOnboarding({ ...result.data, status: "submitted", version: result.data.source_version, updated_at: result.data.submitted_at }) : null;
}
