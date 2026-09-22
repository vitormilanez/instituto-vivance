// A Home como o médico a lê: qual consulta está aberta, o que veio antes dela,
// o que cada linha recolhida diz e o que "Recebido" mostra. Puro — a tela só
// desenha o que este módulo decide, e o teste prova as mesmas regras.
//
// Regras que valem aqui e em toda a Home:
// - a ordem é sempre o horário ou a chegada; nada é ordenado por relevância;
// - nenhum texto sugere diagnóstico, conduta, risco ou urgência;
// - número só aparece quando é inteiro: se um tipo falhou, a contagem vira
//   "indisponível", nunca um total parcial nem zero;
// - sem vínculo ativo não há contagem, nem zero: o fato é dito.
import {
  receivedItemLabels,
  receivedOrder,
  receivedSince,
  receivedItemLimit,
  receivedEmptyCopy,
  type ReceivedItem,
  type ReceivedItemKind,
} from "./received-items.ts";
import {
  noCareLinkCopy,
  noCareLinkRowLabel,
  receivedCountLabel,
} from "./home-day.ts";

// O estado do vínculo de cuidado entre o profissional logado e o paciente.
// "assigned" é o vínculo atribuído que ainda espera o aceite desta pessoa;
// "none" é a ausência de qualquer atribuição para ela.
export type CareLink =
  | { status: "active" }
  | { status: "assigned"; relationshipId: string; version: number }
  | { status: "none" };

export type TimelineEntry = { id: string; status: string };

// Divide o dia em torno da consulta aberta. As consultas anteriores à próxima
// ficam num grupo recolhido: às 15h ninguém deveria rolar pela manhã inteira
// para chegar ao próximo paciente. Sem próxima consulta hoje, o dia inteiro é
// "anterior" — ele já aconteceu — e continua visível.
export function splitDay<T extends TimelineEntry>(
  appointments: T[],
  nextId: string | null,
): { earlier: T[]; rest: T[] } {
  const index = nextId
    ? appointments.findIndex((item) => item.id === nextId)
    : -1;
  if (index < 0) return { earlier: [], rest: [...appointments] };
  return {
    earlier: appointments.slice(0, index),
    rest: appointments.slice(index),
  };
}

// Qual consulta aparece aberta. A escolhida pela pessoa (na URL) só vale se for
// uma consulta do dia; qualquer outro valor cai na próxima, sem erro.
export function openConsultationId(
  appointments: TimelineEntry[],
  requested: string | null | undefined,
  nextId: string | null,
): string | null {
  if (requested && appointments.some((item) => item.id === requested))
    return requested;
  return nextId;
}

export function earlierLabel(count: number): string {
  return `${count} ${count === 1 ? "consulta anterior" : "consultas anteriores"}`;
}

export const receivedUnavailableLabel = "Contagem indisponível";

// O que a linha recolhida diz ao lado do nome.
export function rowSummary(input: {
  link: CareLink;
  received: ReceivedItem[];
  failed: ReceivedItemKind[];
}): string {
  if (input.link.status !== "active") return noCareLinkRowLabel;
  if (input.failed.length) return receivedUnavailableLabel;
  return receivedCountLabel(input.received.length);
}

export type ReceivedView = {
  visible: (ReceivedItem & { label: string })[];
  more: (ReceivedItem & { label: string })[];
  // null quando algum tipo falhou: o total seria parcial.
  total: number | null;
  empty: string | null;
  failedLabels: string[];
};

// A lista "Recebido desde a última consulta" pronta para desenhar. Os itens que
// carregaram aparecem; os tipos que falharam são nomeados à parte; o total e o
// estado vazio só existem quando tudo carregou.
export function receivedView(input: {
  items: ReceivedItem[];
  cutoff: string | null;
  hasPreviousConsultation: boolean;
  cutoffLabel: string | null;
  failed: ReceivedItemKind[];
}): ReceivedView {
  const ordered = receivedOrder(receivedSince(input.items, input.cutoff)).map(
    (item) => ({ ...item, label: receivedItemLabels[item.kind] }),
  );
  const complete = input.failed.length === 0;
  return {
    visible: ordered.slice(0, receivedItemLimit),
    more: ordered.slice(receivedItemLimit),
    total: complete ? ordered.length : null,
    empty:
      complete && ordered.length === 0
        ? receivedEmptyCopy(input.hasPreviousConsultation, input.cutoffLabel)
        : null,
    failedLabels: input.failed.map((kind) => receivedItemLabels[kind]),
  };
}

export function receivedFailureCopy(labels: string[]): string {
  return `Não foi possível carregar: ${labels.join(", ")}.`;
}

// Data de um item como o médico lê: um formato só em toda a Home. Hoje leva a
// hora, porque "hoje" sozinho não diz nada; os outros dias, só dia e mês.
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const clock = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const isoDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function receivedWhen(at: string, today: string): string {
  const instant = new Date(at);
  return isoDay.format(instant) === today
    ? `Hoje, ${clock.format(instant)}`
    : dayMonth.format(instant);
}

// Copy do vínculo ausente, conforme exista ou não uma atribuição a aceitar.
export function careLinkCopy(link: CareLink): string | null {
  if (link.status === "assigned") return noCareLinkCopy;
  if (link.status === "none")
    return "Este paciente não está atribuído a você. A atribuição é feita pela administração em Equipe de cuidado.";
  return null;
}

// "Entre consultas": pacientes com vínculo ativo e sem consulta hoje, que
// enviaram algo desde a última consulta. Ordem: quem enviou por último primeiro.
export function betweenConsultations(
  patients: { patientId: string; name: string }[],
  received: Map<string, ReceivedItem[]>,
): { patientId: string; name: string; items: ReceivedItem[]; latest: string }[] {
  const rows = [];
  for (const patient of patients) {
    const items = receivedOrder(received.get(patient.patientId) ?? []);
    if (!items.length) continue;
    rows.push({ ...patient, items, latest: items[0].at });
  }
  return rows.sort((left, right) =>
    left.latest !== right.latest
      ? left.latest < right.latest
        ? 1
        : -1
      : left.patientId < right.patientId
        ? -1
        : 1,
  );
}
