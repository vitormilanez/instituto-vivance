export type PatientNextStepInput = {
  base: string;
  onboardingHref?: string | null;
  publishedPlanTitle?: string | null;
  hasConsultationInProgress: boolean;
  hasUpcomingConsultation: boolean;
  pendingCheckInId?: string | null;
  pendingReturnPreparationId?: string | null;
};

export function patientNextStep(input: PatientNextStepInput) {
  if (input.hasConsultationInProgress)
    return {
      title: "Acompanhe sua consulta em andamento",
      detail: "Veja as informações já registradas pela clínica.",
      action: "Ver consulta",
      href: `${input.base}/consultas`,
    };
  if (input.pendingCheckInId)
    return {
      title: "Responda à atualização solicitada",
      detail: "Seu médico deixou uma pergunta para acompanhar como você está.",
      action: "Responder agora",
      href: `${input.base}/diario#check-in-${input.pendingCheckInId}`,
    };
  if (input.pendingReturnPreparationId)
    return {
      title: "Prepare seu próximo retorno",
      detail: "Seu médico enviou um roteiro curto. Você pode responder, salvar e continuar depois.",
      action: "Começar preparo",
      href: `${input.base}/hoje#preparo-${input.pendingReturnPreparationId}`,
    };
  if (input.onboardingHref)
    return {
      title: "Continue seu cadastro",
      detail:
        "Conte um pouco sobre você e envie os exames que quiser compartilhar. Você pode continuar depois.",
      action: "Continuar meu cadastro",
      href: input.onboardingHref,
    };
  if (input.publishedPlanTitle)
    return {
      title: "Veja suas orientações médicas",
      detail: `${input.publishedPlanTitle} está disponível para você consultar.`,
      action: "Abrir orientações",
      href: `${input.base}/plano`,
    };
  if (input.hasUpcomingConsultation)
    return {
      title: "Confira sua próxima consulta",
      detail: "Veja o horário e as informações já registradas pela clínica.",
      action: "Ver consulta",
      href: `${input.base}/consultas`,
    };
  return {
    title: "Conheça seu espaço de conversas",
    detail:
      "Envie uma mensagem ao médico vinculado ao seu acompanhamento quando precisar.",
    action: "Abrir conversas",
    href: `${input.base}/conversas`,
  };
}
