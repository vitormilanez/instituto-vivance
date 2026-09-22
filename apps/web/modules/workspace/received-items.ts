// "Recebido desde a última consulta": o que o paciente enviou, na ordem em que
// chegou. Puro — sem banco, sem React — para que o corte, a ordem e a cópia do
// vazio valham igual na tela e no teste.
//
// Regras que este módulo garante, e que a tela não pode reescrever:
// - ordem é sempre por chegada, mais recente primeiro; nunca por relevância,
//   score ou qualquer classificação;
// - nada aqui sugere diagnóstico, conduta, risco ou urgência;
// - só entra o que o paciente enviou: rascunho, conteúdo de IA e registro
//   feito pela equipe ficam de fora antes de chegar aqui.
export type ReceivedItemKind =
  | "preparation"
  | "documents"
  | "messages"
  | "checkins"
  | "measurements";

export type ReceivedItem = {
  kind: ReceivedItemKind;
  id: string;
  // Instante de chegada (UTC). A comparação de corte é entre instantes.
  at: string;
  // Quem enviou. Hoje é sempre o paciente, e a tela não exibe o autor; o campo
  // existe para quando houver outra origem.
  author: string | null;
  // Abre o registro original. Nada de resumo no lugar da fonte.
  href: string;
};

export type ReceivedRow = ReceivedItem & { patientId: string };

export const receivedItemLabels: Record<ReceivedItemKind, string> = {
  preparation: "Pré-consulta",
  documents: "Exame ou documento",
  messages: "Mensagem",
  checkins: "Check-in",
  measurements: "Medidas",
};

export const receivedItemLimit = 5;

// "Desde a última consulta" é desde a última consulta REALIZADA. Cancelada,
// falta e agendada nunca definem o corte — por construção, só um atendimento
// finalizado chega aqui. Sem consulta anterior, o corte é o início do vínculo
// de cuidado ativo: nada de antes do vínculo pode aparecer.
export function receivedCutoff(input: {
  finalizedAt: string | null;
  relationshipCreatedAt: string | null;
}): string | null {
  return input.finalizedAt ?? input.relationshipCreatedAt;
}

export function receivedSince(
  items: ReceivedItem[],
  cutoff: string | null,
): ReceivedItem[] {
  if (!cutoff) return [...items];
  return items.filter((item) => item.at > cutoff);
}

export function receivedOrder(items: ReceivedItem[]): ReceivedItem[] {
  return [...items].sort((left, right) => {
    if (left.at !== right.at) return left.at < right.at ? 1 : -1;
    // Empate de instante não pode depender da ordem de chegada do banco.
    return left.id < right.id ? 1 : -1;
  });
}

export function receivedEmptyCopy(
  hasPreviousConsultation: boolean,
  cutoffLabel: string | null,
): string {
  if (!hasPreviousConsultation || !cutoffLabel) return "Nada enviado ainda";
  return `Nada enviado desde ${cutoffLabel}`;
}

export type ReceivedGroup = {
  items: ReceivedItem[];
  total: number;
  hidden: number;
  empty: string;
};

export function receivedGroup(input: {
  items: ReceivedItem[];
  cutoff: string | null;
  hasPreviousConsultation: boolean;
  cutoffLabel?: string | null;
}): ReceivedGroup {
  const ordered = receivedOrder(receivedSince(input.items, input.cutoff));
  return {
    items: ordered.slice(0, receivedItemLimit),
    total: ordered.length,
    hidden: Math.max(0, ordered.length - receivedItemLimit),
    empty: receivedEmptyCopy(
      input.hasPreviousConsultation,
      input.cutoffLabel ?? null,
    ),
  };
}

// A query do dia é uma só por tipo, com o MENOR corte entre os pacientes. Cada
// paciente então é filtrado pelo próprio corte aqui — é isto que impede um item
// anterior à última consulta de alguém aparecer na lista dele.
export function splitByPatient(
  rows: ReceivedRow[],
  cutoffs: Map<string, string | null>,
): Map<string, ReceivedItem[]> {
  const grouped = new Map<string, ReceivedItem[]>();
  for (const row of rows) {
    // Paciente sem entrada no mapa não tem vínculo verificado: fica fora, mesmo
    // que a linha tenha vindo no lote. O filtro de vínculo não depende de quem
    // montou a query.
    if (!cutoffs.has(row.patientId)) continue;
    const cutoff = cutoffs.get(row.patientId) ?? null;
    if (cutoff && row.at <= cutoff) continue;
    const { patientId, ...item } = row;
    void patientId;
    const list = grouped.get(row.patientId) ?? [];
    list.push(item);
    grouped.set(row.patientId, list);
  }
  return grouped;
}

// Menor corte do conjunto: é o limite que a query única pode usar sem cortar
// cedo demais para ninguém.
export function earliestCutoff(cutoffs: Map<string, string | null>): string | null {
  let earliest: string | null = null;
  for (const cutoff of cutoffs.values()) {
    if (cutoff === null) return null; // um paciente sem corte exige a lista toda
    if (earliest === null || cutoff < earliest) earliest = cutoff;
  }
  return earliest;
}

// Data do corte como o médico lê. Dia em São Paulo, como o resto da Home.
export function receivedDateLabel(at: string | null): string | null {
  if (!at) return null;
  return new Date(at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}
