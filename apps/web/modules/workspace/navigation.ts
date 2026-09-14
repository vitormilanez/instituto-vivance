// Navigation and product copy only. Clinical records must come from authorized services.
export const staffModules = [
  {
    slug: "agenda",
    title: "Agenda",
    description: "Organize os horários e os retornos da equipe.",
    action: "Agendar consulta",
    tabs: ["Calendário", "Próximos retornos"],
    columns: ["Paciente", "Data e horário", "Profissional", "Situação"],
    empty: "Nenhum agendamento neste período",
    detail:
      "As consultas e os retornos agendados pela equipe aparecerão aqui.",
  },
  {
    slug: "atendimentos",
    title: "Atendimentos",
    description: "Do preparo da consulta ao registro revisado do cuidado.",
    action: "Iniciar atendimento",
    tabs: ["Pré-consulta", "Em atendimento", "Concluídos"],
    columns: ["Paciente", "Consulta", "Responsável", "Etapa"],
    empty: "Nenhum atendimento disponível",
    detail: "O médico inicia pela agenda. Os registros exigem vínculo de cuidado ativo.",
  },
  {
    slug: "preparo",
    title: "Preparo",
    description: "Atualizações enviadas para cada retorno agendado.",
    action: "Solicitar pela Agenda",
    tabs: ["Todos"],
    columns: ["Paciente", "Retorno", "Envio", "Revisão"],
    empty: "Nenhum preparo solicitado",
    detail: "Solicite um roteiro curto em um retorno futuro pela Agenda.",
  },
  {
    slug: "planos",
    title: "Planos de cuidado",
    description: "Orientações com revisão médica e histórico de versões.",
    action: "Criar plano",
    tabs: ["Rascunhos", "Em revisão", "Aprovados", "Publicados"],
    columns: ["Paciente", "Plano", "Versão", "Responsável"],
    empty: "Os planos de cuidado aparecerão aqui",
    detail:
      "A criação, a revisão e a publicação de planos ainda serão integradas.",
  },
  {
    slug: "acompanhamento",
    title: "Acompanhamento",
    description: "Organize as informações recebidas entre as consultas.",
    action: "Solicitar check-in",
    tabs: ["Check-ins", "Medidas", "Linha do tempo"],
    columns: ["Paciente", "Atualização", "Recebido em", "Revisão"],
    empty: "O acompanhamento ainda não está conectado",
    detail:
      "Check-ins e medidas serão exibidos somente quando houver registros reais.",
  },
  {
    slug: "documentos",
    title: "Documentos",
    description: "Exames e arquivos no contexto de cada paciente.",
    action: "Adicionar documento",
    tabs: ["Todos os arquivos", "Exames", "Documentos clínicos"],
    columns: ["Arquivo", "Paciente", "Enviado em", "Tipo"],
    empty: "Nenhum documento disponível",
    detail: "Os arquivos autorizados aparecerão neste espaço privado.",
  },
  {
    slug: "mensagens",
    title: "Mensagens",
    description: "Conversas diretas e assíncronas com pacientes vinculados.",
    action: "Nova mensagem",
    tabs: ["Conversas"],
    columns: ["Paciente", "Última mensagem"],
    empty: "Nenhuma conversa disponível",
    detail: "Apenas o paciente e o médico com vínculo ativo acessam a conversa.",
  },
  {
    slug: "processamentos",
    title: "Processamentos",
    description: "Acompanhe tarefas privadas e autorizadas do cuidado.",
    action: "Nenhuma ação disponível",
    tabs: ["Fila privada"],
    columns: ["Tipo", "Estado", "Tentativas", "Atualização"],
    empty: "Nenhum processamento disponível",
    detail:
      "Áudio e IA só criarão tarefas depois de suas decisões específicas.",
  },
  {
    slug: "relatorios",
    title: "Relatórios",
    description: "Organize os documentos produzidos pela equipe.",
    action: "Criar relatório",
    tabs: ["Rascunhos", "Em revisão", "Publicados"],
    columns: ["Relatório", "Paciente", "Autor", "Atualização"],
    empty: "Os relatórios serão organizados aqui",
    detail:
      "A elaboração e a exportação serão liberadas após a integração dos registros clínicos.",
  },
  {
    slug: "ia",
    title: "Central da IA",
    description: "Apoio à organização das informações, com revisão humana.",
    action: "Gerar rascunho",
    tabs: ["Rascunhos", "Fontes", "Políticas", "Histórico"],
    columns: ["Solicitação", "Fonte", "Responsável", "Revisão"],
    empty: "A IA ainda não está conectada",
    detail:
      "Nenhum modelo é acionado nesta versão. Resultados clínicos exigirão revisão médica.",
  },
] as const;

export type StaffModule = (typeof staffModules)[number];
export type StaffModuleSlug = StaffModule["slug"];
export function findStaffModule(slug: string) {
  return staffModules.find((item) => item.slug === slug);
}

export const patientSections = [
  {
    slug: "hoje",
    title: "Hoje",
    group: "hoje",
    description: "Seu cuidado, um passo de cada vez.",
  },
  {
    slug: "cuidado",
    title: "Meu cuidado",
    group: "cuidado",
    description: "Orientações e próximos passos, reunidos em um só lugar.",
  },
  {
    slug: "conversas",
    title: "Conversas",
    group: "conversas",
    description: "Seu espaço para conversar diretamente com os médicos vinculados ao seu cuidado.",
  },
  {
    slug: "evolucao",
    title: "Evolução",
    group: "evolucao",
    description: "Acompanhe suas medidas e seu histórico ao longo do tempo.",
  },
  {
    slug: "plano",
    title: "Orientações médicas",
    group: "cuidado",
    description: "Suas orientações aprovadas e publicadas pelo médico.",
  },
  {
    slug: "medicamentos",
    title: "Tratamento",
    group: "cuidado",
    description:
      "Aqui ficarão as informações do tratamento revisadas pelo médico.",
  },
  {
    slug: "diario",
    title: "Diário",
    group: "cuidado",
    description: "Um espaço para registrar como você está entre as consultas.",
  },
  {
    slug: "consultas",
    title: "Consultas",
    group: "cuidado",
    description: "Seus próximos encontros com a equipe da clínica.",
  },
  {
    slug: "documentos",
    title: "Meus documentos",
    group: "cuidado",
    description:
      "Exames e arquivos compartilhados com a clínica.",
  },
  {
    slug: "relatorios",
    title: "Meus relatórios",
    group: "cuidado",
    description: "Sínteses que seu médico revisou e compartilhou com você.",
  },
] as const;
export type PatientSection = (typeof patientSections)[number];
export function findPatientSection(slug: string) {
  return patientSections.find((item) => item.slug === slug);
}

export function selectedTab(
  tabs: readonly string[],
  value: string | string[] | undefined,
) {
  return typeof value === "string" && tabs.includes(value) ? value : tabs[0];
}
