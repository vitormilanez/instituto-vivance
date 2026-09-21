import { DomainError, databaseFailure as databaseFailureFor } from "@/lib/errors";
import "server-only";
import { pageNumber, tenantId } from "@/lib/validation";
import type { Database } from "@/lib/supabase/database.types";
import { requireClinic } from "@/modules/identity/service";
import { notificationId, notificationPreferenceInput } from "./validation";

type NoticeRow = Database["public"]["Tables"]["in_app_notifications"]["Row"];

export class NotificationError extends DomainError {}

// Typed explicitly so TypeScript keeps narrowing after a call that throws.
const databaseFailure: (code?: string) => never = databaseFailureFor({
  error: NotificationError,
  denied:
    "Seu acesso mudou ou este aviso não está disponível. Atualize a página.",
  conflict:
    "Este aviso mudou. Atualize a página antes de tentar novamente.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "In-app notification operation failed",
});

export async function inAppNotifications(id: string, pageInput?: string) {
  const tenant = tenantId(id);
  const page = pageNumber(pageInput);
  const { client, clinic, user } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]);
  const [notices, preference] = await Promise.all([
    client
      .from("in_app_notifications")
      .select("id,kind,target_path,created_at,read_at")
      .eq("tenant_id", tenant)
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * 20, page * 20),
    client
      .from("notification_preferences")
      .select("in_app_enabled")
      .eq("tenant_id", tenant)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (notices.error || preference.error)
    databaseFailure(notices.error?.code ?? preference.error?.code);
  return {
    clinic,
    userId: user.id,
    notices: ((notices.data ?? []) as Pick<
      NoticeRow,
      "id" | "kind" | "target_path" | "created_at" | "read_at"
    >[]).slice(0, 20),
    page,
    hasNext: (notices.data?.length ?? 0) > 20,
    inAppEnabled: preference.data?.in_app_enabled ?? true,
  };
}

// The count intentionally reads no notice content. RLS still limits the
// recipient, tenant, live session and current membership before it reaches the
// header.
export async function unreadInAppNotificationCount(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]);
  const { count, error } = await client
    .from("in_app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant)
    .eq("recipient_user_id", user.id)
    .is("read_at", null);
  if (error) databaseFailure(error.code);
  return count ?? 0;
}

export async function markInAppNotificationRead(
  id: string,
  noticeId: string,
) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]);
  const { data, error } = await client.rpc("mark_in_app_notification_read", {
    target_tenant: tenant,
    target_notification: notificationId(noticeId),
  });
  if (error) databaseFailure(error.code);
  if (typeof data !== "string")
    throw new Error("Notification read operation returned an invalid response");
  return { readAt: data };
}

export async function setInAppNotificationPreference(id: string, input: unknown) {
  const tenant = tenantId(id);
  const preference = notificationPreferenceInput(input);
  const { client } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]);
  const { data, error } = await client.rpc("set_in_app_notification_preference", {
    target_tenant: tenant,
    enabled: preference.inAppEnabled,
  });
  if (error) databaseFailure(error.code);
  if (typeof data !== "boolean")
    throw new Error("Notification preference returned an invalid response");
  return { inAppEnabled: data };
}

export type InAppNotifications = Awaited<ReturnType<typeof inAppNotifications>>;
