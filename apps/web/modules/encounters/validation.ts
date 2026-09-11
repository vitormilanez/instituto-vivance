import { InputError, tenantId } from "../../lib/validation.ts";
function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados inválidos.");
  return value as Record<string, unknown>;
}
export function encounterStart(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some(
      (k) => !["appointment_id", "accept_care"].includes(k),
    ) ||
    body.accept_care !== true ||
    typeof body.appointment_id !== "string"
  )
    throw new InputError("Confirme sua responsabilidade pelo atendimento.");
  return { appointment_id: tenantId(body.appointment_id), accept_care: true };
}
export function encounterPatch(value: unknown) {
  const b = object(value);
  if (
    Object.keys(b).some(
      (k) => !["reason", "evolution", "status", "version"].includes(k),
    ) ||
    !Number.isSafeInteger(b.version) ||
    Number(b.version) < 1 ||
    !["draft", "finalized"].includes(String(b.status))
  )
    throw new InputError("Registro inválido. Atualize o atendimento.");
  for (const [key, max] of [
    ["reason", 2000],
    ["evolution", 10000],
  ] as const) {
    if (
      typeof b[key] !== "string" ||
      (b[key] as string).length > max ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(b[key] as string)
    )
      throw new InputError(`Revise o texto: limite de ${max} caracteres.`);
  }
  const reason = (b.reason as string).trim(),
    evolution = (b.evolution as string).trim();
  if (b.status === "finalized" && (!reason || !evolution))
    throw new InputError("Preencha o motivo e a evolução antes de finalizar.");
  return {
    version: b.version as number,
    values: { reason, evolution, status: b.status as "draft" | "finalized" },
  };
}
