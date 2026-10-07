import type { PatientCareContext } from "../workspace/today.ts";
import { preparationQuestions } from "../return-preparation/questionnaire.ts";

export type ConsultationBriefSource = {
  type: string;
  id: string;
  date: string;
  href: string;
  label: string;
};

export type ConsultationBriefTopic = {
  kind: "patient" | "pending" | "documents";
  text: string;
  sources: ConsultationBriefSource[];
};

export type ConsultationBrief = {
  mode: "deterministic" | "ai";
  topics: ConsultationBriefTopic[];
  retry: boolean;
};

export type ConsultationBriefInput = {
  tenantId: string;
  patientId: string;
  appointment: { id: string; starts_at: string };
  context: PatientCareContext;
  documentReview: {
    pending: boolean;
    total: number;
    documentIds?: string[];
  } | null;
};

export type ConsultationBriefFact = ConsultationBriefTopic & { key: string };

const requestLabels: Record<string, string> = {
  preparation: "A pré-consulta solicitada ainda aguarda resposta.",
  exams: "Os exames solicitados ainda aguardam envio.",
  measurements: "As medidas solicitadas ainda aguardam envio.",
  goals: "As metas solicitadas ainda aguardam resposta.",
};

const onboardingLabels: Record<string, string> = {
  goal: "Objetivo no cadastro inicial",
  history: "Histórico no cadastro inicial",
  routine: "Rotina no cadastro inicial",
  treatments: "Tratamentos no cadastro inicial",
  questions: "Perguntas no cadastro inicial",
};

const preparationLabels: Record<string, string> = {
  goal: "Assunto principal",
  changes: "Mudanças recentes",
  routine: "Rotina",
  treatment: "Tratamento relatado",
  questions: "Dúvidas",
};

const cleanLiteral = (value: string) =>
  value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();

const safeSegment = (value: string) => encodeURIComponent(value);
const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

function homeHref(input: ConsultationBriefInput) {
  return `/clinicas/${safeSegment(input.tenantId)}?consulta=${safeSegment(input.appointment.id)}#consulta-${safeSegment(input.appointment.id)}`;
}

function preparationHref(input: ConsultationBriefInput, id: string) {
  const base = `/clinicas/${safeSegment(input.tenantId)}`;
  const request = safeSegment(id);
  return `${base}/preparo?solicitacao=${request}#preparo-${request}`;
}

function recordHref(input: ConsultationBriefInput, tab?: string) {
  const base = `/clinicas/${safeSegment(input.tenantId)}/pacientes/${safeSegment(input.patientId)}`;
  return tab ? `${base}?aba=${encodeURIComponent(tab)}` : base;
}

function preparationFacts(input: ConsultationBriefInput): ConsultationBriefFact[] {
  const current = input.context.preparation;
  const historical = input.context.preparationHistory[0];
  const record = current?.answers
    ? { id: current.id, date: current.submitted_at, answers: current.answers }
    : historical
      ? { id: historical.id, date: historical.submitted_at, answers: historical.answers }
      : null;
  if (!record?.date) return [];
  const sourceDate = record.date;
  return preparationQuestions.flatMap(({ id, label }) => {
    const text = cleanLiteral(record.answers[id] ?? "");
    return text
      ? [{
          key: `preparation:${record.id}:${id}`,
          kind: "patient" as const,
          text,
          sources: [{
            type: "return_preparation_request",
            id: record.id,
            date: sourceDate,
            href: preparationHref(input, record.id),
            label: `Pré-consulta ${shortDate(sourceDate)} · ${preparationLabels[id] ?? label}`,
          }],
        }]
      : [];
  });
}

function onboardingFacts(input: ConsultationBriefInput): ConsultationBriefFact[] {
  const onboarding = input.context.onboarding;
  if (!onboarding?.id) return [];
  return Object.entries(onboardingLabels).flatMap(([id, label]) => {
    const text = cleanLiteral(onboarding.answers[id] ?? "");
    return text
      ? [{
          key: `onboarding:${onboarding.id}:${id}`,
          kind: "patient" as const,
          text,
          sources: [{
            type: "patient_onboarding_submission",
            id: onboarding.id!,
            date: onboarding.submittedAt,
            href: recordHref(input, "Visão geral"),
            label: `${label} · ${shortDate(onboarding.submittedAt)}`,
          }],
        }]
      : [];
  });
}

function gapFacts(input: ConsultationBriefInput): ConsultationBriefFact[] {
  const facts = input.context.requests.flatMap((request) => {
    const text = requestLabels[request.kind];
    return text
      ? [{
          key: `request:${request.id}`,
          kind: "pending" as const,
          text,
          sources: [{
            type: "patient_care_request",
            id: request.id,
            date: request.requested_at,
            href: homeHref(input),
            label: "Solicitação ao paciente",
          }],
        }]
      : [];
  });
  const preparation = input.context.preparation;
  if (
    preparation?.requested_at &&
    (preparation.status === "requested" || preparation.status === "draft") &&
    !facts.some((fact) => fact.text === requestLabels.preparation)
  ) {
    facts.unshift({
      key: `preparation-gap:${preparation.id}`,
      kind: "pending",
      text: requestLabels.preparation,
      sources: [{
        type: "return_preparation_request",
        id: preparation.id,
        date: preparation.requested_at,
        href: preparationHref(input, preparation.id),
        label: "Pré-consulta solicitada",
      }],
    });
  }
  return facts;
}

function documentFact(input: ConsultationBriefInput): ConsultationBriefFact[] {
  const pendingIds = new Set(input.documentReview?.documentIds ?? []);
  if (!input.documentReview?.pending || !pendingIds.size) return [];
  const sources = input.context.documentItems
    .filter((document) => pendingIds.has(document.id))
    .map((document) => ({
    type: "patient_document",
    id: document.id,
    date: document.created_at,
    href: `${recordHref(input, "Documentos")}#documento-${safeSegment(document.id)}`,
    label: document.title,
    }));
  if (!sources.length) return [];
  const total = input.documentReview.total;
  return [{
    key: `documents:${sources.map((source) => source.id).join(",")}`,
    kind: "documents",
    text: total === 1
      ? "Há 1 documento aguardando revisão médica."
      : `Há ${total} documentos aguardando revisão médica.`,
    sources,
  }];
}

export function consultationBriefFacts(input: ConsultationBriefInput) {
  const patientFacts = preparationFacts(input);
  if (!patientFacts.length) patientFacts.push(...onboardingFacts(input));
  return [
    ...patientFacts.slice(0, 3),
    ...gapFacts(input).slice(0, 2),
    ...documentFact(input),
  ];
}

export function deterministicConsultationBrief(
  input: ConsultationBriefInput,
): ConsultationBrief {
  return {
    mode: "deterministic",
    topics: consultationBriefFacts(input).map(({ kind, text, sources }) => ({
      kind,
      text,
      sources,
    })),
    retry: false,
  };
}
