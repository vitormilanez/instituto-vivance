// Um card por tipo de informação que o médico precisa antes da consulta.
// Estado é sempre texto curto e factual: ausência é estado visível, nunca
// preenchida artificialmente (PRODUCT.md, princípio 4). Nada aqui classifica
// risco, urgência ou qualidade clínica.
//
// Quatro destes cards são alimentados pelo paciente — pré-consulta, exames,
// medidas e metas. Só neles existe solicitação: "Última consulta" e "Plano de
// cuidado" são registros da clínica, e não se pede a alguém que os preencha.
export type ConsultationContextInput = {
  base: string;
  recordBase: string;
  preparation: { id: string; status: string; submittedAt: string | null } | null;
  documents: { total: number; latestAt: string | null };
  measurements: { total: number; latestAt: string | null };
  intake: { hasGoal: boolean; updatedAt: string | null } | null;
  encounter: { id: string; finalizedAt: string | null } | null;
  publication: {
    planId: string;
    revision: number;
    publishedAt: string | null;
  } | null;
  // Pendências abertas com o paciente, por tipo. Vazio quando não há nenhuma.
  requests: { kind: string; requested_at: string }[];
};

export type ContextCardId =
  | "preparation"
  | "documents"
  | "measurements"
  | "goals"
  | "encounter"
  | "plan";

export type CareRequestKind =
  | "preparation"
  | "exams"
  | "measurements"
  | "goals";

export type ContextCardRequest = {
  kind: CareRequestKind;
  // Nulo enquanto ninguém pediu; com data, é pendência aberta com o paciente.
  requestedAt: string | null;
};

export type ContextCard = {
  id: ContextCardId;
  title: string;
  state: string;
  action: string;
  href: string;
  // Ausência do que o paciente deve fornecer. É pendência operacional, nunca
  // risco ou urgência.
  pending: boolean;
  // Presente apenas nos cards que o paciente alimenta.
  request: ContextCardRequest | null;
};

// A ordem é fixa para o médico aprender onde olhar: primeiro o que o paciente
// fornece, depois os registros da clínica.
export const contextCardOrder: ContextCardId[] = [
  "preparation",
  "documents",
  "measurements",
  "goals",
  "encounter",
  "plan",
];

const patientProvided: ContextCardId[] = [
  "preparation",
  "documents",
  "measurements",
  "goals",
];

// O card de exames fala "exames"; o banco chama esse tipo de "exams". O mapa
// existe para que a tradução fique em um lugar só.
const requestKindForCard: Partial<Record<ContextCardId, CareRequestKind>> = {
  preparation: "preparation",
  documents: "exams",
  measurements: "measurements",
  goals: "goals",
};

const requestActionLabels: Record<CareRequestKind, string> = {
  preparation: "Solicitar pré-consulta",
  exams: "Solicitar exames",
  measurements: "Solicitar medidas",
  goals: "Solicitar metas",
};

export function careRequestActionLabel(kind: CareRequestKind): string {
  return requestActionLabels[kind];
}

const dayMonth = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;

// O que substitui o botão enquanto a pendência está aberta.
export function careRequestPendingLabel(requestedAt: string): string {
  const date = dayMonth(requestedAt);
  return date ? `Solicitado em ${date}` : "Solicitado";
}

function requestFor(
  input: ConsultationContextInput,
  id: ContextCardId,
): ContextCardRequest | null {
  const kind = requestKindForCard[id];
  if (!kind) return null;
  const open = input.requests.find((item) => item.kind === kind);
  return { kind, requestedAt: open?.requested_at ?? null };
}

function preparationCard(input: ConsultationContextInput): ContextCard {
  const request = input.preparation;
  const state =
    !request || request.status === "requested" || request.status === "cancelled"
      ? { state: "Não preenchida", pending: true }
      : request.status === "draft"
        ? { state: "Rascunho salvo", pending: true }
        : { state: "Enviada", pending: false };
  return {
    id: "preparation",
    title: "Pré-consulta",
    ...state,
    action: "Abrir pré-consulta",
    href:
      request && request.status !== "cancelled"
        ? `${input.base}/preparo?solicitacao=${request.id}#preparo-${request.id}`
        : input.recordBase,
    request: requestFor(input, "preparation"),
  };
}

export function consultationContextCards(
  input: ConsultationContextInput,
): ContextCard[] {
  const documentDate = dayMonth(input.documents.latestAt);
  const measurementDate = dayMonth(input.measurements.latestAt);
  const encounterDate = dayMonth(input.encounter?.finalizedAt ?? null);
  const publicationDate = dayMonth(input.publication?.publishedAt ?? null);
  const cards: Record<ContextCardId, ContextCard> = {
    preparation: preparationCard(input),
    documents: {
      id: "documents",
      title: "Exames",
      // A contagem vem junto: o médico sabe quantos arquivos existem antes de
      // abrir a lista, sem que o card classifique qualidade ou risco.
      state: input.documents.total
        ? `${input.documents.total} exame${input.documents.total > 1 ? "s" : ""} enviado${input.documents.total > 1 ? "s" : ""}${documentDate ? ` em ${documentDate}` : ""}`
        : "Nenhum exame enviado",
      pending: input.documents.total === 0,
      action: "Abrir documentos",
      href: `${input.recordBase}?aba=Documentos`,
      request: requestFor(input, "documents"),
    },
    measurements: {
      id: "measurements",
      title: "Medidas",
      state: input.measurements.total
        ? measurementDate
          ? `Última atualização em ${measurementDate}`
          : "Atualizadas"
        : "Não preenchidas",
      pending: input.measurements.total === 0,
      action: "Abrir evolução",
      href: `${input.recordBase}?aba=Evolu%C3%A7%C3%A3o`,
      request: requestFor(input, "measurements"),
    },
    goals: {
      id: "goals",
      title: "Metas e expectativas",
      state: input.intake?.hasGoal ? "Respondidas" : "Não informadas",
      pending: !input.intake?.hasGoal,
      action: "Abrir contexto",
      href: `${input.recordBase}?aba=Vis%C3%A3o%20geral`,
      request: requestFor(input, "goals"),
    },
    encounter: {
      id: "encounter",
      title: "Última consulta",
      state: input.encounter
        ? encounterDate
          ? `Finalizada em ${encounterDate}`
          : "Finalizada"
        : "Nenhum registro finalizado",
      pending: !input.encounter,
      action: "Abrir registro",
      href: input.encounter
        ? `${input.base}/atendimentos/${input.encounter.id}`
        : `${input.base}/atendimentos`,
      request: null,
    },
    plan: {
      id: "plan",
      title: "Plano de cuidado",
      state: input.publication
        ? publicationDate
          ? `Publicado em ${publicationDate} · revisão ${input.publication.revision}`
          : `Publicado · revisão ${input.publication.revision}`
        : "Nenhum plano publicado",
      pending: !input.publication,
      action: "Ver plano",
      href: input.publication
        ? `${input.base}/planos/${input.publication.planId}`
        : `${input.recordBase}?aba=Vis%C3%A3o%20geral`,
      request: null,
    },
  };
  return contextCardOrder.map((id) => cards[id]);
}

// Quantas das informações que o paciente deve fornecer ainda faltam. Diz o
// tamanho da lacuna sem nomear risco nem priorizar conduta.
export function contextSummary(cards: ContextCard[]): string {
  const pending = cards.filter(
    (card) => patientProvided.includes(card.id) && card.pending,
  ).length;
  if (pending === 0)
    return "Pré-consulta, exames, medidas e metas estão registrados por este paciente.";
  return `${pending} de ${patientProvided.length} informações do paciente ainda não foram registradas.`;
}
