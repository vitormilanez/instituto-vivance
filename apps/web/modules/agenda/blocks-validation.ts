import { InputError, tenantId } from "../../lib/validation.ts";

function instant(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new InputError("Data ou horário inválido.");
  return value;
}

export function agendaBlockInput(value: unknown, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Bloqueio de horário inválido.");
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (key) => !["doctor_id", "starts_at", "ends_at"].includes(key),
    )
  )
    throw new InputError("Campos não permitidos no bloqueio de horário.");
  if (typeof body.doctor_id !== "string")
    throw new InputError("Selecione o médico.");
  const doctor_id = tenantId(body.doctor_id);
  const starts_at = instant(body.starts_at);
  const ends_at = instant(body.ends_at);
  const start = Date.parse(starts_at), end = Date.parse(ends_at);
  if (start <= now) throw new InputError("Escolha um horário futuro.");
  if (end - start < 300_000 || end - start > 28_800_000)
    throw new InputError("A duração deve ser de 5 minutos a 8 horas.");
  return { doctor_id, starts_at, ends_at };
}

export function agendaBlockPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Alteração inválida.");
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some((key) => !["version", "status"].includes(key)) ||
    body.status !== "cancelled" ||
    !Number.isSafeInteger(body.version) ||
    (body.version as number) < 1
  )
    throw new InputError("Recarregue o bloqueio antes de liberar o horário.");
  return { version: body.version as number, status: "cancelled" as const };
}
