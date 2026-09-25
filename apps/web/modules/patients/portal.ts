import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";

export async function myPatientProfile(id: string) {
  const { client, user, clinic } = await requireClinic(tenantId(id), [
    "patient",
  ]);
  const { data: account, error: accountError } = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (accountError) throw new Error("Unable to load patient account");
  if (!account) return { clinic, patient: null };
  const { data: patient, error } = await client
    .from("patients")
    .select("id, display_name, birth_date, created_at")
    .eq("tenant_id", id)
    .eq("id", account.patient_id)
    .maybeSingle();
  if (error) throw new Error("Unable to load own patient profile");
  return { clinic, patient };
}
