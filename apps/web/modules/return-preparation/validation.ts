import { InputError, tenantId } from "../../lib/validation.ts";
import { preparationQuestions, preparationTopics } from "./questionnaire.ts";

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados inválidos.");
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new InputError("Solicitação inválida.");
}

function integer(value: unknown, label: string, minimum: number) {
  if (!Number.isInteger(value) || Number(value) < minimum)
    throw new InputError(`${label} inválida. Atualize a página.`);
  return Number(value);
}

function answers(value: unknown) {
  const source = object(value);
  const result: Record<string, string> = {};
  if (Object.keys(source).length > 12)
    throw new InputError("Há respostas demais neste roteiro.");
  for (const [key, answer] of Object.entries(source)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/u.test(key) || typeof answer !== "string")
      throw new InputError("Resposta inválida.");
    const normalized = answer.trim();
    // Blank fields are omitted: skipping a question never creates an answer.
    if (!normalized) continue;
    if (
      normalized.length > 4000 ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(normalized)
    )
      throw new InputError("Use até 4.000 caracteres em cada resposta.");
    result[key] = normalized;
  }
  return result;
}

export function requestPreparationInput(value: unknown) {
  const body = object(value);
  exactKeys(body, ["appointment_id", "request_key", "questions"]);
  return {
    appointmentId: tenantId(String(body.appointment_id)),
    requestKey: tenantId(String(body.request_key)),
    ...(body.questions === undefined ? {} : { questions: questionInput(body.questions) }),
  };
}

export function questionInput(value: unknown) {
  if (!Array.isArray(value) || value.length !== 5)
    throw new InputError("O roteiro deve conter cinco perguntas.");
  const seen = new Set<string>();
  return value.map((item) => {
    const question = object(item);
    exactKeys(question, ["id", "label"]);
    if (typeof question.id !== "string" || seen.has(question.id) ||
      !preparationQuestions.some((known) => known.id === question.id) ||
      typeof question.label !== "string") throw new InputError("Pergunta inválida.");
    seen.add(question.id);
    const label = question.label.trim();
    if (!label || label.length > 600 || /[\x00-\x1f\x7f]/u.test(label))
      throw new InputError("Use de 1 a 600 caracteres, em uma linha, por pergunta.");
    return { id: question.id, label };
  });
}

export function priorityInput(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 3 || new Set(value).size !== value.length ||
    value.some((id) => !preparationTopics.some((topic) => topic.id === id)))
    throw new InputError("Escolha até três assuntos diferentes, em ordem de prioridade.");
  return value as string[];
}

export function savePreparationInput(value: unknown) {
  const body = object(value);
  exactKeys(body, ["version", "answers", "priorities"]);
  return {
    version: integer(body.version, "Versão do rascunho", 0),
    answers: answers(body.answers),
    ...(body.priorities === undefined ? {} : { priorities: priorityInput(body.priorities) }),
  };
}

export function submitPreparationInput(value: unknown) {
  const body = object(value);
  exactKeys(body, ["version", "answers", "confirmed", "priorities"]);
  if (body.confirmed !== true)
    throw new InputError("Confirme o envio das respostas.");
  return {
    version: integer(body.version, "Versão do rascunho", 0),
    answers: answers(body.answers),
    ...(body.priorities === undefined ? {} : { priorities: priorityInput(body.priorities) }),
  };
}

export function reviewPreparationInput(value: unknown) {
  const body = object(value);
  exactKeys(body, ["version", "note", "confirmed"]);
  if (body.confirmed !== true)
    throw new InputError("Confirme a revisão interna.");
  if (typeof body.note !== "string")
    throw new InputError("Registre uma nota de revisão.");
  const note = body.note.trim();
  if (
    note.length < 1 ||
    note.length > 2000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(note)
  )
    throw new InputError("Use entre 1 e 2.000 caracteres na nota de revisão.");
  return { version: integer(body.version, "Versão da solicitação", 1), note };
}
