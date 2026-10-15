export const historyCategoryTitles: Record<string, string> = {
  discussed: "O que foi discutido",
  patient_goals: "O que o paciente busca",
  difficulties: "Dificuldades e rotina",
  conditions_and_history: "Condições e antecedentes",
  medications_and_supplements: "Medicamentos e suplementos",
  goals: "Metas",
  actions_and_followup: "Ações e acompanhamento",
  uncertainties: "Pontos para conferir",
};

export function consultationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function consultationTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function historyReviewLabel(decision: "accepted" | "rejected" | null, status: string) {
  if (decision === "rejected") return "Não utilizar";
  if (decision === "accepted") return "Revisado pelo médico";
  if (status === "ready") return "Aguardando revisão";
  if (["pending", "processing"].includes(status)) return "Resumo em processamento";
  if (status === "cancelled") return "Processamento interrompido";
  if (status === "failed") return "Resumo não gerado";
  return "Sem resumo disponível";
}
