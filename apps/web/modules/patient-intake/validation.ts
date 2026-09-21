import { InputError } from "../../lib/validation.ts";

export const patientIntakeMaxBodyBytes = 32768;

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Acolhimento inválido.");
  return value as Record<string, unknown>;
}

function answer(value: unknown, label: string, required: boolean) {
  if (typeof value !== "string")
    throw new InputError(`Informe ${label}.`);
  const normalized = value.trim().replace(/\r\n?/gu, "\n");
  if (normalized.length > 2000 || (required && !normalized))
    throw new InputError(
      required
        ? `Use entre 1 e 2.000 caracteres em ${label}.`
        : `Use até 2.000 caracteres em ${label}.`,
    );
  return normalized;
}

export function patientIntakeInput(value: unknown) {
  const body = object(value);
  const allowed = [
    "version",
    "reason",
    "expectedOutcome",
    "firstPriority",
    "confirmPatientWords",
    "intent",
  ];
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new InputError("O acolhimento contém campos não permitidos.");
  if (!Number.isInteger(body.version) || Number(body.version) < 1)
    throw new InputError("A versão do acolhimento é inválida.");
  if (body.intent !== "draft" && body.intent !== "complete")
    throw new InputError("Escolha salvar o rascunho ou concluir o acolhimento.");
  const complete = body.intent === "complete";
  if (complete && body.confirmPatientWords !== true)
    throw new InputError("Confirme que o registro representa as palavras do paciente.");
  return {
    expected_version: Number(body.version),
    status: complete ? ("completed" as const) : ("draft" as const),
    reason_text: answer(body.reason, "o motivo da procura", complete),
    expected_outcome: answer(body.expectedOutcome, "o resultado esperado", complete),
    first_priority: answer(body.firstPriority, "o assunto prioritário", complete),
  };
}
