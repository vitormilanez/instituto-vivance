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
  requiredPreparationStartsAt?: string;
  dailyCheckInDue?: boolean;
  preparationPending?: {
    count: number;
    first: { id: string; status: string; starts_at?: string } | null;
  };
  unreadPlan?: { title: string; revision: number } | null;
  hasMeasurement: boolean;
  // Pedidos abertos do médico. São pendências operacionais do paciente, nunca
  // risco ou urgência.
  careRequests?: { kind: string; requested_at: string; preparation_id?: string | null; preparation_starts_at?: string | null }[];
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
  request: { kind: string; requested_at: string; preparation_id?: string | null; preparation_starts_at?: string | null },
): PatientTodayTask | null {
  const asked = `Pedido em ${dayMonth(request.requested_at)}.`;
  const preparation = request.preparation_id;
  const missingPreparation = request.kind === "preparation" && !preparation;
  const consultation = request.preparation_starts_at ? ` Consulta de ${dayMonth(request.preparation_starts_at)}.` : "";
  const detail = {
    preparation: missingPreparation ? `A clínica precisa vincular este pedido a uma consulta. ${asked}` : `Seu médico pediu o preenchimento da sua pré-consulta.${consultation} ${asked}`,
    exams: `Seu médico pediu exames ou documentos. ${asked}`,
    measurements: `Seu médico pediu a atualização das suas medidas. ${asked}`,
    goals: `Seu médico pediu sua resposta sobre metas e expectativas. ${asked}`,
  }[request.kind];
  if (!detail) return null;
  return {
    id: `care-request-${request.kind}`,
    title: {
      preparation: missingPreparation ? "Conferir o pedido de pré-consulta" : "Preencher a pré-consulta pedida",
      exams: "Enviar exames ou documentos",
      measurements: "Atualizar suas medidas",
      goals: "Responder sobre metas e expectativas",
    }[request.kind]!,
    detail,
    action: {
      preparation: missingPreparation ? "Ver consultas" : "Preencher agora",
      exams: "Enviar exames",
      measurements: "Atualizar medidas",
      goals: "Responder",
    }[request.kind]!,
    href: {
      preparation: preparation ? `${input.base}/preconsulta?preparo=${preparation}` : `${input.base}/consultas`,
      exams: `${input.base}/documentos#enviar-documento`,
      measurements: `${input.base}/peso`,
      goals: `${input.base}/metas`,
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
      detail: input.requiredPreparationStartsAt ? `Responda às cinco perguntas antes da consulta de ${dayMonth(input.requiredPreparationStartsAt)}.` : "Responda às cinco perguntas antes da sua próxima consulta.",
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

  if (input.preparationPending?.first && !requests.some((request) => request.kind === "preparation" && request.preparation_id === input.preparationPending?.first?.id)) {
    const isDraft = input.preparationPending.first.status === "draft";
    const remaining = input.preparationPending.count > 1
      ? ` Há mais ${input.preparationPending.count - 1} preparo${input.preparationPending.count === 2 ? "" : "s"} aguardando você.`
      : "";
    tasks.push({
      id: `preparation-${input.preparationPending.first.id}`,
      title: isDraft ? "Continuar sua pré-consulta" : "Responder sua pré-consulta",
      detail: `${isDraft ? "Seu rascunho foi salvo; complete quando puder." : "Seu médico enviou um roteiro curto para a próxima conversa."}${input.preparationPending.first.starts_at ? ` Consulta de ${dayMonth(input.preparationPending.first.starts_at)}.` : ""}${remaining}`,
      action: isDraft ? "Continuar preparo" : "Responder preparo",
      href: `${input.base}/preconsulta?preparo=${input.preparationPending.first.id}`,
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

  if (input.dailyCheckInDue)
    tasks.push({ id: "daily-check-in", title: "Como você está reagindo ao tratamento?", detail: "Com toques · cerca de 1 minuto", action: "Começar check-in", href: `${input.base}/checkin` });

  const priority = (task: PatientTodayTask) =>
    task.id === "required-preparation" || task.id.startsWith("preparation-") || task.id === "care-request-preparation" ? 0
      : task.id.startsWith("care-request-") || task.id.startsWith("check-in-") ? 1
      : task.id === "daily-check-in" ? 2 : 3;
  return tasks.sort((a, b) => priority(a) - priority(b));
}
