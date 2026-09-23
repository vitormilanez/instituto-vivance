import "server-only";
import { DomainError, databaseFailure } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { reminderInput, subscriptionInput } from "./model";

export class ReminderError extends DomainError {}
const failed: (code?: string) => never = databaseFailure({
  error: ReminderError,
  denied: "Sua conta não está vinculada a esta ficha. Atualize a página.",
  conflict: "Não foi possível salvar o lembrete.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Reminder operation failed",
});
const missingTable = (code?: string) => code === "42P01" || code === "PGRST205";

// null = tabela ainda não existe (o primeiro acesso não aparece).
// undefined = a pessoa ainda não passou pelas boas-vindas.
export async function myReminderPreference(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const result = await client
    .from("patient_reminder_preferences")
    .select("reminder_enabled,reminder_time,onboarded_at")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (missingTable(result.error?.code)) return null;
  if (result.error) failed(result.error.code);
  return result.data ?? undefined;
}

export async function saveReminderPreference(id: string, input: unknown) {
  const tenant = tenantId(id);
  const value = reminderInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("save_reminder_preference", {
    target_tenant: tenant,
    enabled: value.enabled,
    at_time: value.time,
  });
  if (result.error) failed(result.error.code);
  return { ok: true };
}

export async function savePushSubscription(id: string, input: unknown) {
  const tenant = tenantId(id);
  const value = subscriptionInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("save_push_subscription", {
    target_tenant: tenant,
    push_endpoint: value.endpoint,
    push_p256dh: value.p256dh,
    push_auth: value.auth,
  });
  if (result.error) failed(result.error.code);
  return { ok: true };
}

export async function deletePushSubscription(id: string, input: unknown) {
  const tenant = tenantId(id);
  const value = subscriptionInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("delete_push_subscription", { push_endpoint: value.endpoint });
  if (result.error) failed(result.error.code);
  return { ok: true };
}
