import "server-only";
import { DomainError, databaseFailure } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { mealInput } from "./validation";

export class MealError extends DomainError {}
const failed: (code?: string) => never = databaseFailure({
  error: MealError,
  denied: "Seu acesso mudou ou este registro não está disponível. Atualize a página.",
  conflict: "Este registro já foi recebido. Atualize a página.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Meal operation failed",
});

function recordFailure(code?: string): never {
  if (code === "23514")
    throw new MealError("Informe uma refeição de agora ou de um horário anterior.", 422);
  return failed(code);
}

export async function patientMeals(id: string) {
  const tenant = tenantId(id);
  const { client, clinic } = await requireClinic(tenant, ["patient"]);
  const result = await client.from("patient_meal_logs")
    .select("*").eq("tenant_id", tenant).order("eaten_at", { ascending: false }).order("id", { ascending: false }).limit(20);
  if (result.error) failed(result.error.code);
  return { clinic, meals: result.data ?? [] };
}

export async function staffMeals(id: string) {
  const tenant = tenantId(id);
  const { client, clinic } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client.from("patient_meal_logs")
    .select("*,patients!patient_meal_logs_tenant_id_patient_id_fkey(display_name)")
    .eq("tenant_id", tenant).order("eaten_at", { ascending: false }).order("id", { ascending: false }).limit(40);
  if (result.error) failed(result.error.code);
  return { clinic, meals: result.data ?? [] };
}

export async function recordMeal(id: string, input: unknown) {
  const tenant = tenantId(id), value = mealInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("record_patient_meal", {
    target_tenant: tenant,
    request_key: value.requestKey,
    type_text: value.mealType,
    happened_at: value.eatenAt,
    note_text: value.description,
  });
  if (result.error) recordFailure(result.error.code);
  return { id: result.data };
}

export type PatientMeals = Awaited<ReturnType<typeof patientMeals>>;
export type StaffMeals = Awaited<ReturnType<typeof staffMeals>>;
