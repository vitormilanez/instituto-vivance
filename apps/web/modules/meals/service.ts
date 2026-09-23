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

function recordFailure(
  code?: string,
  details?: string | null,
  message?: string,
): never {
  if (code === "23505" && details === "meal_request_key_reused")
    throw new MealError(
      "Esta solicitação já foi usada com outro conteúdo. Atualize a página para registrar de novo.",
      409,
    );
  if (code === "23505" && /photo_document/i.test(message ?? ""))
    throw new MealError(
      "Esta foto já está ligada a outra refeição. Escolha outra imagem.",
      409,
    );
  if (code === "23514")
    throw new MealError("Informe uma refeição de agora ou de um horário anterior.", 422);
  return failed(code);
}

export async function patientMeals(id: string) {
  const tenant = tenantId(id);
  const { client, clinic } = await requireClinic(tenant, ["patient"]);
  // The account ties every photo upload to this patient's own record.
  const [result, account] = await Promise.all([
    client.from("patient_meal_logs")
      .select("*").eq("tenant_id", tenant).order("eaten_at", { ascending: false }).order("id", { ascending: false }).limit(20),
    client.from("patient_accounts").select("patient_id").eq("tenant_id", tenant).maybeSingle(),
  ]);
  if (result.error || account.error)
    failed(result.error?.code ?? account.error?.code);
  return {
    clinic,
    patientId: account.data?.patient_id ?? null,
    meals: result.data ?? [],
  };
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
    // A foto é opcional também na chamada: sem foto continuam os cinco
    // argumentos, então registrar refeição segue funcionando mesmo em um banco
    // onde a migration da foto ainda não chegou.
    ...(value.photoDocument ? { photo_document: value.photoDocument } : {}),
  });
  if (result.error)
    recordFailure(result.error.code, result.error.details, result.error.message);
  return { id: result.data };
}

export type PatientMeals = Awaited<ReturnType<typeof patientMeals>>;
export type StaffMeals = Awaited<ReturnType<typeof staffMeals>>;
