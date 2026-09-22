import { DomainError, databaseFailure } from "@/lib/errors";
import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { pageNumber, tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import {
  requestPreparationInput,
  reviewPreparationInput,
  savePreparationInput,
  submitPreparationInput,
} from "./validation";

import type { PreparationQuestion } from "./questionnaire";

export class ReturnPreparationError extends DomainError {}

// Typed explicitly so TypeScript keeps narrowing after a call that throws.
const failed: (code?: string) => never = databaseFailure({
  error: ReturnPreparationError,
  denied:
    "Seu acesso mudou ou este preparo não está disponível. Atualize a página.",
  conflict:
    "Este preparo mudou em outra sessão. Atualize a página antes de tentar novamente.",
  conflictCodes: ["40001", "23503", "23505", "23514", "22023"],
  log: "Return preparation operation failed",
});

function questionnaireQuestions(value: Json): PreparationQuestion[] {
  if (!Array.isArray(value)) throw new Error("Invalid questionnaire version");
  return value.map((item) => {
    if (
      !item ||
      Array.isArray(item) ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      typeof item.label !== "string"
    )
      throw new Error("Invalid questionnaire version");
    return { id: item.id, label: item.label };
  });
}

async function questionnaire(
  client: Awaited<ReturnType<typeof requireClinic>>["client"],
  version: number,
) {
  const result = await client
    .from("return_preparation_questionnaires")
    .select("version,title,questions")
    .eq("version", version)
    .single();
  if (result.error || !result.data) failed(result.error?.code);
  return { ...result.data, questions: questionnaireQuestions(result.data.questions) };
}

export async function staffReturnPreparations(id: string, pageInput?: string, requestInput?: string) {
  const tenant = tenantId(id), page = pageNumber(pageInput);
  const { client, clinic } = await requireClinic(tenant, ["doctor"]);
  const query = client
    .from("return_preparation_requests")
    .select("*,patients!return_preparation_requests_tenant_id_patient_id_fkey(display_name),appointments!return_preparation_requests_tenant_id_appointment_id_fkey(starts_at,ends_at,status)")
    .eq("tenant_id", tenant)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("requested_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (requestInput) query.eq("id", tenantId(requestInput));
  const result = await query;
  if (result.error) failed(result.error.code);
  const rows = (result.data ?? []).slice(0, 20);
  const ids = rows.map((row) => row.id);
  const [submissions, reviews] = ids.length
    ? await Promise.all([
        client.from("return_preparation_submissions").select("*").eq("tenant_id", tenant).in("request_id", ids),
        client.from("return_preparation_reviews").select("*").eq("tenant_id", tenant).in("request_id", ids),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (submissions.error || reviews.error)
    failed(submissions.error?.code ?? reviews.error?.code);
  const versions = [...new Set(rows.map((row) => row.questionnaire_version))];
  const scripts = await Promise.all(versions.map((version) => questionnaire(client, version)));
  return {
    clinic,
    preparations: rows.map((row) => ({
      ...row,
      questionnaire: scripts.find((script) => script.version === row.questionnaire_version)!,
      submission: submissions.data?.find((item) => item.request_id === row.id) ?? null,
      review: reviews.data?.find((item) => item.request_id === row.id) ?? null,
    })),
    page,
    hasNext: (result.data?.length ?? 0) > 20,
    focused: Boolean(requestInput),
  };
}

export async function patientReturnPreparations(id: string, pageInput?: string, requestInput?: string) {
  const tenant = tenantId(id), page = pageNumber(pageInput);
  const { client, clinic } = await requireClinic(tenant, ["patient"]);
  const query = client
    .from("return_preparation_requests")
    .select("*,appointments!return_preparation_requests_tenant_id_appointment_id_fkey(starts_at,ends_at,status,doctor_display_name)")
    .eq("tenant_id", tenant)
    .order("requested_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (requestInput) query.eq("id", tenantId(requestInput));
  const result = await query;
  if (result.error) failed(result.error.code);
  const rows = (result.data ?? []).slice(0, 20), ids = rows.map((row) => row.id);
  const [drafts, submissions] = ids.length
    ? await Promise.all([
        client.from("return_preparation_drafts").select("*").eq("tenant_id", tenant).in("request_id", ids),
        client.from("return_preparation_submissions").select("*").eq("tenant_id", tenant).in("request_id", ids),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (drafts.error || submissions.error)
    failed(drafts.error?.code ?? submissions.error?.code);
  const versions = [...new Set(rows.map((row) => row.questionnaire_version))];
  const scripts = await Promise.all(versions.map((version) => questionnaire(client, version)));
  return {
    clinic,
    preparations: rows.map((row) => ({
      ...row,
      questionnaire: scripts.find((script) => script.version === row.questionnaire_version)!,
      draft: drafts.data?.find((item) => item.request_id === row.id) ?? null,
      submission: submissions.data?.find((item) => item.request_id === row.id) ?? null,
    })),
    page,
    hasNext: (result.data?.length ?? 0) > 20,
    focused: Boolean(requestInput),
  };
}

// Count all actionable requests; never derive badges from a paginated history.
export async function patientPreparationPending(id: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.from("return_preparation_requests")
    .select("id,status", { count: "exact" })
    .eq("tenant_id", tenant).in("status", ["requested", "draft"])
    .order("requested_at").order("id").limit(1);
  if (result.error) failed(result.error.code);
  return { count: result.count ?? 0, first: result.data?.[0] ?? null };
}

export async function patientPreparationRequirement(id: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["patient"]);
  const appointment = await client
    .from("appointments")
    .select("id,starts_at,doctor_display_name")
    .eq("tenant_id", tenant)
    .eq("status", "scheduled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .order("id")
    .limit(1)
    .maybeSingle();
  if (appointment.error) failed(appointment.error.code);
  if (!appointment.data) return null;
  const preparation = await client
    .from("return_preparation_requests")
    .select("id")
    .eq("tenant_id", tenant)
    .eq("appointment_id", appointment.data.id)
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();
  if (preparation.error) failed(preparation.error.code);
  if (preparation.data) return null;
  return {
    appointmentId: appointment.data.id,
    startsAt: appointment.data.starts_at,
    doctorDisplayName: appointment.data.doctor_display_name,
  };
}

export async function startRequiredPreparation(id: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("start_required_preconsultation", {
    target_tenant: tenant,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function encounterPreparation(id: string, appointmentId: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client.from("return_preparation_requests")
    .select("id,status,questionnaire_version,submitted_at")
    .eq("tenant_id", tenant).eq("appointment_id", tenantId(appointmentId))
    .in("status", ["submitted", "reviewed"])
    .order("submitted_at", { ascending: false }).order("id").limit(1).maybeSingle();
  if (result.error) failed(result.error.code);
  if (!result.data) return null;
  const row = result.data;
  const [script, submission] = await Promise.all([
    questionnaire(client, row.questionnaire_version),
    client.from("return_preparation_submissions").select("answers,priorities,submitted_at")
      .eq("tenant_id", tenant).eq("request_id", row.id).single(),
  ]);
  if (submission.error || !submission.data) failed(submission.error?.code);
  return { ...row, questionnaire: script, submission: submission.data };
}

export type EncounterPreparation = Awaited<ReturnType<typeof encounterPreparation>>;

export async function appointmentPreparationStates(id: string, appointmentIds: string[]) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["doctor"]);
  if (!appointmentIds.length) return {} as Record<string, string>;
  const result = await client
    .from("return_preparation_requests")
    .select("appointment_id,status")
    .eq("tenant_id", tenant)
    .in("status", ["requested", "draft"])
    .in("appointment_id", appointmentIds);
  if (result.error) failed(result.error.code);
  return Object.fromEntries((result.data ?? []).map((row) => [row.appointment_id, row.status]));
}

export async function requestReturnPreparation(id: string, input: unknown) {
  const tenant = tenantId(id), value = requestPreparationInput(input);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("request_return_preparation", {
    target_tenant: tenant,
    target_appointment: value.appointmentId,
    request_key: value.requestKey,
    ...(value.questions ? { supplied_questions: value.questions } : {}),
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function saveReturnPreparation(id: string, requestId: string, input: unknown) {
  const tenant = tenantId(id), target = tenantId(requestId), value = savePreparationInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("save_return_preparation_draft", {
    target_tenant: tenant,
    target_request: target,
    read_version: value.version,
    supplied_answers: value.answers,
    supplied_priorities: value.priorities ?? [],
  });
  if (result.error) failed(result.error.code);
  return { version: result.data };
}

export async function submitReturnPreparation(id: string, requestId: string, input: unknown) {
  const tenant = tenantId(id), target = tenantId(requestId), value = submitPreparationInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("submit_return_preparation", {
    target_tenant: tenant,
    target_request: target,
    read_version: value.version,
    supplied_answers: value.answers,
    supplied_priorities: value.priorities ?? [],
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function reviewReturnPreparation(id: string, requestId: string, input: unknown) {
  const tenant = tenantId(id), target = tenantId(requestId), value = reviewPreparationInput(input);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("review_return_preparation", {
    target_tenant: tenant,
    target_request: target,
    read_version: value.version,
    note_text: value.note,
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export type StaffReturnPreparations = Awaited<ReturnType<typeof staffReturnPreparations>>;
export type PatientReturnPreparations = Awaited<ReturnType<typeof patientReturnPreparations>>;
