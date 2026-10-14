import { InputError } from "../../lib/validation.ts";
import type { BrowserTranscriptSave } from "./types.ts";
export const MAX_TRANSCRIPT_CHARACTERS = 100000;
export const MAX_TRANSCRIPT_SEGMENTS = 1000;
export const MAX_CAPTURE_MILLISECONDS = 4 * 60 * 60 * 1000;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Dados de transcrição inválidos.");
  return value as Record<string, unknown>;
}
function timestamp(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new InputError("Horário de captura inválido.");
  return Date.parse(value);
}
export function browserTranscriptInput(value: unknown, now = Date.now()): BrowserTranscriptSave {
  const body = record(value);
  const allowed = ["idempotencyKey", "source", "captureMode", "startedAt", "endedAt", "patientPermissionConfirmed", "permissionNote", "segments"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new InputError("Campos de transcrição não permitidos.");
  if (typeof body.idempotencyKey !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.idempotencyKey)) throw new InputError("Identificador de captura inválido.");
  if (body.source !== "browser_speech_recognition" || !["microphone", "tab_and_microphone"].includes(body.captureMode as string)) throw new InputError("Origem da captura inválida.");
  if (body.patientPermissionConfirmed !== true || typeof body.permissionNote !== "string" || body.permissionNote.trim().length < 5 || body.permissionNote.length > 500) throw new InputError("Confirme a permissão do paciente e registre quando e como ela foi obtida.");
  const start = timestamp(body.startedAt), end = timestamp(body.endedAt);
  if (end < start || end - start > MAX_CAPTURE_MILLISECONDS || end > now + 300000) throw new InputError("Confira os horários da captura, limitada a quatro horas.");
  if (!Array.isArray(body.segments) || body.segments.length < 1 || body.segments.length > MAX_TRANSCRIPT_SEGMENTS) throw new InputError("A captura deve ter entre 1 e 1000 trechos.");
  let characters = 0, previous = start;
  for (const value of body.segments) {
    const segment = record(value), captured = timestamp(segment.capturedAt);
    if (Object.keys(segment).some((key) => !["text", "capturedAt", "speaker"].includes(key)) || segment.speaker !== "unknown" || typeof segment.text !== "string" || !segment.text.trim() || /\u0000/u.test(segment.text) || captured < previous || captured > end) throw new InputError("Trecho ou sequência de captura inválidos.");
    previous = captured;
    characters += Array.from(segment.text).length;
  }
  if (characters + body.segments.length - 1 > MAX_TRANSCRIPT_CHARACTERS) throw new InputError("A captura excede 100 mil caracteres.");
  return { ...body, permissionNote: body.permissionNote.trim() } as BrowserTranscriptSave;
}
export function browserTranscriptReviewInput(value: unknown) {
  const body = record(value);
  if (Object.keys(body).some((key) => !["decision", "note"].includes(key)) || !["reviewed", "rejected"].includes(body.decision as string) || typeof body.note !== "string" || !body.note.trim() || body.note.length > 2000) throw new InputError("Informe a conferência ou rejeição e uma nota de revisão.");
  return { decision: body.decision as "reviewed" | "rejected", note: body.note.trim() };
}
