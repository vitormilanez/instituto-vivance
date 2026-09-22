// "Seu trabalho em aberto": o que só o profissional logado pode concluir —
// rascunho de atendimento, plano e relatório que ainda não chegaram ao
// paciente, documento sem revisão médica. Puro: a tela e o teste leem as
// mesmas regras.
//
// Regras:
// - só entra o que tem uma ação possível; pendência sem saída é ruído;
// - a ordem é o tempo de espera (o mais antigo primeiro), nunca relevância,
//   gravidade ou classificação de IA;
// - a cópia descreve o estado, não cobra: "aprovado, sem publicação ao
//   paciente" é um fato — o médico pode ter decidido não publicar.
export type OpenWorkKind = "encounter" | "plan" | "report" | "documents";

export type OpenWorkItem = {
  kind: OpenWorkKind;
  id: string;
  patientId: string;
  patientName: string;
  state: string;
  action: string;
  href: string;
  // Desde quando está assim (última alteração ou chegada mais antiga).
  since: string;
};

export const openWorkLimit = 8;

const planStates: Record<string, { state: string; action: string }> = {
  draft: { state: "Plano em rascunho", action: "Abrir plano" },
  in_review: { state: "Plano em revisão", action: "Revisar plano" },
  approved: {
    state: "Plano aprovado, sem publicação ao paciente",
    action: "Revisar publicação",
  },
};

const reportStates: Record<string, { state: string; action: string }> = {
  draft: { state: "Relatório em rascunho", action: "Abrir relatório" },
  in_review: { state: "Relatório em revisão", action: "Revisar relatório" },
  approved: {
    state: "Relatório aprovado, sem publicação ao paciente",
    action: "Revisar publicação",
  },
};

type Named = { patientId: string; patientName: string };

export function planItem(
  base: string,
  plan: Named & {
    id: string;
    status: string;
    version: number;
    updatedAt: string;
  },
  publishedVersions: Set<string>,
): OpenWorkItem | null {
  const copy = planStates[plan.status];
  if (!copy) return null;
  // Aprovado e já publicado nesta versão: não há nada em aberto.
  if (plan.status === "approved" && publishedVersions.has(`${plan.id}:${plan.version}`))
    return null;
  return {
    kind: "plan",
    id: plan.id,
    patientId: plan.patientId,
    patientName: plan.patientName,
    ...copy,
    href: `${base}/planos/${plan.id}`,
    since: plan.updatedAt,
  };
}

export function reportItem(
  base: string,
  report: Named & {
    id: string;
    status: string;
    version: number;
    updatedAt: string;
  },
  publishedVersions: Set<string>,
): OpenWorkItem | null {
  const copy = reportStates[report.status];
  if (!copy) return null;
  if (
    report.status === "approved" &&
    publishedVersions.has(`${report.id}:${report.version}`)
  )
    return null;
  return {
    kind: "report",
    id: report.id,
    patientId: report.patientId,
    patientName: report.patientName,
    ...copy,
    href: `${base}/relatorios/${report.id}`,
    since: report.updatedAt,
  };
}

export function encounterItem(
  base: string,
  draft: Named & { id: string; updatedAt: string },
): OpenWorkItem {
  return {
    kind: "encounter",
    id: draft.id,
    patientId: draft.patientId,
    patientName: draft.patientName,
    state: "Atendimento iniciado, ainda não finalizado",
    action: "Retomar",
    href: `${base}/atendimentos/${draft.id}`,
    since: draft.updatedAt,
  };
}

// Documentos sem nenhuma revisão médica, agrupados por paciente: uma linha
// por pessoa, com a contagem e a chegada mais antiga.
export function documentItems(
  base: string,
  documents: { id: string; patientId: string; at: string }[],
  reviewed: Set<string>,
  names: Map<string, string>,
): OpenWorkItem[] {
  const byPatient = new Map<string, { count: number; oldest: string }>();
  for (const document of documents) {
    if (reviewed.has(document.id)) continue;
    const current = byPatient.get(document.patientId);
    if (!current) byPatient.set(document.patientId, { count: 1, oldest: document.at });
    else {
      current.count += 1;
      if (document.at < current.oldest) current.oldest = document.at;
    }
  }
  return [...byPatient.entries()].map(([patientId, group]) => ({
    kind: "documents" as const,
    id: `documents-${patientId}`,
    patientId,
    patientName: names.get(patientId) ?? "Paciente",
    state:
      group.count === 1
        ? "1 documento sem revisão médica"
        : `${group.count} documentos sem revisão médica`,
    action: "Revisar documentos",
    href: `${base}/pacientes/${patientId}?aba=Documentos`,
    since: group.oldest,
  }));
}

// O que espera há mais tempo primeiro. Empate não depende da ordem do banco.
export function openWorkOrder(items: OpenWorkItem[]): OpenWorkItem[] {
  return [...items].sort((left, right) =>
    left.since !== right.since
      ? left.since < right.since
        ? -1
        : 1
      : `${left.kind}:${left.id}` < `${right.kind}:${right.id}`
        ? -1
        : 1,
  );
}

export function openWorkSummary(count: number): string {
  if (!count) return "Nada em aberto com você";
  return count === 1 ? "1 item em aberto" : `${count} itens em aberto`;
}
