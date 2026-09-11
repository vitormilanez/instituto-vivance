import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { planPage } from "@/modules/care-plans/validation";
import { requestInput, reviewInput, submissionInput } from "./validation";

export class CheckInError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
function failed(code?: string): never {
  if (code === "42501")
    throw new CheckInError(
      "Seu acesso mudou ou este check-in não está disponível. Atualize a página.",
      403,
    );
  if (["23514", "23503", "23505"].includes(code ?? ""))
    throw new CheckInError(
      "Este check-in mudou. Atualize a página antes de tentar novamente.",
      409,
    );
  throw new Error("Check-in operation failed");
}
async function details(
  client: Awaited<ReturnType<typeof requireClinic>>["client"],
  tenant: string,
  rows: Array<{ id: string }>,
) {
  const ids = rows.map((row) => row.id);
  if (!ids.length) return { submissions: [], reviews: [] };
  const [submissions, reviews] = await Promise.all([
    client
      .from("care_check_in_submissions")
      .select("*")
      .eq("tenant_id", tenant)
      .in("check_in_id", ids),
    client
      .from("care_check_in_reviews")
      .select("*")
      .eq("tenant_id", tenant)
      .in("check_in_id", ids),
  ]);
  if (submissions.error) failed(submissions.error.code);
  if (reviews.error) failed(reviews.error.code);
  return { submissions: submissions.data ?? [], reviews: reviews.data ?? [] };
}
export async function staffCheckIns(id: string, pageInput?: string) {
  const tenant = tenantId(id),
    page = planPage(pageInput);
  const { client, clinic, user } = await requireClinic(tenant, [
    "doctor",
    "nurse",
  ]);
  const [checkIns, links] = await Promise.all([
    client
      .from("care_check_ins")
      .select(
        "*,patients!care_check_ins_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", tenant)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("requested_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20),
    client
      .from("care_relationships")
      .select(
        "patient_id,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", tenant)
      .eq("professional_id", user.id)
      .eq("status", "active")
      .order("patient_id"),
  ]);
  if (checkIns.error || links.error)
    failed(checkIns.error?.code ?? links.error?.code);
  const rows = (checkIns.data ?? []).slice(0, 20),
    related = await details(client, tenant, rows);
  return {
    clinic,
    checkIns: rows.map((row) => ({
      ...row,
      submission:
        related.submissions.find((s) => s.check_in_id === row.id) ?? null,
      review: related.reviews.find((r) => r.check_in_id === row.id) ?? null,
    })),
    patients: (links.data ?? []).map((link) => ({
      id: link.patient_id,
      display_name: link.patients?.display_name ?? "Paciente",
    })),
    page,
    hasNext: (checkIns.data?.length ?? 0) > 20,
  };
}
export async function patientCheckIns(id: string, pageInput?: string) {
  const tenant = tenantId(id),
    page = planPage(pageInput),
    { client, clinic } = await requireClinic(tenant, ["patient"]);
  const result = await client
    .from("care_check_ins")
    .select("*")
    .eq("tenant_id", tenant)
    .order("requested_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (result.error) failed(result.error.code);
  const rows = (result.data ?? []).slice(0, 20),
    related = await details(client, tenant, rows);
  return {
    clinic,
    checkIns: rows.map((row) => ({
      ...row,
      submission:
        related.submissions.find((s) => s.check_in_id === row.id) ?? null,
    })),
    page,
    hasNext: (result.data?.length ?? 0) > 20,
  };
}
export async function requestCheckIn(id: string, input: unknown) {
  const v = requestInput(input),
    { client } = await requireClinic(tenantId(id), ["doctor", "nurse"]);
  const r = await client.rpc("request_care_check_in", {
    target_tenant: id,
    target_patient: v.patientId,
    prompt_text: v.prompt,
    due_on: v.dueOn,
  });
  if (r.error) failed(r.error.code);
  return { id: r.data };
}
export async function submitCheckIn(
  id: string,
  checkInId: string,
  input: unknown,
) {
  const v = submissionInput(input),
    { client } = await requireClinic(tenantId(id), ["patient"]);
  const r = await client.rpc("submit_care_check_in", {
    target_tenant: id,
    target_check_in: tenantId(checkInId),
    report_text: v.report,
    measure_label: v.measureLabel,
    measure_value: v.measureValue,
    measure_unit: v.measureUnit,
    reported_on: v.reportedOn,
    confirmed: true,
  });
  if (r.error) failed(r.error.code);
  return { id: r.data };
}
export async function reviewCheckIn(
  id: string,
  checkInId: string,
  input: unknown,
) {
  const v = reviewInput(input),
    { client } = await requireClinic(tenantId(id), ["doctor", "nurse"]);
  const r = await client.rpc("review_care_check_in", {
    target_tenant: id,
    target_check_in: tenantId(checkInId),
    note_text: v.note,
    confirmed: true,
  });
  if (r.error) failed(r.error.code);
  return { id: r.data };
}
export type StaffCheckIns = Awaited<ReturnType<typeof staffCheckIns>>;
export type PatientCheckIns = Awaited<ReturnType<typeof patientCheckIns>>;
