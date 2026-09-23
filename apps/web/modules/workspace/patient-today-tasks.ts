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
  hasRequiredPreparation?: boolean;
  preparationPending?: {
    count: number;
    first: { id: string; status: string } | null;
  };
  unreadPlan?: { title: string; revision: number } | null;
  hasMeasurement: boolean;
  // Pedidos abertos do médico. São pendências operacionais do paciente, nunca
  // risco ou urgência.
  careRequests?: { kind: string; requested_at: string }[];
};

const dayMonth = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

// Cada pedido abre direto o formulário que o resolve.
function careRequestTask(
  input: PatientTodayTasksInput,
  request: { kind: string; requested_at: string },
): PatientTodayTask | null {
  const asked = `Pedido em ${dayMonth(request.requested_at)}.`;
  const onboarding = input.onboardingHref ?? `${input.base}/documentos`;
  const detail = {
    preparation: `Seu médico pediu o preenchimento da sua pré-consulta. ${asked}`,
    exams: `Seu médico pediu exames ou documentos. ${asked}`,
    measurements: `Seu médico pediu a atualização das suas medidas. ${asked}`,
    goals: `Seu médico pediu sua resposta sobre metas e expectativas. ${asked}`,
  }[request.kind];
  if (!detail) return null;
  return {
    id: `care-request-${request.kind}`,
    title: {
      preparation: "Preencher a pré-consulta pedida",
      exams: "Enviar exames ou documentos",
      measurements: "Atualizar suas medidas",
      goals: "Responder sobre metas e expectativas",
    }[request.kind]!,
    detail,
    action: {
      preparation: "Preencher agora",
      exams: "Enviar exames",
      measurements: "Atualizar medidas",
      goals: "Responder",
    }[request.kind]!,
    href: {
      preparation: `${input.base}/preparo`,
      exams: onboarding,
      measurements: `${input.base}/peso`,
      goals: onboarding,
    }[request.kind]!,
  };
}

// These are patient actions only. A submitted item awaiting medical review is
// deliberately not presented as a task for the patient.
export function patientTodayTasks(input: PatientTodayTasksInput): PatientTodayTask[] {
  const tasks: PatientTodayTask[] = [];
  const requests = input.careRequests ?? [];
  const asked = new Set(requests.map((request) => request.kind));

  if (input.hasRequiredPreparation)
    tasks.push({
      id: "required-preparation",
      title: "Preencher sua pré-consulta",
      detail: "Responda às cinco perguntas antes da sua próxima consulta.",
      action: "Preencher agora",
      href: "#preconsulta-obrigatoria",
    });

  // O pedido do médico vem cedo: é a única pendência com prazo implícito.
  for (const request of requests) {
    const task = careRequestTask(input, request);
    if (task) tasks.push(task);
  }

  if (input.pendingCheckInId)
    tasks.push({
      id: `check-in-${input.pendingCheckInId}`,
      title: "Responder uma atualização",
      detail: "Sua equipe enviou uma pergunta para acompanhar como você está.",
      action: "Responder check-in",
      href: `${input.base}/diario#check-in-${input.pendingCheckInId}`,
    });

  if (input.preparationPending?.first && !asked.has("preparation")) {
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

  if (input.unreadPlan)
    tasks.push({
      id: "published-plan",
      title: "Ler uma nova orientação",
      detail: `${input.unreadPlan.title} · revisão ${input.unreadPlan.revision} publicada pela equipe.`,
      action: "Ver orientações",
      href: `${input.base}/plano`,
    });

  // Exames e metas abrem no mesmo lugar que o cadastro. Com um pedido desses
  // pendente, o convite genérico só repetiria o destino com outro texto.
  if (input.onboardingHref && !asked.has("exams") && !asked.has("goals"))
    tasks.push({
      id: "onboarding",
      title: "Continuar seu cadastro",
      detail: "Você pode completar suas informações quando quiser.",
      action: "Continuar cadastro",
      href: input.onboardingHref,
    });

  // Sem pedido do médico, vale o lembrete genérico. Com pedido, a tarefa do
  // pedido já nomeia o mesmo formulário — repetir seria a mesma pendência em
  // dois vocabulários.
  if (!input.hasMeasurement && !asked.has("measurements"))
    tasks.push({
      id: "measurements",
      title: "Atualizar medidas",
      detail: "Registre peso, altura ou circunferência abdominal para manter seu histórico atualizado.",
      action: "Atualizar medidas",
      href: `${input.base}/peso`,
    });

  return tasks;
}
