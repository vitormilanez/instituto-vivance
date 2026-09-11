import { InputError, pageNumber, tenantId } from "../../lib/validation.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados da mensagem inválidos.");
  return value as Record<string, unknown>;
}

function messageText(value: unknown): string {
  if (typeof value !== "string")
    throw new InputError("Escreva uma mensagem antes de enviar.");
  const result = value.trim().replace(/\s+/gu, " ");
  if (
    result.length < 1 ||
    result.length > 4000 ||
    /[\x00-\x1f\x7f]/u.test(result)
  )
    throw new InputError("Use uma mensagem de até 4.000 caracteres.");
  return result;
}

export function messageInput(value: unknown) {
  const body = record(value);
  if (
    Object.keys(body).some(
      (key) => !["patient_id", "doctor_id", "content"].includes(key),
    ) ||
    typeof body.patient_id !== "string" ||
    typeof body.doctor_id !== "string"
  )
    throw new InputError("Confira a conversa antes de enviar.");
  return {
    patientId: tenantId(body.patient_id),
    doctorId: tenantId(body.doctor_id),
    content: messageText(body.content),
  };
}

export function messagePage(value?: string): number {
  return pageNumber(value);
}

export function messageRecipient(
  value: string | string[] | undefined,
  allowed: readonly string[],
): string | null {
  if (!allowed.length) return null;
  if (value === undefined) return allowed[0];
  if (typeof value !== "string") throw new InputError("Conversa inválida.");
  const recipient = tenantId(value);
  if (!allowed.includes(recipient))
    throw new InputError("Esta conversa não está disponível.");
  return recipient;
}
