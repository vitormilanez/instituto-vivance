import "server-only";
import { requireClinic } from "@/modules/identity/service";
import {
  patientInput,
  tenantId,
  patientSearch,
  searchPattern,
} from "@/lib/validation";

export async function listPatients(id: string, page = 1, search = "") {
  const context = await requireClinic(tenantId(id));
  const term = patientSearch(search);
  let query = context.client
    .from("patients")
    .select("id, display_name, birth_date, created_at", { count: "exact" })
    .eq("tenant_id", id);
  if (term) query = query.ilike("display_name", searchPattern(term));
  const { data, error, count } = await query
    .order("display_name")
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Unable to load patient directory");
  const patients = data ?? [];
  // Doctors/nurses see who already sent their initial intake ("Primeiros passos").
  // RLS (patient_onboarding_submission_read_care) scopes this to active care relationships;
  // admins never see it, matching their non-clinical access.
  let onboardingSubmittedAt: Record<string, string> = {};
  if (
    ["doctor", "nurse"].includes(context.clinic.role) &&
    patients.length
  ) {
    const submissions = await context.client
      .from("patient_onboarding_submissions")
      .select("patient_id, submitted_at")
      .eq("tenant_id", id)
      .in(
        "patient_id",
        patients.map((patient) => patient.id),
      );
    if (!submissions.error)
      onboardingSubmittedAt = Object.fromEntries(
        (submissions.data ?? []).map((row) => [
          row.patient_id,
          row.submitted_at,
        ]),
      );
  }
  return {
    clinic: context.clinic,
    patients: patients.map((patient) => ({
      ...patient,
      onboardingSubmittedAt: onboardingSubmittedAt[patient.id] ?? null,
    })),
    count: count ?? 0,
  };
}

export async function getPatient(id: string, patientId: string) {
  const context = await requireClinic(tenantId(id));
  tenantId(patientId);
  const { data, error } = await context.client
    .from("patients")
    .select("id, display_name, birth_date, created_at, updated_at")
    .eq("tenant_id", id)
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw new Error("Unable to load patient");
  return { clinic: context.clinic, patient: data };
}

export async function createPatient(id: string, input: unknown) {
  const { client } = await requireClinic(tenantId(id));
  const values = patientInput(input);
  // Never use a service-role client: the user session and RLS authorize the write.
  // The database trigger appends the audit event in the same transaction.
  const { data, error } = await client
    .from("patients")
    .insert({ tenant_id: id, ...values })
    .select("id, display_name, birth_date, created_at")
    .single();
  if (error) throw new Error("Unable to create patient");
  return data;
}
