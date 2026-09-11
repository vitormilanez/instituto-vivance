import { InputError, tenantId } from "../../lib/validation.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Preferência de avisos inválida.");
  return value as Record<string, unknown>;
}

export function notificationPreferenceInput(value: unknown) {
  const body = record(value);
  if (
    Object.keys(body).some((key) => key !== "in_app_enabled") ||
    typeof body.in_app_enabled !== "boolean"
  )
    throw new InputError("Confira a preferência de avisos.");
  return { inAppEnabled: body.in_app_enabled };
}

export function notificationId(value: string) {
  return tenantId(value);
}
