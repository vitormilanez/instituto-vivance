export type PatientTodayTask = {
  id: string;
  title: string;
  detail: string;
  action: string;
  href: string;
};

export type PatientTodayTasksInput = {
  base: string;
  onboardingHref?: string | null;
  pendingCheckInId?: string | null;
  preparationPending?: {
    count: number;
    first: { id: string; status: string } | null;
  };
  hasMeasurement: boolean;
};

// These are patient actions only. A submitted item awaiting medical review is
// deliberately not presented as a task for the patient.
export function patientTodayTasks(input: PatientTodayTasksInput): PatientTodayTask[] {
  const tasks: PatientTodayTask[] = [];

  if (input.pendingCheckInId)
    tasks.push({
      id: `check-in-${input.pendingCheckInId}`,
      title: "Responder uma atualização",
      detail: "Sua equipe enviou uma pergunta para acompanhar como você está.",
      action: "Responder check-in",
      href: `${input.base}/diario#check-in-${input.pendingCheckInId}`,
    });

  if (input.preparationPending?.first) {
    const isDraft = input.preparationPending.first.status === "draft";
    const remaining = input.preparationPending.count > 1
      ? ` Há mais ${input.preparationPending.count - 1} preparo${input.preparationPending.count === 2 ? "" : "s"} aguardando você.`
      : "";
    tasks.push({
      id: `preparation-${input.preparationPending.first.id}`,
      title: isDraft ? "Continuar sua pré-consulta" : "Responder sua pré-consulta",
      detail: `${isDraft ? "Seu rascunho foi salvo; complete quando puder." : "Seu médico enviou um roteiro curto para a próxima conversa."}${remaining}`,
      action: isDraft ? "Continuar preparo" : "Responder preparo",
      href: `${input.base}/hoje?preparo=${input.preparationPending.first.id}#preparo-${input.preparationPending.first.id}`,
    });
  }

  if (input.onboardingHref)
    tasks.push({
      id: "onboarding",
      title: "Continuar seu cadastro",
      detail: "Você pode completar suas informações quando quiser.",
      action: "Continuar cadastro",
      href: input.onboardingHref,
    });

  if (!input.hasMeasurement)
    tasks.push({
      id: "measurements",
      title: "Atualizar medidas",
      detail: "Registre peso, altura ou circunferência abdominal para manter seu histórico atualizado.",
      action: "Atualizar medidas",
      href: `${input.base}/evolucao#atualizar-medidas`,
    });

  return tasks;
}
