// Um card por tipo de informação que o médico precisa antes da consulta.
// Estado é sempre texto curto e factual: ausência é estado visível, nunca
// preenchida artificialmente (PRODUCT.md, princípio 4). Nada aqui classifica
// risco, urgência ou qualidade clínica.
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
};

export type ContextCardId =
  | "preparation"
  | "documents"
  | "measurements"
  | "goals"
  | "encounter"
  | "plan";

export type ContextCard = {
  id: ContextCardId;
  title: string;
  state: string;
  action: string;
  href: string;
  // Ausência do que o paciente deve fornecer. É pendência operacional, nunca
  // risco ou urgência.
  pending: boolean;
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

const dayMonth = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;

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
    },
    goals: {
      id: "goals",
      title: "Metas e expectativas",
      state: input.intake?.hasGoal ? "Respondidas" : "Não informadas",
      pending: !input.intake?.hasGoal,
      action: "Abrir contexto",
      href: `${input.recordBase}?aba=Vis%C3%A3o%20geral`,
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
