import type { ReceivedItem } from "./received-items.ts";
import type { OpenWorkItem } from "./open-work-items.ts";

// O briefing assume todas as pendências da pessoa visível. A exclusão só se
// aplica depois de o contexto autorizado ter sido carregado.
export function outsideBriefing<T extends { patientId: string }>(items: T[], patientId: string | null): T[] {
  return items.filter((item) => item.patientId !== patientId);
}

export function consultationAction(input: { draft: { id: string; appointment_id: string | null } | null; appointmentId: string; preparable: boolean; base: string; agendaHref: string; query?: string }) {
  // Rascunho ainda sem agendamento também pertence a esta pessoa e deve ser
  // retomado. Rascunho de outro agendamento conserva sua ação separada.
  const resume = input.draft && (input.draft.appointment_id === input.appointmentId || input.draft.appointment_id === null);
  return resume
    ? { label: "Retomar atendimento", href: `${input.base}/atendimentos/${input.draft!.id}${input.query ?? ""}` }
    : { label: input.preparable ? "Preparar atendimento" : "Ver na agenda", href: input.agendaHref };
}

export function reviewSidebar(input: { patients: { patientId: string; name: string; items: ReceivedItem[] }[]; work: OpenWorkItem[] | null; focusPatientId: string | null }) {
  const groups = new Map<string, { patientId: string; name: string; counts: Map<ReceivedItem["kind"], number>; oldest: string; documentHref?: string }>();
  for (const patient of outsideBriefing(input.patients, input.focusPatientId)) {
    const items = patient.items.filter((item) => item.reviewed !== true);
    if (!items.length) continue;
    const counts = new Map<ReceivedItem["kind"], number>();
    for (const item of items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
    groups.set(patient.patientId, { ...patient, counts, oldest: items.reduce((oldest, item) => item.at < oldest ? item.at : oldest, items[0].at) });
  }
  // A coleção de trabalho conta todos os documentos sem revisão, inclusive
  // arquivos adicionados pela equipe. Não somar as mesmas fontes duas vezes.
  for (const item of outsideBriefing(input.work ?? [], input.focusPatientId)) {
    if (item.kind !== "documents" || item.total === undefined) continue;
    const group = groups.get(item.patientId) ?? { patientId: item.patientId, name: item.patientName, counts: new Map<ReceivedItem["kind"], number>(), oldest: item.since, documentHref: undefined as string | undefined };
    group.counts.set("documents", item.total);
    group.documentHref = item.href;
    if (item.since < group.oldest) group.oldest = item.since;
    groups.set(item.patientId, group);
  }
  return [...groups.values()].sort((a, b) => a.oldest.localeCompare(b.oldest) || a.patientId.localeCompare(b.patientId)).map((group) => ({ ...group, counts: [...group.counts].map(([kind, total]) => ({ kind, total })) }));
}
