import { InputError, tenantId } from "../../lib/validation.ts";
function body(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Solicitação inválida.");
  const b = value as Record<string, unknown>;
  if (b.confirmed !== true || Object.keys(b).some((k) => !keys.includes(k)))
    throw new InputError("Confirme explicitamente esta ação.");
  return b;
}
export function publicationInput(value: unknown) {
  const b = body(value, ["version", "previous_publication", "confirmed"]);
  if (
    !Number.isSafeInteger(b.version) ||
    Number(b.version) < 1 ||
    (b.previous_publication !== null &&
      typeof b.previous_publication !== "string")
  )
    throw new InputError("Atualize o plano antes de publicar.");
  return {
    version: b.version as number,
    previousPublication:
      b.previous_publication === null
        ? null
        : tenantId(b.previous_publication as string),
  };
}
export function withdrawalInput(value: unknown) {
  const b = body(value, ["publication_id", "reason", "confirmed"]);
  if (
    typeof b.publication_id !== "string" ||
    typeof b.reason !== "string" ||
    !b.reason.trim() ||
    b.reason.length > 1000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(b.reason)
  )
    throw new InputError(
      "Informe o motivo da retirada, com até 1000 caracteres.",
    );
  return { publicationId: tenantId(b.publication_id), reason: b.reason.trim() };
}
export function receiptInput(value: unknown) {
  body(value, ["confirmed"]);
  return true;
}
