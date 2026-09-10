import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { patientInput, tenantId } from "@/lib/validation";

export async function listPatients(id: string, page = 1) {
  const context = await requireClinic(tenantId(id));
  const { data, error, count } = await context.client
    .from("patients")
    .select("id, display_name, birth_date, created_at", { count: "exact" })
    .eq("tenant_id", id)
    .order("display_name")
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Unable to load patient directory");
  return { clinic: context.clinic, patients: data ?? [], count: count ?? 0 };
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
