import { InputError, tenantId } from "../../lib/validation.ts";
import { validateConsultationSummary } from "./generation.ts";
import {
  CONSULTATION_CONSENT_VERSION,
  type ConsultationWorkflowAction,
} from "./types.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados da consulta inválidos.");
  return value as Record<string, unknown>;
}

function exact(body: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(body).some((key) => !keys.includes(key)))
    throw new InputError("Campos não permitidos na consulta.");
}

function uuid(value: unknown, message: string) {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))
    throw new InputError(message);
  return tenantId(value);
}

function timestamp(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new InputError("Horário do trecho inválido.");
  return value;
}

export function consultationWorkflowAction(value: unknown): ConsultationWorkflowAction {
  const body = record(value);
  exact(body, ["action", "payload"]);
  const payload = record(body.payload ?? {});
  if (body.action === "consent_decide") {
    exact(payload, ["decisionId", "consentVersion", "decision"]);
    if (payload.consentVersion !== CONSULTATION_CONSENT_VERSION
      || !["granted", "refused", "withdrawn"].includes(String(payload.decision)))
      throw new InputError("Decisão de consentimento inválida.");
    return { action: body.action, payload: {
      decisionId: uuid(payload.decisionId, "Identificador da decisão inválido."),
      consentVersion: CONSULTATION_CONSENT_VERSION,
      decision: payload.decision as "granted" | "refused" | "withdrawn",
    } };
  }
  if (body.action === "begin") {
    exact(payload, ["captureId"]);
    return { action: body.action, payload: { captureId: uuid(payload.captureId, "Identificador da captura inválido.") } };
  }
  if (body.action === "append_chunk") {
    exact(payload, ["captureId", "chunkIndex", "clientChunkId", "text", "capturedAt", "startSeconds", "endSeconds", "speaker"]);
    if (!Number.isSafeInteger(payload.chunkIndex) || Number(payload.chunkIndex) < 0 || Number(payload.chunkIndex) >= 360
      || typeof payload.text !== "string" || !payload.text.trim() || Array.from(payload.text).length > 2000
      || /\u0000/u.test(payload.text) || payload.speaker !== "unknown"
      || typeof payload.startSeconds !== "number" || !Number.isFinite(payload.startSeconds) || payload.startSeconds < 0
      || typeof payload.endSeconds !== "number" || !Number.isFinite(payload.endSeconds)
      || payload.endSeconds < payload.startSeconds || payload.endSeconds > 14400)
      throw new InputError("Trecho da captura inválido.");
    return { action: body.action, payload: {
      captureId: uuid(payload.captureId, "Identificador da captura inválido."),
      chunkIndex: payload.chunkIndex as number,
      clientChunkId: uuid(payload.clientChunkId, "Identificador do trecho inválido."),
      text: payload.text,
      capturedAt: timestamp(payload.capturedAt),
      startSeconds: payload.startSeconds,
      endSeconds: payload.endSeconds,
      speaker: "unknown",
    } };
  }
  if (body.action === "pause" || body.action === "end") {
    exact(payload, ["captureId"]);
    return { action: body.action, payload: { captureId: uuid(payload.captureId, "Identificador da captura inválido.") } };
  }
  if (body.action === "process_summary") {
    exact(payload, []);
    return { action: body.action, payload: {} };
  }
  if (body.action === "review_summary") {
    exact(payload, ["summaryId", "expectedVersion", "decision", "note", "correctedSummary"]);
    if (!Number.isSafeInteger(payload.expectedVersion) || Number(payload.expectedVersion) < 1
      || !["accepted", "rejected"].includes(String(payload.decision))
      || typeof payload.note !== "string" || !payload.note.trim() || payload.note.length > 2000)
      throw new InputError("Informe a decisão e a nota da revisão.");
    if (payload.correctedSummary !== undefined) {
      if (payload.decision !== "accepted") throw new InputError("Uma correção precisa ser aceita pelo médico.");
      // Evidence is validated again against the immutable source by the service.
      if (!payload.correctedSummary || typeof payload.correctedSummary !== "object")
        throw new InputError("Resumo corrigido inválido.");
    }
    return { action: body.action, payload: {
      summaryId: uuid(payload.summaryId, "Identificador do resumo inválido."),
      expectedVersion: payload.expectedVersion as number,
      decision: payload.decision as "accepted" | "rejected",
      note: payload.note.trim(),
      ...(payload.correctedSummary === undefined ? {} : { correctedSummary: payload.correctedSummary as never }),
    } };
  }
  throw new InputError("Ação da consulta inválida.");
}

export function validatedCorrectedSummary(summary: unknown, source: unknown) {
  const result = validateConsultationSummary(
    (summary as { categories?: unknown })?.categories,
    source as Parameters<typeof validateConsultationSummary>[1],
  );
  const value = summary as { contractVersion?: unknown; mode?: unknown; incomplete?: unknown; limitations?: unknown };
  if (value?.contractVersion !== "consultation-summary-v1" || !["model_generated", "extractive"].includes(String(value.mode))
    || typeof value.incomplete !== "boolean" || !Array.isArray(value.limitations)
    || value.limitations.some((item) => typeof item !== "string") || !result.validation.valid)
    throw new InputError("A correção precisa preservar trechos válidos da fonte.");
  return { ...value, categories: result.categories };
}
