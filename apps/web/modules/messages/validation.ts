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
  const hasLegacyReference = body.reference_type !== undefined || body.reference_id !== undefined;
  const legacyReference = body.reference_type === null && body.reference_id === null
    ? []
    : [
        { type: body.reference_type, id: body.reference_id },
      ];
  const references = Array.isArray(body.references)
    ? body.references
    : body.references === undefined && hasLegacyReference
      ? legacyReference
      : body.references === undefined
        ? []
        : null;
  if (
    Object.keys(body).some(
      (key) =>
        ![
          "patient_id",
          "doctor_id",
          "content",
          "references",
          "reference_type",
          "reference_id",
        ].includes(key),
    ) ||
    typeof body.patient_id !== "string" ||
    typeof body.doctor_id !== "string" ||
    references === null ||
    (body.references !== undefined && hasLegacyReference) ||
    (hasLegacyReference && !(
      (body.reference_type === null && body.reference_id === null) ||
      (["document", "care_plan"].includes(String(body.reference_type)) && typeof body.reference_id === "string")
    )) ||
    (references?.length ?? 0) > 10
  )
    throw new InputError("Confira a conversa antes de enviar.");
  const parsedReferences = (references ?? []).map((value) => {
    const reference = record(value);
    if (
      Object.keys(reference).some((key) => !["type", "id"].includes(key)) ||
      !["document", "care_plan"].includes(String(reference.type)) ||
      typeof reference.id !== "string"
    )
      throw new InputError("Confira as referências antes de enviar.");
    return {
      type: reference.type as "document" | "care_plan",
      id: tenantId(reference.id),
    };
  });
  if (
    new Set(parsedReferences.map((reference) => `${reference.type}:${reference.id}`))
      .size !== parsedReferences.length
  )
    throw new InputError("Não repita a mesma referência na mensagem.");
  return {
    patientId: tenantId(body.patient_id),
    doctorId: tenantId(body.doctor_id),
    content: messageText(body.content),
    references: parsedReferences,
  };
}

export function messageRequestKey(value: string | null) {
  if (!value) throw new InputError("Identificador de envio ausente.");
  return tenantId(value);
}

export function messageReadInput(value: unknown) {
  const body = record(value);
  if (
    Object.keys(body).some(
      (key) => !["patient_id", "doctor_id", "message_id"].includes(key),
    ) ||
    typeof body.patient_id !== "string" ||
    typeof body.doctor_id !== "string" ||
    typeof body.message_id !== "string"
  )
    throw new InputError("Confira a conversa antes de marcar a leitura.");
  return {
    patientId: tenantId(body.patient_id),
    doctorId: tenantId(body.doctor_id),
    messageId: tenantId(body.message_id),
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
