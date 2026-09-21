import { InputError } from "../../lib/validation.ts";
import type { InvitationChannel, OnboardingStep } from "./types";

const steps = ["profile", "measurements", "questions", "exams", "review"] as const;

function object(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError(message);
  return value as Record<string, unknown>;
}

function exact(body: Record<string, unknown>, allowed: string[], message: string) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new InputError(message);
}

function name(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (normalized.length < 2 || normalized.length > 160 || /[\x00-\x1f\x7f]/u.test(normalized))
    throw new InputError("Informe um nome entre 2 e 160 caracteres.");
  return normalized;
}

function email(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized.length < 3 || normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized))
    throw new InputError("Informe um email válido.");
  return normalized;
}

function uuid(value: unknown, message: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
    throw new InputError(message);
  return value;
}

function date(value: unknown, message: string) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || (!Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) || value < "1900-01-01" || value > new Date().toISOString().slice(0, 10))
    throw new InputError(message);
  return value;
}

function optionalNumber(value: unknown, max: number, message: string) {
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > max)
    throw new InputError(message);
  return value;
}

export function patientInvitationInput(value: unknown) {
  const body = object(value, "Convite inválido.");
  exact(body, ["displayName", "channel", "email", "phone", "doctorId", "targetPatientId"], "O convite contém campos não permitidos.");
  if (body.channel !== "email" && body.channel !== "whatsapp")
    throw new InputError("Escolha email ou WhatsApp.");
  const channel = body.channel as InvitationChannel;
  const doctorId = body.doctorId === undefined ? undefined : uuid(body.doctorId, "Médico inválido.");
  const targetPatientId = body.targetPatientId === undefined
    ? undefined
    : uuid(body.targetPatientId, "Paciente inválido.");
  if (channel === "email") {
    if (body.phone !== undefined) throw new InputError("Não envie telefone em um convite por email.");
    return { displayName: name(body.displayName), channel, email: email(body.email), doctorId, targetPatientId };
  }
  if (body.email !== undefined) throw new InputError("O email será informado pelo paciente ao aceitar.");
  const phone = typeof body.phone === "string" ? body.phone.replace(/[^\d+]/gu, "") : "";
  if (!/^\+[1-9]\d{7,14}$/u.test(phone)) throw new InputError("Informe o telefone com código do país.");
  return { displayName: name(body.displayName), channel, phone, doctorId, targetPatientId };
}

export function claimInvitationInput(value: unknown) {
  const body = object(value, "Convite inválido.");
  exact(body, ["token", "email"], "O convite contém campos não permitidos.");
  if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(body.token))
    throw new InputError("Convite inválido.");
  return { token: body.token, email: email(body.email) };
}

export function acceptInvitationInput(value: unknown) {
  const body = object(value, "Aceite inválido.");
  exact(body, ["invitationId", "accept"], "O aceite contém campos não permitidos.");
  if (body.accept !== true) throw new InputError("Confirme explicitamente o aceite.");
  return { invitationId: uuid(body.invitationId, "Convite inválido."), accept: true as const };
}

export function onboardingPatchInput(value: unknown) {
  const body = object(value, "Dados do onboarding inválidos.");
  exact(body, ["version", "currentStep", "skippedSteps", "examDocumentIds", "profile", "measurements", "answers", "shareConsent"], "O onboarding contém campos não permitidos.");
  if (!Number.isInteger(body.version) || (body.version as number) < 1)
    throw new InputError("Versão do onboarding inválida.");
  const result: Record<string, unknown> = { expected_version: body.version };
  if (body.currentStep !== undefined) {
    if (!steps.includes(body.currentStep as OnboardingStep)) throw new InputError("Etapa inválida.");
    result.current_step = body.currentStep;
  }
  if (body.skippedSteps !== undefined) {
    if (!Array.isArray(body.skippedSteps) || body.skippedSteps.some((step) => !steps.includes(step as OnboardingStep)))
      throw new InputError("Etapas ignoradas inválidas.");
    result.skipped_steps = [...new Set(body.skippedSteps)];
  }
  if (body.examDocumentIds !== undefined) {
    if (!Array.isArray(body.examDocumentIds) || body.examDocumentIds.length > 50)
      throw new InputError("Envie no máximo 50 exames.");
    result.exam_document_ids = [...new Set(body.examDocumentIds.map((id) => uuid(id, "Documento de exame inválido.")))];
  }
  if (body.profile !== undefined) {
    const profile = object(body.profile, "Perfil inválido.");
    exact(profile, ["photoDocumentId", "birthDate"], "O perfil contém campos não permitidos.");
    if ("photoDocumentId" in profile) result.photo_document_id = profile.photoDocumentId === null ? null : uuid(profile.photoDocumentId, "Documento de foto inválido.");
    if ("birthDate" in profile) result.birth_date = date(profile.birthDate, "Data de nascimento inválida.");
  }
  if (body.measurements !== undefined) {
    const measures = object(body.measurements, "Medidas inválidas.");
    exact(measures, ["weightKg", "heightCm", "waistCm", "measuredOn"], "As medidas contêm campos não permitidos.");
    if ("weightKg" in measures) result.weight_kg = optionalNumber(measures.weightKg, 500, "Peso inválido.");
    if ("heightCm" in measures) result.height_cm = optionalNumber(measures.heightCm, 300, "Altura inválida.");
    if ("waistCm" in measures) result.waist_cm = optionalNumber(measures.waistCm, 400, "Circunferência inválida.");
    if ("measuredOn" in measures) result.measured_on = date(measures.measuredOn, "Data das medidas inválida.");
  }
  if (body.answers !== undefined) {
    const answers = object(body.answers, "Respostas inválidas.");
    exact(answers, ["goal", "history", "routine", "treatments", "questions"], "As respostas contêm campos não permitidos.");
    for (const [camel, column] of [["goal", "answer_goal"], ["history", "answer_history"], ["routine", "answer_routine"], ["treatments", "answer_treatments"], ["questions", "answer_questions"]] as const) {
      if (camel in answers) {
        if (typeof answers[camel] !== "string" || answers[camel].length > 4000 || /\x00/u.test(answers[camel]))
          throw new InputError("Use até 4.000 caracteres por resposta.");
        result[column] = answers[camel];
      }
    }
  }
  if (body.shareConsent !== undefined) {
    if (typeof body.shareConsent !== "boolean") throw new InputError("Consentimento inválido.");
    result.share_consent = body.shareConsent;
  }
  if (Object.keys(result).length === 1) throw new InputError("Informe ao menos uma alteração.");
  return result;
}

export function onboardingSubmissionInput(value: unknown) {
  const body = object(value, "Envio inválido.");
  exact(body, ["version", "shareConsent"], "O envio contém campos não permitidos.");
  if (!Number.isInteger(body.version) || (body.version as number) < 1 || body.shareConsent !== true)
    throw new InputError("Confirme o compartilhamento usando a versão atual.");
  return { version: body.version as number, shareConsent: true as const };
}
