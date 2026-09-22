import { InputError } from "../../lib/validation.ts";

// Os quatro tipos que só o paciente fornece. "Última consulta" e "Plano de
// cuidado" são registros da clínica: não se pede a um paciente que os preencha.
export const careRequestKinds = [
  "preparation",
  "exams",
  "measurements",
  "goals",
] as const;

export type CareRequestKind = (typeof careRequestKinds)[number];

export const careRequestMaxNote = 500;
export const careRequestMaxBodyBytes = 2_000;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Solicitação inválida.");
  return value as Record<string, unknown>;
}

function exact(
  body: Record<string, unknown>,
  allowed: string[],
  message: string,
) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new InputError(message);
}

function uuid(value: unknown, message: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)
  )
    throw new InputError(message);
  return value;
}

// O bilhete é opcional e curto: ele soma à frase do tipo, nunca a substitui.
export function careRequestInput(value: unknown) {
  const body = record(value);
  exact(body, ["kind", "note", "request_key", "replace_pending"], "A solicitação contém campos não permitidos.");
  if (!careRequestKinds.includes(body.kind as CareRequestKind))
    throw new InputError("Tipo de solicitação inválido.");
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > careRequestMaxNote))
    throw new InputError(`Use até ${careRequestMaxNote} caracteres no bilhete.`);
  if (body.replace_pending !== undefined && typeof body.replace_pending !== "boolean")
    throw new InputError("Reenvio inválido.");
  return {
    kind: body.kind as CareRequestKind,
    // Espaços redundantes são normalizados no banco; aqui só se recusa o vazio.
    note: typeof body.note === "string" ? body.note.trim() : "",
    requestKey: uuid(body.request_key, "Chave da solicitação inválida."),
    replacePending: body.replace_pending === true,
  };
}

// As frases que a equipe lê ficam no modelo do card
// (modules/workspace/patient-context-cards), junto do resto do texto da tela.
