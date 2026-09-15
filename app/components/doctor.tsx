'use client';

import {
  ArrowRight,
  Brain,
  Broadcast as PhosphorBroadcast,
  CalendarBlank,
  ChatCircle,
  Clock,
  FileText,
  House,
  Sparkle,
  Users,
  VideoCamera,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useCareDemo } from './care-demo-store';
import type { CareConversationContext } from './care-demo-types';
import { AiDraftBadge, ClinicalLayerBadge, SimulationDisclaimer } from './clinical';
import {
  DEFAULT_ENCOUNTER_ID,
  DEFAULT_PATIENT_ID,
  doctorNavigation,
  getConsultationHref,
  getDefaultEncounterId,
  getPatientDossierHref,
  getPatientMessagesHref,
  getPreConsultationHref,
  type ClinicalRouteMode,
  type DoctorView,
} from './demo-routes';
import { PreConsultationReviewWorkspace } from './doctor-preconsultation-review';
import { DoctorCarePlanWorkspace } from './doctor-care-plan-workspace';
import { VivanceDoctorDashboard } from './doctor-dashboard-vivance';
import { DoctorTeleconsultationAiWorkspace } from './doctor-teleconsultation-ai-workspace';
import { DoctorAiControlCenter } from './doctor-ai-control-center';
import {
  PatientAvatar,
  PatientCohort,
  PatientLongitudinalWorkspace,
  type PatientWorkspaceProfile,
} from './doctor-patient-longitudinal';
import { cn, Heading, NavigationLink as Link, Status, Toast } from './shared';
import { useSessionDemoState } from './use-session-demo-state';
import { LogoutButton } from './logout-button';
import { usePersistentConversation } from './use-persistent-conversation';

type AppointmentTone = 'green' | 'amber' | 'rose' | 'blue' | 'gray';
type Appointment = {
  patientId: string;
  encounterId: string;
  time: string;
  patient: string;
  initials: string;
  type: string;
  status: string;
  statusTone: AppointmentTone;
  preVisit: string;
  preVisitTone: AppointmentTone;
  objective: string;
  reported: string;
  aiFocus: string;
  metrics: Array<[string, string, string]>;
  attentionTitle: string;
  attentionDetail: string;
  checklist: string[];
};

const SparklesIcon = Sparkle;
const VideoIcon = VideoCamera;
const CalendarIcon = CalendarBlank;
const BroadcastIcon = PhosphorBroadcast;
const ArrowRightIcon = ArrowRight;

const sidebarNavigationIcons = {
  'Visão geral': House,
  Agenda: CalendarBlank,
  Pacientes: Users,
  Mensagens: ChatCircle,
  Relatórios: FileText,
  'Central da IA': Brain,
} as const;

interface DoctorDemoUiState {
  reportApproved: boolean;
  overdueReminderSent: boolean;
  examReminderSent: boolean;
}

const initialDoctorDemoUiState: DoctorDemoUiState = {
  reportApproved: false,
  overdueReminderSent: false,
  examReminderSent: false,
};

const doctorConversationContexts: Array<{ value: CareConversationContext; label: string }> = [
  { value: 'care-plan', label: 'Plano' },
  { value: 'check-in', label: 'Check-in' },
  { value: 'diary', label: 'Diário' },
  { value: 'general', label: 'Outro assunto' },
];

const doctorConversationContextLabel: Record<CareConversationContext, string> = {
  'care-plan': 'Plano de cuidado',
  'check-in': 'Check-in',
  'diary': 'Diário',
  'general': 'Outro assunto',
};

function normalizeDoctorDemoUiState(value: unknown): DoctorDemoUiState {
  const stored = typeof value === 'object' && value !== null ? value as Partial<DoctorDemoUiState> : {};
  return {
    reportApproved: typeof stored.reportApproved === 'boolean' ? stored.reportApproved : false,
    overdueReminderSent: typeof stored.overdueReminderSent === 'boolean' ? stored.overdueReminderSent : false,
    examReminderSent: typeof stored.examReminderSent === 'boolean' ? stored.examReminderSent : false,
  };
}

const alerts = [
  {
    patient: 'Marina Costa',
    detail: 'Sono abaixo do padrão pessoal por 4 dias',
    context: 'Média de 5h42, 18% abaixo do padrão das últimas quatro semanas.',
    tag: 'Revisar hoje',
    tone: 'amber' as const,
  },
  {
    patient: 'Paulo Mendes',
    detail: 'Relatou enjoo após atualização do plano',
    context: 'Novo sintoma informado no check-in das 08:12. Ainda sem resposta.',
    tag: 'Nova mensagem',
    tone: 'rose' as const,
  },
  {
    patient: 'Ana Ribeiro',
    detail: 'Relatório quinzenal pronto para aprovação',
    context: 'A IA reuniu adesão, peso, sono e observações. Requer revisão médica.',
    tag: 'Relatório',
    tone: 'blue' as const,
  },
];

const appointments: Appointment[] = [
  {
    patientId: 'pac-demo-005',
    encounterId: 'enc-demo-001',
    time: '09:00',
    patient: 'Lúcia Barbosa',
    initials: 'LB',
    type: 'Retorno longevidade · 30 min',
    status: 'Concluída',
    statusTone: 'gray',
    preVisit: 'Pré-consulta revisada',
    preVisitTone: 'blue',
    objective: '“Quero manter minha energia ao longo do dia e recuperar segurança nos exercícios.”',
    reported: 'Boa disposição pela manhã, uma queda de energia à tarde e nenhum sintoma novo.',
    aiFocus: 'Revisar distribuição das atividades e percepção de esforço, sem ampliar metas automaticamente.',
    metrics: [['Energia', '4 de 5', '+1 ponto'], ['Passos', '7.280', '+6%'], ['Sono', '7h04', 'regular']],
    attentionTitle: 'Sem alerta clínico novo',
    attentionDetail: 'A variação de energia foi registrada para contextualização médica, sem inferência diagnóstica.',
    checklist: ['Validar energia à tarde', 'Revisar percepção de esforço', 'Definir próximo acompanhamento'],
  },
  {
    patientId: DEFAULT_PATIENT_ID,
    encounterId: DEFAULT_ENCOUNTER_ID,
    time: '10:30',
    patient: 'Marina Costa',
    initials: 'MC',
    type: 'Retorno · 30 min',
    status: 'Próxima',
    statusTone: 'green',
    preVisit: 'Texto concluído · resumo pronto',
    preVisitTone: 'blue',
    objective: '“Quero continuar perdendo peso sem ficar cansada e voltar a dormir melhor.”',
    reported: 'Mais saciedade, sono pior nesta semana e nenhum sintoma novo.',
    aiFocus: 'Priorizar sono e energia antes de ampliar metas.',
    metrics: [['Peso', '91,6 kg', '−3,2 kg'], ['Adesão', '82%', '+6 p.p.'], ['Sono', '5h42', '23 de 29 noites']],
    attentionTitle: 'Sono fora do padrão pessoal',
    attentionDetail: 'Quatro noites abaixo de seis horas. Dados do relógio são demonstrativos e não equivalem a diagnóstico.',
    checklist: ['Validar sono', 'Confirmar tolerância', 'Decidir próximo passo'],
  },
  {
    patientId: 'pac-demo-004',
    encounterId: 'enc-demo-003',
    time: '11:30',
    patient: 'Rafael Lima',
    initials: 'RL',
    type: 'Primeira consulta · 50 min',
    status: 'Confirmada',
    statusTone: 'green',
    preVisit: 'Anamnese 68% concluída',
    preVisitTone: 'amber',
    objective: '“Quero entender por que estou cansado e começar uma rotina que eu consiga manter.”',
    reported: 'Cansaço ao fim do dia, rotina irregular e dois exames anexados para revisão.',
    aiFocus: 'Completar lacunas da anamnese e organizar perguntas para a avaliação inicial.',
    metrics: [['Anamnese', '68%', '3 lacunas'], ['Exames', '2', 'anexados'], ['Sono', '6h18', 'relatado']],
    attentionTitle: 'Anamnese ainda incompleta',
    attentionDetail: 'Faltam histórico familiar, uso atual de suplementos e contexto do cansaço relatado.',
    checklist: ['Completar histórico', 'Revisar exames anexados', 'Definir objetivo inicial'],
  },
  {
    patientId: 'pac-demo-002',
    encounterId: 'enc-demo-004',
    time: '14:00',
    patient: 'Ana Ribeiro',
    initials: 'AR',
    type: 'Retorno força · 30 min',
    status: 'Confirmada',
    statusTone: 'green',
    preVisit: 'Texto concluído · relatório pronto',
    preVisitTone: 'blue',
    objective: '“Quero continuar ganhando força sem perder energia para o restante da semana.”',
    reported: 'Treinos pela manhã facilitaram a rotina e a energia permaneceu estável.',
    aiFocus: 'Validar progressão de força e revisar o relatório mensal antes de qualquer ajuste.',
    metrics: [['Adesão', '88%', '+8 p.p.'], ['Força', '+12%', '4 semanas'], ['Passos', '7.140', 'estável']],
    attentionTitle: 'Relatório mensal aguarda aprovação',
    attentionDetail: 'A síntese foi organizada pela IA e ainda requer interpretação e aprovação médica.',
    checklist: ['Aprovar relatório', 'Revisar progressão de força', 'Confirmar energia semanal'],
  },
  {
    patientId: 'pac-demo-003',
    encounterId: 'enc-demo-005',
    time: '16:30',
    patient: 'Paulo Mendes',
    initials: 'PM',
    type: 'Acompanhamento · 25 min',
    status: 'A confirmar',
    statusTone: 'amber',
    preVisit: 'Novo sintoma no check-in',
    preVisitTone: 'rose',
    objective: '“Quero ajustar minha rotina sem continuar sentindo enjoo.”',
    reported: 'Enjoo após atualização do plano e redução dos registros desde ontem.',
    aiFocus: 'Levar o novo relato ao médico antes de manter ou alterar qualquer orientação.',
    metrics: [['Sintoma', 'Enjoo', 'novo relato'], ['Adesão', '72%', '−8 p.p.'], ['Check-ins', '5 de 7', '2 ausentes']],
    attentionTitle: 'Novo sintoma requer avaliação médica',
    attentionDetail: 'O app apenas destacou o relato. Nenhum diagnóstico ou ajuste de conduta foi realizado.',
    checklist: ['Ouvir relato do enjoo', 'Revisar receita vigente', 'Decidir continuidade do plano'],
  },
];

const patients: PatientWorkspaceProfile[] = [
  {
    id: DEFAULT_PATIENT_ID,
    nextEncounterId: DEFAULT_ENCOUNTER_ID,
    age: 39,
    initials: 'MC',
    name: 'Marina Costa',
    focus: 'Emagrecimento · sono',
    progress: '−3,2 kg',
    attention: 'Sono',
    tone: 'amber' as const,
    programSignal: 'monitor' as const,
    avatarSeed: 'marina',
    lastContactOrder: 1,
    reportCount: '2',
    prescriptionCount: '1 ativa',
    cycle: 'Dia 29 de 90',
    lastContact: 'Hoje · 09:18',
    nextConsultation: 'Hoje · 10:30',
    adherence: '82%',
    report: {
      title: 'Relatório quinzenal',
      period: '11–25 de agosto',
      status: 'Revisado em 24 ago',
      summary: 'Os registros mostram redução numérica de peso; sono incompleto e medidas com origens diferentes permanecem para revisão.',
      metrics: [['Peso', '−3,2 kg'], ['Adesão', '82%'], ['Sono médio', '5h42']],
    },
    prescription: {
      title: 'Receita digital #RX-1042',
      status: 'Ativa',
      detail: '1 item prescrito · validade até 26 de setembro',
      note: 'Emitida na última consulta e disponibilizada à paciente.',
    },
    insight: {
      title: 'Priorizar sono antes de ampliar metas',
      detail: 'Quatro noites abaixo de seis horas coincidem com menor energia nos check-ins.',
      basis: 'Baseado em 14 dias de dados demonstrativos.',
    },
    activity: [
      ['Hoje · 09:18', 'Pré-consulta por texto concluída'],
      ['Ontem · 20:08', 'Jantar e saciedade registrados'],
      ['24 ago · 16:42', 'Relatório quinzenal revisado'],
    ],
    nextSteps: ['Investigar despertares noturnos', 'Confirmar tolerância ao plano atual', 'Definir meta da próxima quinzena'],
  },
  {
    id: 'pac-demo-002',
    nextEncounterId: 'enc-demo-004',
    initials: 'AR',
    name: 'Ana Ribeiro',
    focus: 'Longevidade · força',
    progress: '+8% adesão',
    attention: 'Relatório',
    tone: 'blue' as const,
    programSignal: 'expected' as const,
    avatarSeed: 'ana',
    lastContactOrder: 5,
    reportCount: '3',
    prescriptionCount: 'Nenhuma',
    cycle: 'Dia 61 de 90',
    lastContact: 'Ontem · 18:40',
    nextConsultation: '28 ago · 14:00',
    adherence: '88%',
    report: {
      title: 'Relatório mensal',
      period: '25 jul–25 ago',
      status: 'Pronto para aprovação',
      summary: 'Aumento de consistência nos exercícios de força, com melhora de energia e manutenção do peso.',
      metrics: [['Adesão', '88%'], ['Força', '+12%'], ['Passos', '7.140']],
    },
    prescription: {
      title: 'Nenhuma receita ativa',
      status: 'Sem pendências',
      detail: 'Não há documentos de prescrição vigentes neste ciclo.',
      note: 'O histórico permanece disponível no prontuário demonstrativo.',
    },
    insight: {
      title: 'Boa resposta à rotina de força',
      detail: 'A adesão aumentou após a troca dos treinos para o período da manhã.',
      basis: 'Padrão observado em quatro semanas demonstrativas.',
    },
    activity: [
      ['Ontem · 18:40', 'Check-in semanal concluído'],
      ['23 ago · 07:32', 'Meta de força registrada'],
      ['20 ago · 15:10', 'Relatório mensal preparado'],
    ],
    nextSteps: ['Aprovar relatório mensal', 'Revisar progressão de força', 'Manter acompanhamento de energia'],
  },
  {
    id: 'pac-demo-003',
    nextEncounterId: 'enc-demo-005',
    initials: 'PM',
    name: 'Paulo Mendes',
    focus: 'Emagrecimento · rotina',
    progress: '72% plano',
    attention: 'Sintoma',
    tone: 'rose' as const,
    programSignal: 'review' as const,
    avatarSeed: 'paulo',
    lastContactOrder: 2,
    reportCount: '1',
    prescriptionCount: '1 ativa',
    cycle: 'Dia 18 de 60',
    lastContact: 'Hoje · 08:12',
    nextConsultation: 'Hoje · 16:30',
    adherence: '72%',
    report: {
      title: 'Relatório semanal',
      period: '18–25 de agosto',
      status: 'Processando',
      summary: 'Adesão moderada, com queda nos registros após relato de enjoo no check-in de hoje.',
      metrics: [['Adesão', '72%'], ['Peso', '−0,6 kg'], ['Check-ins', '5 de 7']],
    },
    prescription: {
      title: 'Receita digital #RX-1051',
      status: 'Requer revisão',
      detail: '1 item prescrito · emitida em 18 de agosto',
      note: 'Novo sintoma relatado após a emissão; documento sinalizado ao médico.',
    },
    insight: {
      title: 'Revisar enjoo antes de manter o plano',
      detail: 'O relato de hoje deve ser avaliado pelo médico antes de qualquer ajuste.',
      basis: 'Alerta criado a partir do relato do paciente, sem diagnóstico.',
    },
    activity: [
      ['Hoje · 08:12', 'Novo sintoma relatado'],
      ['Ontem · 19:26', 'Check-in não concluído'],
      ['22 ago · 12:18', 'Receita acessada pelo paciente'],
    ],
    nextSteps: ['Responder ao relato de enjoo', 'Revisar receita vigente', 'Decidir continuidade do plano'],
  },
  {
    id: 'pac-demo-004',
    nextEncounterId: 'enc-demo-003',
    initials: 'RL',
    name: 'Rafael Lima',
    focus: 'Avaliação inicial',
    progress: 'Novo',
    attention: 'Anamnese',
    tone: 'gray' as const,
    programSignal: 'monitor' as const,
    avatarSeed: 'rafael',
    lastContactOrder: 7,
    reportCount: '0',
    prescriptionCount: 'Nenhuma',
    cycle: 'Pré-cuidado',
    lastContact: 'Ontem · 11:05',
    nextConsultation: 'Hoje · 11:30',
    adherence: 'Ainda não',
    report: {
      title: 'Sem relatório disponível',
      period: 'Primeira consulta',
      status: 'Aguardando dados',
      summary: 'Os primeiros relatórios serão criados após a avaliação inicial e a definição do plano.',
      metrics: [['Anamnese', '68%'], ['Exames', '2 anexos'], ['Check-ins', 'Ainda não']],
    },
    prescription: {
      title: 'Nenhuma receita emitida',
      status: 'Avaliação inicial',
      detail: 'Prescrições somente poderão ser registradas após avaliação médica.',
      note: 'Nenhuma ação necessária neste momento.',
    },
    insight: {
      title: 'Dados insuficientes para gerar insight',
      detail: 'Concluir anamnese e consulta inicial antes de identificar padrões.',
      basis: 'A IA não deve inferir recomendações sem contexto suficiente.',
    },
    activity: [
      ['Ontem · 11:05', 'Link de anamnese aberto'],
      ['24 ago · 17:20', 'Consulta inicial confirmada'],
      ['24 ago · 17:18', 'Cadastro demonstrativo criado'],
    ],
    nextSteps: ['Concluir anamnese', 'Revisar exames anexados', 'Realizar avaliação inicial'],
  },
  {
    id: 'pac-demo-006',
    nextEncounterId: 'enc-demo-006',
    age: 42,
    initials: 'LA',
    name: 'Lucas Almeida',
    focus: 'Emagrecimento · preparação inicial',
    progress: '1 de 5 etapas',
    attention: 'Dados pendentes',
    tone: 'amber' as const,
    programSignal: 'monitor' as const,
    avatarSeed: 'lucas',
    lastContactOrder: 3,
    reportCount: '0',
    prescriptionCount: 'Não informado',
    cycle: 'Preparação inicial',
    lastContact: 'Hoje · convite aceito',
    nextConsultation: 'Após completar o preparo',
    adherence: 'Ainda não avaliada',
    report: {
      title: 'Preparação inicial incompleta',
      period: 'Ponto de partida',
      status: 'Aguardando informações',
      summary: 'Os dados básicos foram confirmados. Objetivo, medidas, medicamentos e fotos solicitadas ainda não foram informados.',
      metrics: [['Etapas', '1 de 5'], ['Medidas', 'Não informadas'], ['Check-in', 'Pendente']],
    },
    prescription: {
      title: 'Uso atual não informado',
      status: 'Aguardando resposta',
      detail: 'Lucas ainda precisa informar medicamentos atuais ou selecionar que não usa nenhum.',
      note: 'Ausência de informação não significa ausência de uso.',
    },
    insight: {
      title: 'Dados insuficientes para síntese',
      detail: 'A IA não completa lacunas nem cria interpretações antes do envio do paciente.',
      basis: 'Somente dados básicos fictícios foram recebidos.',
    },
    activity: [
      ['Hoje · 08:40', 'Convite demonstrativo aceito'],
      ['Hoje · 08:44', 'Dados básicos confirmados'],
      ['Hoje · 08:45', 'Preparação salva para continuar depois'],
    ],
    nextSteps: ['Aguardar relato inicial', 'Aguardar peso e cintura', 'Confirmar medicamentos ou não uso'],
  },
  {
    id: 'pac-demo-005',
    nextEncounterId: 'enc-demo-001',
    age: 53,
    initials: 'LB',
    name: 'Lúcia Barbosa',
    focus: 'Longevidade · energia',
    progress: '+1 ponto energia',
    attention: 'Em dia',
    tone: 'green' as const,
    programSignal: 'expected' as const,
    avatarSeed: 'lucia',
    lastContactOrder: 8,
    reportCount: '1',
    prescriptionCount: 'Nenhuma',
    cycle: 'Dia 45 de 90',
    lastContact: 'Ontem · 17:24',
    nextConsultation: 'Hoje · 09:00',
    adherence: '86%',
    report: {
      title: 'Relatório de acompanhamento',
      period: '10–24 de agosto',
      status: 'Revisado em 25 ago',
      summary: 'Mais constância nas caminhadas e energia autorrelatada estável ao longo do ciclo.',
      metrics: [['Adesão', '86%'], ['Energia', '4 de 5'], ['Passos', '6.820']],
    },
    prescription: {
      title: 'Nenhuma receita ativa',
      status: 'Sem pendências',
      detail: 'Não há documentos de prescrição vigentes neste ciclo demonstrativo.',
      note: 'O histórico permanece disponível para revisão médica.',
    },
    insight: {
      title: 'Manter o ritmo registrado',
      detail: 'A paciente relata mais energia nas semanas com caminhadas regulares.',
      basis: 'Registros demonstrativos do período; não estabelece relação causal.',
    },
    activity: [
      ['Ontem · 17:24', 'Caminhada e energia registradas'],
      ['24 ago · 08:10', 'Check-in concluído'],
      ['20 ago · 15:42', 'Relatório revisado'],
    ],
    nextSteps: ['Confirmar percepção de energia', 'Revisar rotina de caminhadas', 'Definir próximo acompanhamento'],
  },
  {
    id: 'pac-demo-007',
    nextEncounterId: 'enc-demo-007',
    age: 35,
    initials: 'FA',
    name: 'Fernanda Alves',
    focus: 'Emagrecimento · rotina',
    progress: '−1,2 kg',
    attention: 'Em dia',
    tone: 'green' as const,
    programSignal: 'expected' as const,
    avatarSeed: 'fernanda',
    lastContactOrder: 6,
    reportCount: '2',
    prescriptionCount: '1 ativa',
    cycle: 'Dia 42 de 90',
    lastContact: 'Ontem · 12:36',
    nextConsultation: '5 set · 15:30',
    adherence: '91%',
    report: {
      title: 'Relatório quinzenal',
      period: '12–26 de agosto',
      status: 'Pronto para revisão',
      summary: 'Registros de refeições e medidas foram mantidos com frequência no período demonstrativo.',
      metrics: [['Peso', '−1,2 kg'], ['Adesão', '91%'], ['Check-ins', '6 de 7']],
    },
    prescription: {
      title: 'Receita digital #RX-1060',
      status: 'Ativa',
      detail: 'Documento publicado pela equipe · validade até 4 de outubro.',
      note: 'Qualquer atualização requer revisão e publicação médica.',
    },
    insight: {
      title: 'Registros consistentes no período',
      detail: 'A frequência de respostas se manteve nas últimas duas semanas.',
      basis: 'Dados demonstrativos autorrelatados; não equivale a avaliação clínica.',
    },
    activity: [
      ['Ontem · 12:36', 'Check-in por texto concluído'],
      ['25 ago · 19:04', 'Medidas atualizadas'],
      ['23 ago · 07:42', 'Plano alimentar visualizado'],
    ],
    nextSteps: ['Revisar medidas autorrelatadas', 'Confirmar rotina sustentável', 'Manter canal para dúvidas'],
  },
  {
    id: 'pac-demo-008',
    nextEncounterId: 'enc-demo-008',
    age: 48,
    initials: 'DN',
    name: 'Diego Nunes',
    focus: 'Emagrecimento · adesão',
    progress: '4 de 9 registros',
    attention: 'Check-ins',
    tone: 'rose' as const,
    programSignal: 'review' as const,
    avatarSeed: 'diego',
    lastContactOrder: 4,
    reportCount: '1',
    prescriptionCount: '1 ativa',
    cycle: 'Dia 37 de 90',
    lastContact: 'Hoje · 08:44',
    nextConsultation: '6 set · 10:00',
    adherence: '44%',
    report: {
      title: 'Resumo de acompanhamento',
      period: '18–26 de agosto',
      status: 'Aguardando revisão',
      summary: 'Houve redução na frequência de check-ins e no registro de refeições durante o período demonstrativo.',
      metrics: [['Adesão', '44%'], ['Check-ins', '4 de 9'], ['Registros', '3 ausentes']],
    },
    prescription: {
      title: 'Receita digital #RX-1063',
      status: 'Ativa',
      detail: '1 item prescrito · documento acessível à paciente.',
      note: 'O sinal de acompanhamento não altera a orientação publicada.',
    },
    insight: {
      title: 'Retomar contexto antes de qualquer ajuste',
      detail: 'A queda de registros pede conversa humana para entender barreiras relatadas.',
      basis: 'Sinal operacional demonstrativo; não é diagnóstico nem decisão de conduta.',
    },
    activity: [
      ['Hoje · 08:44', 'Check-in breve enviado'],
      ['23 ago · 21:10', 'Registro não concluído'],
      ['20 ago · 18:22', 'Mensagem recebida'],
    ],
    nextSteps: ['Ler o relato mais recente', 'Confirmar barreiras da rotina', 'Decidir próximo passo na consulta'],
  },
  {
    id: 'pac-demo-009',
    nextEncounterId: 'enc-demo-009',
    age: 41,
    initials: 'CT',
    name: 'Camila Torres',
    focus: 'Saúde metabólica · movimento',
    progress: '+1.600 passos',
    attention: 'Em dia',
    tone: 'green' as const,
    programSignal: 'expected' as const,
    avatarSeed: 'camila',
    lastContactOrder: 9,
    reportCount: '2',
    prescriptionCount: 'Nenhuma',
    cycle: 'Dia 58 de 90',
    lastContact: 'Anteontem · 18:05',
    nextConsultation: '9 set · 11:30',
    adherence: '84%',
    report: {
      title: 'Relatório mensal',
      period: '27 jul–26 ago',
      status: 'Revisado em 27 ago',
      summary: 'A frequência de movimento registrada aumentou no ciclo demonstrativo, sem alteração automática do plano.',
      metrics: [['Passos', '+1.600'], ['Adesão', '84%'], ['Check-ins', '8 de 9']],
    },
    prescription: {
      title: 'Nenhuma receita ativa',
      status: 'Sem pendências',
      detail: 'Não há documentos de prescrição vigentes no acompanhamento demonstrativo.',
      note: 'O histórico de orientações permanece acessível para a equipe.',
    },
    insight: {
      title: 'Movimento mais frequente registrado',
      detail: 'Os registros de passos foram mais recorrentes no fim do ciclo.',
      basis: 'Fonte demonstrativa de dispositivo; precisa de conferência humana.',
    },
    activity: [
      ['Anteontem · 18:05', 'Atividade sincronizada'],
      ['25 ago · 07:18', 'Check-in concluído'],
      ['21 ago · 13:50', 'Relatório publicado'],
    ],
    nextSteps: ['Confirmar como a rotina está sendo vivida', 'Revisar dados do dispositivo', 'Planejar nova conversa'],
  },
  {
    id: 'pac-demo-010',
    nextEncounterId: 'enc-demo-010',
    age: 58,
    initials: 'BA',
    name: 'Bruno Azevedo',
    focus: 'Longevidade · sono',
    progress: '6h18 sono',
    attention: 'Sono',
    tone: 'amber' as const,
    programSignal: 'monitor' as const,
    avatarSeed: 'bruno',
    lastContactOrder: 10,
    reportCount: '1',
    prescriptionCount: '1 ativa',
    cycle: 'Dia 66 de 90',
    lastContact: '26 ago · 20:10',
    nextConsultation: '10 set · 09:30',
    adherence: '76%',
    report: {
      title: 'Relatório de sono',
      period: '12–26 de agosto',
      status: 'Pronto para revisão',
      summary: 'O paciente registrou variação de sono em parte das noites; o dado segue disponível para conversa e revisão médica.',
      metrics: [['Sono médio', '6h18'], ['Adesão', '76%'], ['Check-ins', '5 de 7']],
    },
    prescription: {
      title: 'Receita digital #RX-1068',
      status: 'Ativa',
      detail: '1 item prescrito · validade até 12 de outubro.',
      note: 'A observação de sono não altera automaticamente a receita.',
    },
    insight: {
      title: 'Revisar regularidade do sono',
      detail: 'O paciente relatou horários irregulares em alguns dias do ciclo demonstrativo.',
      basis: 'Autorrelato e dados demonstrativos; não define causa ou diagnóstico.',
    },
    activity: [
      ['26 ago · 20:10', 'Relato de sono enviado'],
      ['24 ago · 07:05', 'Check-in concluído'],
      ['19 ago · 16:18', 'Receita visualizada'],
    ],
    nextSteps: ['Confirmar horário de sono', 'Revisar relato original', 'Decidir o foco do retorno'],
  },
];

export default function DoctorWorkspace({
  initialView = 'Visão geral',
  patientId = DEFAULT_PATIENT_ID,
  encounterId,
  routeMode = 'workspace',
  patientDetail = false,
}: {
  initialView?: DoctorView;
  patientId?: string;
  encounterId?: string;
  routeMode?: ClinicalRouteMode;
  patientDetail?: boolean;
}) {
  const router = useRouter();
  const view = initialView;
  const nextSidebarAppointment = appointments.find((appointment) => appointment.status === 'Próxima') ?? appointments[0];
  const { hydrated, latestSubmission, latestCheckIn } = useCareDemo(patientId, encounterId ?? getDefaultEncounterId(patientId));
  const { latestSubmission: nextSidebarSubmission } = useCareDemo(
    nextSidebarAppointment.patientId,
    nextSidebarAppointment.encounterId,
  );
  const [selectedAlert, setSelectedAlert] = useState<(typeof alerts)[number] | null>(null);
  const [demoUi, setDemoUi, demoUiHydrated] = useSessionDemoState(
    'instituto-vivans-demo-ui-v1:doctor',
    initialDoctorDemoUiState,
    normalizeDoctorDemoUiState,
  );
  const [toast, setToast] = useState('');
  const approved = demoUi.reportApproved;
  const activeAppointment = routeMode === 'workspace'
    ? null
    : appointments.find((appointment) => appointment.patientId === patientId && appointment.encounterId === encounterId) ?? null;

  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 3200);
  };

  const openPreparation = (appointment: Appointment) => {
    router.push(getPreConsultationHref(appointment.patientId, appointment.encounterId));
  };

  const closeClinicalWorkspace = (appointment: Appointment) => {
    router.replace(getPatientDossierHref(appointment.patientId));
  };

  if (!hydrated || !demoUiHydrated) {
    return (
      <main id="main-content" className="mx-auto max-w-[1540px] px-4 py-10 sm:px-6 lg:px-9">
        <div className="rounded-3xl border border-[#dbe4f0] bg-white p-6 text-sm text-[#5b6d88]">Carregando o contexto demonstrativo com segurança...</div>
      </main>
    );
  }

  return (
    <>
      <div id="doctor-workspace-content" className="grid min-h-[calc(100dvh-var(--doctor-chrome-expanded-height))] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="doctor-sticky-offset vivance-sidebar-surface sticky top-[var(--doctor-chrome-current-height)] hidden h-[calc(100dvh-var(--doctor-chrome-current-height))] flex-col self-start overflow-y-auto px-4 py-5 text-white lg:flex">
          <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4" aria-label="Perfil profissional demonstrativo">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#c4d8f4] text-xs font-extrabold text-[#03132d] ring-2 ring-white/20">GM</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">Dr. Guilherme Martins</p>
                <p className="mt-0.5 text-xs text-[#b9cce5]">Médico · perfil demonstrativo</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
              <div><p className="text-[#9fb8d8]">CRM/SP</p><p className="mt-1 font-semibold text-white">184.920</p></div>
              <div><p className="text-[#9fb8d8]">Hoje</p><p className="mt-1 font-semibold text-white">5 consultas</p></div>
            </div>
          </section>

          <nav aria-label="Navegação lateral do médico" className="mt-5 space-y-1">
            {doctorNavigation.map((item) => {
              const Icon = sidebarNavigationIcons[item.label];
              const active = item.label === view;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df]',
                    active ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]' : 'text-[#cad9eb] hover:bg-white/8 hover:text-white',
                  )}
                >
                  <Icon aria-hidden="true" size={19} weight={active ? 'fill' : 'regular'} />
                  {item.label === 'Visão geral' ? 'Hoje' : item.label}
                </Link>
              );
            })}
          </nav>

          <section className="vivance-glass-menu mt-5 rounded-2xl p-4" aria-label="Próxima consulta na agenda">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#a9c8ee]">
                <Clock aria-hidden="true" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#a9bdd8]">Próxima consulta</p>
                <p className="mt-1 text-sm font-bold tabular-nums text-white">{nextSidebarAppointment.time}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-[#dfe9f7]">{nextSidebarAppointment.patient}</p>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <span className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                nextSidebarSubmission ? 'bg-[#dce9f8] text-[#124da0]' : 'bg-[#fff0ca] text-[#77500a]',
              )}>
                {nextSidebarSubmission ? 'Pré-consulta recebida' : 'Pré-consulta pendente'}
              </span>
            </div>
            <Link
              href={getPreConsultationHref(nextSidebarAppointment.patientId, nextSidebarAppointment.encounterId)}
              className="mt-3 flex min-h-11 items-center justify-between rounded-xl bg-white px-3.5 text-xs font-bold text-[#03132d] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]"
            >
              Preparar consulta
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>

          <LogoutButton className="vivance-glass-menu mt-auto min-h-[54px] w-full justify-start text-[#dfe9f7] hover:border-[#557fb5] hover:bg-[#0b326c] hover:text-white" />
        </aside>

        <main id="main-content" className="min-w-0 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8 xl:px-9">
          {view === 'Visão geral' && (
            <VivanceDoctorDashboard
              appointments={appointments}
              attentionItems={alerts}
              hasPreConsultation={Boolean(latestSubmission)}
              examReminderSent={demoUi.examReminderSent}
              onStartConsultation={(selectedPatientId, selectedEncounterId) => router.push(getConsultationHref(selectedPatientId, selectedEncounterId))}
              onOpenPreparation={(selectedPatientId, selectedEncounterId) => router.push(getPreConsultationHref(selectedPatientId, selectedEncounterId))}
              onOpenAttention={(patient) => {
                const item = alerts.find((alert) => alert.patient === patient);
                if (item) setSelectedAlert(item);
              }}
              onSendExamReminder={() => {
                setDemoUi((current) => ({ ...current, examReminderSent: true }));
                notify('Lembrete demonstrativo enviado para o envio dos exames já solicitados.');
              }}
            />
          )}
          {view === 'Agenda' && <Agenda onOpenAppointment={openPreparation} onNotify={notify} />}
          {view === 'Pacientes' && (
            <Patients
              patientId={patientId}
              patientDetail={patientDetail}
              hasLiveCheckIn={Boolean(latestCheckIn)}
              onSelectPatient={(selectedPatientId) => router.push(getPatientDossierHref(selectedPatientId))}
              onStartConsultation={(selectedPatientId, selectedEncounterId) => router.push(getConsultationHref(selectedPatientId, selectedEncounterId))}
              onOpenPreparation={(selectedPatientId, selectedEncounterId) => router.push(getPreConsultationHref(selectedPatientId, selectedEncounterId))}
              onMessage={(selectedPatientId) => router.push(getPatientMessagesHref(selectedPatientId))}
              onNotify={notify}
            />
          )}
          {view === 'Mensagens' && <Messages patientId={patientId} onNotify={notify} />}
          {view === 'Relatórios' && (
            <Reports
              approved={approved}
              onApprove={() => {
                setDemoUi((current) => ({ ...current, reportApproved: true }));
                notify('Relatório aprovado e disponibilizado para Marina.');
              }}
            />
          )}
          {view === 'Central da IA' && <DoctorAiControlCenter />}
        </main>
      </div>

      {activeAppointment && (
        <Consultation
          key={`${activeAppointment.encounterId}-${routeMode}`}
          appointment={activeAppointment}
          initialStep={routeMode === 'consultation' ? 'consulta' : 'preparo'}
          onNotify={notify}
          onClose={() => closeClinicalWorkspace(activeAppointment)}
          onComplete={() => {
            const patientName = activeAppointment.patient;
            notify(`Consulta de ${patientName} concluída. O plano só chega à paciente se uma versão for publicada.`);
            closeClinicalWorkspace(activeAppointment);
          }}
        />
      )}
      {selectedAlert && (
        <AlertDrawer
          item={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={() => {
            setSelectedAlert(null);
            notify('Item marcado como revisado.');
          }}
        />
      )}
      <Toast text={toast} />
    </>
  );
}

export function LegacyOverview({
  onOpenAppointment,
  onOpenPreparation,
  onPatient,
  onAlert,
  onReports,
}: {
  onOpenAppointment: (appointment: Appointment) => void;
  onOpenPreparation: (appointment: Appointment) => void;
  onPatient: (patientId: string) => void;
  onAlert: (item: (typeof alerts)[number]) => void;
  onReports: () => void;
}) {
  const { latestSubmission, activeReview } = useCareDemo();
  const reviewLabel = !latestSubmission
    ? 'Pré-consulta pendente'
    : activeReview?.status === 'approved'
      ? `Preparo aprovado · v${activeReview.version}`
      : activeReview?.status === 'rejected'
        ? `Rascunho rejeitado · v${activeReview.version}`
        : activeReview?.status === 'draft'
          ? `Revisão em andamento · v${activeReview.version}`
          : 'Aguardando revisão médica';
  const reviewTone = !latestSubmission || activeReview?.status === 'draft'
    ? 'amber'
    : activeReview?.status === 'approved'
      ? 'green'
      : activeReview?.status === 'rejected'
        ? 'rose'
        : 'blue';
  const reviewAction = !latestSubmission
    ? 'Pré-consulta ainda pendente'
    : activeReview?.status === 'approved'
      ? 'Ver preparo aprovado'
      : activeReview?.status === 'draft'
        ? 'Continuar revisão médica'
        : activeReview?.status === 'rejected'
          ? 'Criar nova versão'
          : 'Iniciar revisão médica';
  const preparationChecklist = !latestSubmission
    ? ['Aguardar a pré-consulta', 'Confirmar o objetivo durante a consulta', 'Registrar o contexto manualmente']
    : activeReview?.status === 'approved'
      ? ['Ler o preparo aprovado', 'Confirmar o contexto com a paciente', 'Registrar decisões da consulta']
      : activeReview?.status === 'rejected'
        ? ['Preservar o relato original', 'Criar uma preparação manual', 'Registrar decisões da consulta']
        : ['Ler o relato original da paciente', 'Revisar ou rejeitar o rascunho', 'Registrar dúvidas para a consulta'];
  const summaryCards = [
    { label: 'Consultas hoje', value: '5', detail: 'Próxima às 10:30', action: 'Ver agenda do dia', target: 'agenda-do-dia', dot: 'bg-[#3da58f]' },
    { label: 'Precisam de atenção', value: '3', detail: '1 novo sintoma relatado', action: 'Ver prioridades', target: 'atencao-do-dia', dot: 'bg-[#e49d45]' },
    { label: 'Relatórios pendentes', value: '4', detail: '2 prontos para revisar', action: 'Ver fila de revisão', target: 'relatorios-do-dia', dot: 'bg-[#6997d4]' },
  ];
  const reportQueue = [
    ['Ana Ribeiro', 'Relatório mensal', 'Pronto para aprovação', 'blue'] as const,
    ['Marina Costa', 'Relatório quinzenal', '2 observações para revisar', 'amber'] as const,
    ['Paulo Mendes', 'Relatório semanal', 'Aguardando decisão sobre sintoma', 'rose'] as const,
    ['Lúcia Barbosa', 'Resumo pós-consulta', 'Rascunho criado hoje', 'gray'] as const,
  ];
  const scrollTo = (target: string) => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const nextAppointment = appointments[1];
  const waitingRoomContext = latestSubmission
    ? 'Pré-consulta concluída · contexto pronto para revisão médica'
    : 'Pré-consulta pendente · o atendimento manual continua disponível';

  return (
    <>
      <section aria-labelledby="doctor-welcome-title" className="relative overflow-hidden rounded-[34px] border border-[#e5ded2] bg-[#fffefa] px-5 py-6 shadow-[0_20px_60px_rgba(42,62,54,0.07)] sm:px-7 sm:py-8 xl:px-9 xl:py-10">
        <div aria-hidden="true" className="absolute -right-24 -top-28 size-72 rounded-full border-[40px] border-[#edf4f0] opacity-70" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#e7efea] px-4 text-xs font-bold text-[#2e6253] sm:text-sm">
              <SparklesIcon />
              Painel do dia
            </span>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#bdd2c8] bg-[#f2f8f5] px-4 text-xs font-semibold text-[#2e6253] shadow-[0_2px_5px_rgba(46,98,83,0.08)] sm:text-sm">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#328568]" />
              Carteira ativa · 22 pacientes
            </span>
            <Status tone="amber">Dados demonstrativos</Status>
          </div>

          <h1 id="doctor-welcome-title" className="font-editorial mt-6 max-w-5xl text-[2rem] font-semibold leading-[1.04] tracking-[-0.045em] text-[#1f2824] sm:text-[2.2rem]">
            Bem-vindo, Dr. Guilherme Martins
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-[#606b66] sm:text-lg sm:leading-8">
            Hoje você tem <strong className="font-bold text-[#2e6253]">5 consultas agendadas</strong>.{' '}
            {latestSubmission ? (
              <>A paciente <strong className="text-[#232a27]">Marina Costa</strong> enviou a pré-consulta e aguarda na sala virtual.</>
            ) : (
              <>A paciente <strong className="text-[#232a27]">Marina Costa</strong> já aguarda na sala virtual; a pré-consulta ainda está pendente.</>
            )}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => onOpenAppointment(nextAppointment)} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-[#2e6253] px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(46,98,83,0.2)] transition-colors duration-200 hover:bg-[#244d42] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#70aa97] focus-visible:ring-offset-2 sm:min-h-14 sm:px-6 sm:text-base">
              <VideoIcon />
              Iniciar consulta online
            </button>
            <Link href="/medico/agenda" className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-[#ded7cb] bg-[#faf8f4] px-5 text-sm font-bold text-[#29332f] transition-colors duration-200 hover:border-[#b8ccc3] hover:bg-[#f2f5f2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#70aa97] focus-visible:ring-offset-2 sm:min-h-14 sm:px-6 sm:text-base">
              <CalendarIcon className="size-5 text-[#2e6253]" />
              Ver agenda do dia
            </Link>
          </div>

          <section aria-labelledby="virtual-waiting-room-title" className="mt-8 rounded-[26px] border border-[#bfd4ca] bg-[#e9f1ed] p-4 shadow-[0_6px_18px_rgba(46,98,83,0.07)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#2e6253]">
                <span className="grid size-9 place-items-center rounded-full bg-white/75">
                  <BroadcastIcon className="size-4" />
                </span>
                <h2 id="virtual-waiting-room-title" className="text-xs font-extrabold uppercase tracking-[0.12em] sm:text-sm">Sala de espera virtual</h2>
              </div>
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#bdd2c8] bg-white px-3 text-xs font-bold text-[#2e6253]">
                <span aria-hidden="true" className="size-2 rounded-full bg-[#328568]" />
                1 paciente online
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-4 rounded-[20px] border border-[#bfd4ca] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#dbeae4] text-sm font-extrabold text-[#2e6253]">MC</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[#202824]">Marina Costa</h3>
                    <Status tone={latestSubmission ? 'green' : 'amber'}>{latestSubmission ? 'Pré-consulta recebida' : 'Pré-consulta pendente'}</Status>
                  </div>
                  <p className="mt-1 text-sm text-[#65706b]">Aguardando há 4 min · consulta das 10:30</p>
                  <p className="mt-1 text-xs font-medium text-[#557067]">{waitingRoomContext}</p>
                </div>
              </div>
              <button type="button" onClick={() => onOpenAppointment(nextAppointment)} aria-label="Atender Marina Costa agora" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#2e6253] px-5 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#244d42] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#70aa97] focus-visible:ring-offset-2">
                Atender agora
                <ArrowRightIcon />
              </button>
            </div>
          </section>
        </div>
      </section>

      <section aria-label="Resumo do dia" className="mt-8 grid gap-4 sm:grid-cols-3">
        {summaryCards.map((item) => (
          <button type="button" key={item.label} aria-controls={item.target} onClick={() => scrollTo(item.target)} className="group cursor-pointer rounded-[24px] border border-[#e4dfd6] bg-[#fffefa] p-5 text-left shadow-[0_8px_28px_rgba(42,62,54,0.045)] transition-colors duration-200 hover:border-[#aac9bc] hover:bg-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#70aa97] focus-visible:ring-offset-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#66726d]">{item.label}</p>
              <span aria-hidden="true" className={cn('size-2.5 rounded-full', item.dot)} />
            </div>
            <p className="font-editorial mt-3 text-4xl font-semibold leading-none tracking-[-0.04em] text-[#26312d]">{item.value}</p>
            <p className="mt-2 text-xs font-medium text-[#78847f]">{item.detail}</p>
            <p className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#2e6253] group-hover:underline group-hover:underline-offset-4">{item.action}<ArrowRightIcon className="size-3.5" /></p>
          </button>
        ))}
      </section>

      <DayAgendaTimeline onOpenAppointment={onOpenPreparation} />

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <article className="overflow-hidden rounded-3xl border border-[#dbe4f0] bg-white shadow-[0_10px_35px_rgba(28,55,47,0.05)]">
          <div className="flex items-center justify-between border-b border-[#eef2f8] px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0b7b68]">Próxima consulta</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Marina Costa</h2>
            </div>
            <Status>10:30</Status>
          </div>
          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_220px]">
            <div>
              <div className="flex flex-wrap gap-2">
                {['Emagrecimento', 'Saúde do sono', 'Retorno 30 dias'].map((tag) => <Status key={tag} tone="gray">{tag}</Status>)}
                <Status tone={reviewTone}>{reviewLabel}</Status>
              </div>
              <div className="mt-6 rounded-2xl border border-[#b9d8cf] bg-[#eaf2ff] p-4">
                <ClinicalLayerBadge layer="relato" />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Objetivo nas palavras da paciente</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#071a3a]">{latestSubmission ? `“${latestSubmission.objective}”` : 'Nenhuma pré-consulta foi enviada nesta sessão demonstrativa.'}</p>
                <p className="mt-2 text-xs text-[#5b6d88]">{latestSubmission ? `Versão ${latestSubmission.version} · enviada em ${latestSubmission.submittedAt} · ciência registrada` : 'O atendimento pode continuar manualmente, sem bloquear a consulta.'}</p>
              </div>
              <h3 className="mt-5 text-sm font-bold">Organização para revisão médica</h3>
              {activeReview ? (
                <div className={cn('mt-3 rounded-2xl border p-4', activeReview.status === 'approved' ? 'border-[#b9d8cf] bg-[#eaf2ff]' : activeReview.status === 'rejected' ? 'border-[#e4beb9] bg-[#fdf0ef]' : 'border-[#c9d8ec] bg-[#f7f9fc]')}>
                  <Status tone={activeReview.status === 'approved' ? 'green' : activeReview.status === 'rejected' ? 'rose' : 'amber'}>
                    {activeReview.status === 'approved' ? 'Aprovado para a consulta' : activeReview.status === 'rejected' ? 'Rascunho rejeitado' : 'Rascunho em revisão'}
                  </Status>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#5b6d88]">{activeReview.content}</p>
                  <p className="mt-3 text-xs text-[#5b6d88]">Versão de revisão {activeReview.version} · atualizada em {activeReview.updatedAt}</p>
                </div>
              ) : latestSubmission?.structuredDraft ? (
                <div className="mt-3 rounded-2xl border border-[#c9d8ec] bg-[#f7f9fc] p-4">
                  <AiDraftBadge />
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#5b6d88]">{latestSubmission.structuredDraft}</p>
                </div>
              ) : (
                <div className="mt-3"><SimulationDisclaimer>{latestSubmission ? 'A paciente não autorizou a organização assistida. Revise o relato original e prepare a consulta manualmente.' : 'Envie ou aguarde a pré-consulta. Nenhum rascunho será criado sem fonte original.'}</SimulationDisclaimer></div>
              )}
              {latestSubmission && (
                <details className="mt-4 rounded-2xl border border-[#dbe4f0] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-bold text-[#124da0]">Ver todas as respostas originais</summary>
                  <dl className="mt-4 space-y-4 text-sm leading-6 text-[#5b6d88]">
                    <div><dt className="font-bold text-[#071a3a]">Mudanças recentes</dt><dd className="mt-1 whitespace-pre-wrap">{latestSubmission.changes}</dd></div>
                    <div><dt className="font-bold text-[#071a3a]">Dúvidas</dt><dd className="mt-1 whitespace-pre-wrap">{latestSubmission.questions || 'Não informado.'}</dd></div>
                    <div><dt className="font-bold text-[#071a3a]">Contexto adicional</dt><dd className="mt-1 whitespace-pre-wrap">{latestSubmission.additionalContext || 'Não informado.'}</dd></div>
                  </dl>
                </details>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" disabled={!latestSubmission} onClick={() => onOpenPreparation(appointments[1])} className="min-h-11 cursor-pointer rounded-xl bg-[#082553] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0f2d26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#91a59f]">{reviewAction}</button>
                <button type="button" onClick={() => onPatient(DEFAULT_PATIENT_ID)} className="min-h-11 cursor-pointer px-2 text-sm font-bold text-[#0b7b68] underline decoration-[#9ccdc2] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Ver prontuário completo</button>
              </div>
            </div>
            <div className="rounded-2xl bg-[#f4f7fd] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#5b6d88]">Antes da consulta</p>
              <ol className="mt-4 space-y-3 text-sm text-[#405675]">
                {preparationChecklist.map((item, index) => <li key={item}><strong className="mr-2 text-[#0b7b68]">{String(index + 1).padStart(2, '0')}</strong>{item}</li>)}
              </ol>
            </div>
          </div>
        </article>

        <article id="atencao-do-dia" className="scroll-mt-24 rounded-3xl border border-[#dbe4f0] bg-white p-5 shadow-[0_10px_35px_rgba(28,55,47,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b46a15]">Caixa por exceção</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Quem precisa de você</h2>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-[#fff0dc] text-sm font-bold text-[#9b5e16]">3</span>
          </div>
          <div className="mt-5 divide-y divide-[#e7eeea]">
            {alerts.map((item) => (
              <button type="button" key={item.patient} onClick={() => onAlert(item)} className="group min-h-20 w-full cursor-pointer py-4 text-left first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">
                <span className="flex items-start gap-3">
                  <span aria-hidden="true" className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', item.tone === 'amber' ? 'bg-[#e49d45]' : item.tone === 'rose' ? 'bg-[#db766f]' : 'bg-[#6997d4]')} />
                  <span className="min-w-0">
                    <strong className="block text-sm group-hover:text-[#0b7b68]">{item.patient}</strong>
                    <span className="mt-1 block text-xs leading-5 text-[#5b6d88]">{item.detail}</span>
                    <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#5b6d88]">{item.tag}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section id="relatorios-do-dia" className="mt-6 scroll-mt-24 overflow-hidden rounded-3xl border border-[#dbe4f0] bg-white shadow-[0_10px_35px_rgba(28,55,47,0.05)]">
        <div className="flex flex-col gap-3 border-b border-[#eef2f8] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5578a9]">Fila de revisão</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">4 relatórios pendentes</h2></div>
          <button type="button" onClick={onReports} className="min-h-11 cursor-pointer rounded-xl border border-[#c9d8ec] bg-white px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#eaf2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Abrir central de relatórios</button>
        </div>
        <div className="divide-y divide-[#e7eeea]">
          {reportQueue.map((report) => (
            <button type="button" key={report[0]} onClick={onReports} className="grid min-h-20 w-full cursor-pointer gap-2 px-5 py-4 text-left transition-colors hover:bg-[#f4f7fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0] sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:px-6">
              <div><strong className="text-sm text-[#071a3a]">{report[0]}</strong><p className="mt-1 text-xs text-[#5b6d88]">{report[1]}</p></div>
              <Status tone={report[3]}>{report[2]}</Status>
              <span className="text-xs font-bold text-[#124da0]">Revisar →</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function DayAgendaTimeline({ onOpenAppointment }: { onOpenAppointment: (appointment: Appointment) => void }) {
  return (
    <section id="agenda-do-dia" className="vivance-panel mt-6 scroll-mt-24 overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-3 border-b border-[#eef2f8] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Agenda aberta</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#071a3a]">Hoje, consulta por consulta</h2><p className="mt-1 text-xs text-[#5b6d88]">Toque em um nome para abrir a pré-consulta daquele paciente.</p></div>
        <Status tone="blue">5 consultas</Status>
      </div>
      <div className="px-2 py-2 sm:px-4 sm:py-3">
        {appointments.map((appointment, index) => {
          const isNext = appointment.status === 'Próxima';
          return (
            <button type="button" key={`${appointment.time}-${appointment.patient}`} onClick={() => onOpenAppointment(appointment)} aria-label={`Abrir pré-consulta de ${appointment.patient}, às ${appointment.time}`} className={cn('group grid min-h-20 w-full cursor-pointer grid-cols-[52px_22px_minmax(0,1fr)] items-stretch gap-2 rounded-2xl px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 sm:grid-cols-[64px_24px_minmax(0,1fr)_auto] sm:gap-3 sm:px-3', isNext ? 'bg-[#eaf2ff] ring-1 ring-inset ring-[#cdddf5]' : 'hover:bg-[#f4f7fd]')}>
              <time className={cn('pt-1 text-sm font-bold tabular-nums', isNext ? 'text-[#124da0]' : 'text-[#5b6d88]')}>{appointment.time}</time>
              <span aria-hidden="true" className="relative flex justify-center">
                {index < appointments.length - 1 && <span className="vivance-rail-line absolute bottom-[-28px] top-4 w-px" />}
                <span className={cn('relative mt-1 size-3 rounded-full border-2', isNext ? 'border-[#124da0] bg-[#9dc0ee]' : appointment.status === 'Concluída' ? 'border-[#aebdd2] bg-[#dbe4f0]' : 'border-[#9dc0ee] bg-white')} />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#071a3a] group-hover:text-[#124da0]">{appointment.patient}</strong>{isNext && <span className="rounded-full bg-gradient-to-br from-[#03132d] to-[#082553] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white">Próxima</span>}</span>
                <span className="mt-1 block text-xs text-[#5b6d88]">{appointment.type}</span>
                <span className={cn('mt-2 block text-[11px] font-bold', appointment.preVisitTone === 'rose' ? 'text-[#9c453f]' : appointment.preVisitTone === 'amber' ? 'text-[#8a5b09]' : appointment.preVisitTone === 'blue' ? 'text-[#124da0]' : 'text-[#0b7b68]')}>{appointment.preVisit}</span>
              </span>
              <span className="hidden items-center gap-3 sm:flex"><Status tone={appointment.statusTone}>{appointment.status}</Status><span className="text-xs font-bold text-[#124da0] transition-transform group-hover:translate-x-0.5">Abrir preparo →</span></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Agenda({ onOpenAppointment, onNotify }: { onOpenAppointment: (appointment: Appointment) => void; onNotify: (text: string) => void }) {
  return (
    <>
      <Heading
        eyebrow="Agenda integrada"
        title="Consultas de hoje"
        description="Encontros, contexto clínico e sala de vídeo reunidos em um único fluxo."
        action={<button type="button" onClick={() => onNotify('Novo agendamento demonstrativo iniciado.')} className="min-h-11 cursor-pointer rounded-xl border border-[#c9d8ec] bg-white px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#eaf2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Novo agendamento</button>}
      />
      <DayAgendaTimeline onOpenAppointment={onOpenAppointment} />
    </>
  );
}

function Patients({
  patientId,
  patientDetail,
  hasLiveCheckIn,
  onSelectPatient,
  onStartConsultation,
  onOpenPreparation,
  onMessage,
  onNotify,
}: {
  patientId: string;
  patientDetail: boolean;
  hasLiveCheckIn: boolean;
  onSelectPatient: (patientId: string) => void;
  onStartConsultation: (patientId: string, encounterId: string) => void;
  onOpenPreparation: (patientId: string, encounterId: string) => void;
  onMessage: (patientId: string) => void;
  onNotify: (text: string) => void;
}) {
  const selected = patients.find((patient) => patient.id === patientId) ?? null;

  if (!selected) {
    return (
      <>
        <Heading eyebrow="Carteira ativa" title="Histórico não disponível" description="Este atendimento de exemplo existe na agenda, mas ainda não possui um histórico preenchido." />
        <section className="mt-7 rounded-3xl border border-[#dbe4f0] bg-white p-6">
          <Status tone="gray">Dados demonstrativos</Status>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5b6d88]">Nenhum dado de outra pessoa foi usado como alternativa. Volte à agenda para escolher um atendimento disponível.</p>
          <Link href="/medico/agenda" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#082553] px-5 text-sm font-bold text-white">Voltar à agenda</Link>
        </section>
      </>
    );
  }

  if (!patientDetail) {
    return <PatientCohort patients={patients} onSelectPatient={onSelectPatient} />;
  }

  return (
    <PatientLongitudinalWorkspace
      patient={selected}
      patients={patients}
      hasLiveCheckIn={hasLiveCheckIn}
      onSelectPatient={onSelectPatient}
      onStartConsultation={onStartConsultation}
      onOpenPreparation={onOpenPreparation}
      onMessage={onMessage}
      onNotify={onNotify}
    />
  );
}

type MessageThread = {
  patient: PatientWorkspaceProfile;
  preview: string;
  time: string;
  context: string;
  incoming: string;
  outgoing: string;
};

const messageThreadCopy: Record<string, Omit<MessageThread, 'patient'>> = {
  'pac-demo-001': { preview: 'Consegui registrar o jantar.', time: '09:18', context: 'Plano iniciado há 29 dias', incoming: 'Consegui registrar o jantar. Também dormi melhor esta noite.', outgoing: 'Ótimo, Marina. Vou revisar seus registros antes da nossa consulta.' },
  'pac-demo-002': { preview: 'Obrigada, doutor.', time: 'Ontem', context: 'Ciclo de força · dia 61', incoming: 'A rotina pela manhã ficou mais fácil de manter nesta semana demonstrativa.', outgoing: 'Obrigado por registrar, Ana. Vamos revisar esse relato na próxima consulta.' },
  'pac-demo-003': { preview: 'Estou sentindo enjoo hoje.', time: '08:12', context: 'Acompanhamento · dia 18', incoming: 'Estou sentindo enjoo hoje e preferi registrar antes de seguir com a rotina.', outgoing: 'Obrigado por avisar, Paulo. Vou revisar seu relato antes de qualquer orientação.' },
  'pac-demo-004': { preview: 'Vou concluir a anamnese.', time: 'Ontem', context: 'Avaliação inicial', incoming: 'Vou concluir a anamnese e conferir os exames antes da consulta.', outgoing: 'Perfeito, Rafael. Se algum campo gerar dúvida, deixe registrado para conversarmos.' },
  'pac-demo-005': { preview: 'Registrei as caminhadas.', time: 'Ontem', context: 'Energia e movimento · dia 45', incoming: 'Registrei quatro caminhadas no período demonstrativo e minha energia pareceu estável.', outgoing: 'Obrigada por registrar, Lúcia. Vamos usar seu relato como contexto na próxima conversa.' },
  'pac-demo-006': { preview: 'Ainda vou completar os dados.', time: 'Hoje', context: 'Preparação inicial', incoming: 'Ainda vou completar os dados de medidas e medicamentos solicitados no mock.', outgoing: 'Sem problema, Lucas. Registre apenas o que conseguir; a equipe confere na consulta.' },
  'pac-demo-007': { preview: 'Atualizei minhas medidas.', time: 'Ontem', context: 'Rotina · dia 42', incoming: 'Atualizei as medidas e mantive os registros de refeições nesta semana demonstrativa.', outgoing: 'Recebi, Fernanda. A equipe revisa as fontes originais antes de qualquer ajuste.' },
  'pac-demo-008': { preview: 'Tive dificuldade nos check-ins.', time: 'Hoje', context: 'Adesão · dia 37', incoming: 'Tive dificuldade para responder todos os check-ins no período demonstrativo.', outgoing: 'Obrigado por contar, Diego. Vamos entender o contexto antes de decidir qualquer próximo passo.' },
  'pac-demo-009': { preview: 'Os passos ficaram mais frequentes.', time: 'Anteontem', context: 'Movimento · dia 58', incoming: 'Os passos ficaram mais frequentes no fim da semana demonstrativa.', outgoing: 'Recebi, Camila. Vamos revisar os registros e conversar sobre a rotina no retorno.' },
  'pac-demo-010': { preview: 'Meu horário de sono variou.', time: '26 ago', context: 'Sono · dia 66', incoming: 'Meu horário de sono variou em alguns dias do período demonstrativo.', outgoing: 'Obrigado por registrar, Bruno. O relato ficará disponível para revisão humana na consulta.' },
};

const messageThreads: MessageThread[] = patients.map((patient) => ({
  patient,
  ...messageThreadCopy[patient.id],
}));

function Messages({ patientId, onNotify }: { patientId: string; onNotify: (text: string) => void }) {
  const [value, setValue] = useState('');
  const [context, setContext] = useState<CareConversationContext>('care-plan');
  const [query, setQuery] = useState('');
  const encounterId = getDefaultEncounterId(patientId);
  const sessionConversation = useCareDemo(patientId, encounterId);
  const isSharedAccount = patientId === DEFAULT_PATIENT_ID;
  const persistentConversation = usePersistentConversation({
    patientId,
    encounterId,
    sender: 'doctor',
    enabled: isSharedAccount,
  });
  const conversationMessages = isSharedAccount
    ? persistentConversation.messages
    : sessionConversation.conversationMessages;
  const selected = messageThreads.find((thread) => thread.patient.id === patientId) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const visibleThreads = messageThreads.filter((thread) => `${thread.patient.name} ${thread.context} ${thread.preview}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery));
  const trimmedValue = value.trim();
  const canSend = trimmedValue.length >= 2;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !canSend) return;
    try {
      if (isSharedAccount) {
        await persistentConversation.sendMessage({ body: trimmedValue, context });
      } else {
        sessionConversation.sendConversationMessage('doctor', { body: trimmedValue, context });
      }
      setValue('');
      onNotify(`Mensagem sobre ${doctorConversationContextLabel[context].toLocaleLowerCase('pt-BR')} adicionada à conversa de ${selected.patient.name}.`);
    } catch {
      // The conversation error banner gives the user a retry path.
    }
  };

  return (
    <>
      <Heading eyebrow="Comunicação segura" title="Mensagens" description="Cada conversa fica vinculada ao contexto do cuidado, sem transformar uma mensagem em decisão clínica." />
      <section className="mt-7 grid min-h-[590px] overflow-hidden rounded-3xl border border-[#dbe4f0] bg-white lg:grid-cols-[290px_1fr]">
        <div className="border-b border-[#eef2f8] lg:border-b-0 lg:border-r">
          <div className="p-4"><label className="sr-only" htmlFor="doctor-message-search">Buscar conversa</label><input id="doctor-message-search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar conversa" placeholder="Buscar por paciente ou contexto" className="min-h-11 w-full rounded-xl bg-[#f4f7fd] px-4 text-sm outline-none focus:ring-2 focus:ring-[#79a8df]" /></div>
          {visibleThreads.length === 0 ? <p className="border-t border-[#eef2f8] px-4 py-6 text-sm leading-6 text-[#5b6d88]">Nenhuma conversa demonstrativa encontrada.</p> : visibleThreads.map((item) => (
            <Link href={getPatientMessagesHref(item.patient.id)} key={item.patient.id} aria-current={selected?.patient.id === item.patient.id ? 'page' : undefined} className={cn('flex min-h-20 w-full gap-3 border-t border-[#eef2f8] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0]', selected?.patient.id === item.patient.id ? 'bg-[#eaf2ff]' : 'hover:bg-[#f4f7fd]')}>
              <PatientAvatar patient={item.patient} size="sm" className="ring-offset-white" />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-3"><strong className="text-sm">{item.patient.name}</strong><small className="text-[#5b6d88]">{item.time}</small></span>
                <span className="mt-1 block truncate text-xs text-[#5b6d88]">{item.preview}</span>
              </span>
            </Link>
          ))}
        </div>
        {selected ? (
          <div className="flex min-h-[470px] flex-col">
            <div className="flex items-center gap-3 border-b border-[#eef2f8] p-4 sm:px-6">
              <PatientAvatar patient={selected.patient} size="sm" className="ring-offset-white" />
              <div><p className="text-sm font-bold">{selected.patient.name}</p><p className="text-xs text-[#5b6d88]">{selected.context}</p></div>
            </div>
            <div className="flex-1 space-y-4 bg-[#f4f7fd] p-4 sm:p-6" aria-live="polite">
              {isSharedAccount && persistentConversation.loading ? <p className="text-sm text-[#5b6d88]">Atualizando a conversa…</p> : null}
              <div className="max-w-[86%] rounded-2xl rounded-tl-md bg-white p-4 text-sm leading-6 shadow-sm sm:max-w-[78%]">
                <span className="mb-2 inline-flex rounded-full bg-[#eaf2ff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#124da0]">Plano de cuidado</span>
                <p>{selected.incoming}</p>
                <p className="mt-2 text-[11px] text-[#5b6d88]">{selected.time} · exemplo fictício</p>
              </div>
              <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-md bg-[#082553] p-4 text-sm leading-6 text-white sm:max-w-[78%]">
                <span className="mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">Plano de cuidado</span>
                <p>{selected.outgoing}</p>
                <p className="mt-2 text-[11px] text-[#a9c8ee]">Dr. Guilherme · exemplo fictício</p>
              </div>
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'max-w-[86%] rounded-2xl p-4 text-sm leading-6 sm:max-w-[78%]',
                    message.sender === 'doctor'
                      ? 'ml-auto rounded-tr-md bg-[#082553] text-white'
                      : 'rounded-tl-md bg-white text-[#071a3a] shadow-sm',
                  )}
                >
                  <span className={cn(
                    'mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]',
                    message.sender === 'doctor' ? 'bg-white/15 text-white' : 'bg-[#eaf2ff] text-[#124da0]',
                  )}>
                    {doctorConversationContextLabel[message.context]}
                  </span>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={cn('mt-2 text-[11px]', message.sender === 'doctor' ? 'text-[#a9c8ee]' : 'text-[#5b6d88]')}>
                    {message.sentAt} · {message.sender === 'doctor' ? 'Dr. Guilherme' : selected.patient.name}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={submit} className="border-t border-[#eef2f8] bg-white p-4">
              <fieldset>
                <legend className="text-xs font-bold uppercase tracking-[0.09em] text-[#405675]">Vincular ao contexto</legend>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {doctorConversationContexts.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={context === option.value}
                      onClick={() => setContext(option.value)}
                      className={cn(
                        'min-h-11 shrink-0 cursor-pointer rounded-xl border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2',
                        context === option.value
                          ? 'border-[#082553] bg-[#082553] text-white'
                          : 'border-[#dbe4f0] bg-white text-[#5b6d88] hover:bg-[#eaf2ff] hover:text-[#124da0]',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="mt-3 block text-sm font-bold text-[#071a3a]" htmlFor="doctor-message">Mensagem para {selected.patient.name}</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <textarea id="doctor-message" value={value} maxLength={600} rows={2} disabled={isSharedAccount && persistentConversation.sending} onChange={(event) => setValue(event.target.value)} className="min-h-20 min-w-0 flex-1 resize-y rounded-xl border border-[#dbe4f0] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#79a8df] disabled:bg-[#eef2f8]" placeholder={`Escreva sobre ${doctorConversationContextLabel[context].toLocaleLowerCase('pt-BR')}...`} />
                <button type="submit" disabled={!canSend || (isSharedAccount && persistentConversation.sending)} className="min-h-12 cursor-pointer rounded-xl bg-[#124da0] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0f3f83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-[#9db4d6]">{isSharedAccount && persistentConversation.sending ? 'Enviando…' : 'Enviar'}</button>
              </div>
              {isSharedAccount && persistentConversation.error ? <p role="alert" className="mt-3 rounded-xl border border-[#efc5c1] bg-[#fff2f1] px-3 py-2.5 text-sm font-medium text-[#8b3732]">{persistentConversation.error}</p> : null}
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-5 text-[#5b6d88]"><p>{isSharedAccount ? 'Conversa compartilhada com a conta da Marina.' : 'Sessão demonstrativa; sem envio externo.'}</p><p>{value.length}/600</p></div>
            </form>
          </div>
        ) : (
          <div className="grid min-h-[470px] place-items-center bg-[#f4f7fd] p-6 text-center">
            <div className="max-w-md"><Status tone="gray">Sem conversa demonstrativa</Status><h2 className="mt-4 text-xl font-semibold">Nenhuma conversa foi criada para este contexto.</h2><p className="mt-2 text-sm leading-6 text-[#5b6d88]">O protótipo não substitui a conversa ausente por mensagens de outra pessoa.</p></div>
          </div>
        )}
      </section>
    </>
  );
}

function Reports({ approved, onApprove }: { approved: boolean; onApprove: () => void }) {
  return (
    <>
      <Heading eyebrow="Histórico e evolução" title="Relatórios" description="Rascunhos criados a partir de dados de exemplo, sempre revisados pelo médico." />
      <section className="mt-7 grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          {[
            ['Marina Costa', 'Quinzenal · pronto'],
            ['Ana Ribeiro', 'Quinzenal · pronto'],
            ['Paulo Mendes', 'Semanal · processando'],
          ].map((item, index) => (
            <button type="button" key={item[0]} className={cn('w-full rounded-2xl border p-4 text-left', index === 0 ? 'border-[#9dc0ee] bg-[#eaf2ff]' : 'border-[#dbe4f0] bg-white')}>
              <strong className="block text-sm">{item[0]}</strong><span className="mt-1 block text-xs text-[#5b6d88]">{item[1]}</span>
            </button>
          ))}
        </div>
        <article className="rounded-3xl border border-[#dbe4f0] bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b border-[#eef2f8] pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0b7b68]">Rascunho assistido por IA</p><h2 className="mt-2 text-2xl font-semibold">Evolução quinzenal · Marina Costa</h2><p className="mt-1 text-sm text-[#5b6d88]">11–25 de agosto de 2026</p></div>
            <Status tone={approved ? 'green' : 'amber'}>{approved ? 'Aprovado' : 'Requer revisão'}</Status>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Peso', '−3,2 kg'],
              ['Adesão', '82%'],
              ['Sono médio', '6h12'],
            ].map((item) => <div key={item[0]} className="rounded-2xl bg-[#f4f7fd] p-4"><p className="text-xs font-semibold text-[#5b6d88]">{item[0]}</p><p className="mt-2 text-xl font-bold">{item[1]}</p></div>)}
          </div>
          <div className="mt-6 space-y-5 text-sm leading-6 text-[#5b6d88]">
            <section><h3 className="font-bold text-[#071a3a]">Síntese do período</h3><p className="mt-1">Evolução consistente de peso e boa adesão. A principal oportunidade é recuperar regularidade de sono antes de ampliar metas.</p></section>
            <section><h3 className="font-bold text-[#071a3a]">Pontos para próxima consulta</h3><ul className="mt-1 list-disc space-y-1 pl-5"><li>Investigar despertares noturnos.</li><li>Revisar tolerância e rotina do jantar.</li><li>Manter meta de passos nesta semana.</li></ul></section>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="min-h-11 rounded-xl border border-[#c9d8ec] bg-white px-5 text-sm font-bold text-[#124da0]">Editar texto</button>
            <button type="button" disabled={approved} onClick={onApprove} className="min-h-11 rounded-xl bg-[#124da0] px-5 text-sm font-bold text-white disabled:bg-[#9db4d6]">{approved ? 'Relatório aprovado' : 'Aprovar e disponibilizar'}</button>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#5b6d88]">A IA organiza informações; a interpretação e a decisão permanecem com o médico.</p>
        </article>
      </section>
    </>
  );
}

type ConsultationStep = 'preparo' | 'consulta' | 'plano' | 'fechamento';

function Consultation({
  appointment,
  initialStep,
  onClose,
  onComplete,
  onNotify,
}: {
  appointment: Appointment;
  initialStep: ConsultationStep;
  onClose: () => void;
  onComplete: () => void;
  onNotify: (message: string) => void;
}) {
  const {
    latestAiPreparationReview,
    latestSubmission,
    latestConsultationClosure,
    latestCarePlan,
    latestPublishedCarePlan,
    activeFollowUpConfiguration,
  } = useCareDemo(appointment.patientId, appointment.encounterId);
  const [step, setStep] = useState<ConsultationStep>(initialStep);
  const [notes, setNotes] = useState(`${appointment.patient}: ${appointment.reported}`);
  const [summary, setSummary] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const usesSharedPreConsultation = appointment.patientId === DEFAULT_PATIENT_ID && Boolean(latestSubmission);
  const reviewedAgendaItems = latestAiPreparationReview?.items.filter((item) => item.decision === 'included') ?? [];
  const preparationChecklist = reviewedAgendaItems.length > 0
    ? reviewedAgendaItems.map((item) => item.label)
    : appointment.checklist;
  const steps: Array<[ConsultationStep, string]> = [
    ['preparo', '1. Preparo'],
    ['consulta', '2. Consulta'],
    ['plano', '3. Plano'],
    ['fechamento', '4. Fechamento'],
  ];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const backgroundRegions = [
      document.querySelector<HTMLElement>('header'),
      document.getElementById('doctor-workspace-content'),
    ].filter((region): region is HTMLElement => Boolean(region));
    const backgroundState = backgroundRegions.map((region) => ({
      region,
      hadInert: region.hasAttribute('inert'),
      ariaHidden: region.getAttribute('aria-hidden'),
    }));

    backgroundRegions.forEach((region) => {
      region.setAttribute('inert', '');
      region.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundState.forEach(({ region, hadInert, ariaHidden }) => {
        if (!hadInert) region.removeAttribute('inert');
        if (ariaHidden === null) region.removeAttribute('aria-hidden');
        else region.setAttribute('aria-hidden', ariaHidden);
      });
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#03132d]/58 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="consultation-title">
      <div ref={dialogRef} className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-t-3xl bg-[#f6f9fe] shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dbe4f0] bg-white px-5 py-4 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Pré-consulta · {appointment.time}</p><h2 id="consultation-title" className="mt-1 text-xl font-semibold text-[#071a3a]">{appointment.patient}</h2></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fechar pré-consulta" className="grid size-11 cursor-pointer place-items-center rounded-full border border-[#dbe4f0] text-xl text-[#071a3a] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">×</button>
        </div>
        <div className="border-b border-[#dbe4f0] bg-white px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {steps.map((item) => <button type="button" key={item[0]} onClick={() => setStep(item[0])} className={cn('min-h-12 shrink-0 border-b-2 px-3 text-sm font-bold', step === item[0] ? 'border-[#124da0] text-[#124da0]' : 'border-transparent text-[#526681]')}>{item[1]}</button>)}
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {step === 'preparo' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Resumo do acompanhamento</p><h3 className="mt-2 text-2xl font-semibold text-[#071a3a]">O que mudou desde a última consulta</h3></div>
                  <Status tone={usesSharedPreConsultation ? 'blue' : appointment.preVisitTone}>{usesSharedPreConsultation ? 'Fonte compartilhada nesta sessão' : appointment.preVisit}</Status>
                </div>
                {usesSharedPreConsultation ? (
                  <div className="mt-6">
                    <PreConsultationReviewWorkspace patientId={appointment.patientId} encounterId={appointment.encounterId} onNotify={onNotify} />
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl bg-[#03132d] p-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a9c8ee]">Síntese da pré-consulta</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#dce8f7]">Dados demonstrativos</span>
                  </div>
                  <p className="mt-4 text-lg font-semibold leading-7">{appointment.objective}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/10 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#a9c8ee]">Relato recebido</p><p className="mt-2 text-sm leading-6 text-[#e8f0fa]">{appointment.reported}</p></div>
                    <div className="rounded-xl bg-white/10 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#a9c8ee]">Organizado pela IA</p><p className="mt-2 text-sm leading-6 text-[#e8f0fa]">{appointment.aiFocus}</p></div>
                  </div>
                  <details className="mt-4 rounded-xl border border-white/15 p-3"><summary className="cursor-pointer text-xs font-bold text-[#cfe0f4]">Abrir respostas de origem</summary><p className="mt-3 text-sm leading-6 text-[#dce8f7]">As respostas demonstrativas foram organizadas em um resumo revisável. Nenhum conteúdo é tratado como diagnóstico ou decisão clínica automática.</p></details>
                  </div>
                )}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {appointment.metrics.map((item) => <div key={item[0]} className="rounded-xl bg-[#f4f7fc] p-4"><p className="text-xs text-[#526681]">{item[0]}</p><p className="mt-2 text-xl font-bold text-[#071a3a]">{item[1]}</p><p className={cn('mt-1 text-xs font-semibold', item[0] === 'Sintoma' ? 'text-[#9c453f]' : item[0] === 'Anamnese' || (item[0] === 'Sono' && item[2].includes('abaixo')) ? 'text-[#a06117]' : 'text-[#124da0]')}>{item[2]}</p></div>)}
                </div>
                <div className={cn('mt-6 rounded-xl border p-4', appointment.preVisitTone === 'rose' ? 'border-[#efc7c3] bg-[#fdf0ef]' : appointment.preVisitTone === 'blue' || appointment.preVisitTone === 'green' ? 'border-[#c9d8ec] bg-[#edf3fb]' : 'border-[#ead8ad] bg-[#fff8e9]')}><p className={cn('text-sm font-bold', appointment.preVisitTone === 'rose' ? 'text-[#8d3f39]' : appointment.preVisitTone === 'blue' || appointment.preVisitTone === 'green' ? 'text-[#124da0]' : 'text-[#6f4b0d]')}>{appointment.attentionTitle}</p><p className={cn('mt-1 text-sm leading-6', appointment.preVisitTone === 'rose' ? 'text-[#7e504c]' : appointment.preVisitTone === 'blue' || appointment.preVisitTone === 'green' ? 'text-[#405675]' : 'text-[#805f24]')}>{appointment.attentionDetail}</p></div>
              </section>
              <aside className="rounded-2xl bg-[#03132d] p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a9c8ee]">Pauta para a consulta</p>
                  {latestAiPreparationReview ? <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#dce8f7]">Revisada · v{latestAiPreparationReview.version}</span> : null}
                </div>
                <ol className="mt-5 space-y-4 text-sm text-[#e8f0fa]">{preparationChecklist.map((item, index) => <li key={item}><strong className="mr-2 text-[#79a8df]">{String(index + 1).padStart(2, '0')}</strong>{item}</li>)}</ol>
                <p className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-[#b7c9df]">{latestAiPreparationReview ? 'Itens escolhidos pelo médico no preparo assistido; as fontes continuam disponíveis no histórico.' : 'Pauta demonstrativa ainda sem revisão no preparo assistido.'}</p>
                <button type="button" onClick={() => setStep('consulta')} className="mt-7 min-h-11 w-full cursor-pointer rounded-xl bg-white px-4 text-sm font-bold text-[#03132d] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]">Começar consulta</button>
              </aside>
            </div>
          )}

          {step === 'consulta' && (
            <DoctorTeleconsultationAiWorkspace
              key={`teleconsult-${appointment.patientId}-${appointment.encounterId}`}
              patientId={appointment.patientId}
              patientName={appointment.patient}
              encounterId={appointment.encounterId}
              notes={notes}
              onNotesChange={setNotes}
              onApplyDraft={(draft) => {
                setNotes((current) => current.includes(draft) ? current : `${current.trim()}\n\n${draft}`.trim());
                setSummary(true);
              }}
              onContinue={() => setStep('plano')}
              onNotify={onNotify}
            />
          )}

          {step === 'plano' && (
            <DoctorCarePlanWorkspace
              patientId={appointment.patientId}
              encounterId={appointment.encounterId}
              notesPresent={notes.trim().length > 0}
              onNotify={onNotify}
              onContinue={() => setStep('fechamento')}
            />
          )}

          {step === 'fechamento' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
              <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Fechamento revisável</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#071a3a]">Tudo pronto para conferir</h3>
                <div className="mt-6 space-y-3">
                  {[
                    ['Fechamento da consulta', latestConsultationClosure ? `Versão ${latestConsultationClosure.version} aprovada · ${latestConsultationClosure.items.length} itens rastreáveis` : summary ? 'Notas organizadas, sem histórico registrado' : 'Usará somente as notas atuais'],
                    ['Plano de cuidado', latestPublishedCarePlan ? `Versão ${latestPublishedCarePlan.version} publicada para a paciente` : latestCarePlan?.status === 'approved' ? `Versão ${latestCarePlan.version} aprovada, aguardando publicação` : latestCarePlan?.status === 'draft' ? `Versão ${latestCarePlan.version} em rascunho` : 'Nenhum plano iniciado'],
                    ['Origem do plano', latestCarePlan?.sourceClosureId && latestCarePlan.sourceClosureId === latestConsultationClosure?.id ? `${latestCarePlan.sourceItemIds.length} ${latestCarePlan.sourceItemIds.length === 1 ? 'item aprovado vinculado' : 'itens aprovados vinculados'}` : 'Sem vínculo com o fechamento aprovado'],
                    ['Próximo acompanhamento', activeFollowUpConfiguration ? `Cadência ligada ao plano v${activeFollowUpConfiguration.planVersion}` : latestPublishedCarePlan ? 'Ainda não configurado' : 'Disponível depois da publicação'],
                  ].map((item) => <div key={item[0]} className="flex flex-col justify-between gap-1 rounded-xl bg-[#f4f7fc] p-4 sm:flex-row"><strong className="text-sm text-[#071a3a]">{item[0]}</strong><span className="text-sm text-[#61718a]">{item[1]}</span></div>)}
                </div>
                <p className="mt-5 text-xs leading-5 text-[#5b6d88]">Nenhuma sugestão será tratada como prescrição automática.</p>
              </section>
              <aside className="rounded-2xl bg-[#03132d] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a9c8ee]">Próximo passo</p><h3 className="mt-3 text-xl font-semibold">Manter o cuidado vivo</h3><p className="mt-3 text-sm leading-6 text-[#dce8f7]">O app transforma o plano em pequenos compromissos e traz de volta somente o que merece atenção.</p>{latestCarePlan?.status !== 'published' ? <button type="button" onClick={() => setStep('plano')} className="mt-7 min-h-12 w-full cursor-pointer rounded-xl bg-white px-4 text-sm font-bold text-[#03132d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]">Voltar e revisar o plano</button> : null}<button type="button" onClick={onComplete} className={cn('min-h-12 w-full cursor-pointer rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]', latestCarePlan?.status === 'published' ? 'mt-7 bg-white text-[#03132d]' : 'mt-2 border border-white/25 text-white')}>{latestCarePlan?.status === 'published' ? 'Concluir consulta' : 'Concluir mantendo como rascunho'}</button><button type="button" onClick={onClose} className="mt-2 min-h-11 w-full cursor-pointer text-sm font-semibold text-[#b7c9df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df]">Salvar e sair</button></aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertDrawer({
  item,
  onClose,
  onResolve,
}: {
  item: (typeof alerts)[number];
  onClose: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[#102a24]/45" role="dialog" aria-modal="true" aria-labelledby="alert-title">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between">
          <div><Status tone={item.tone}>{item.tag}</Status><h2 id="alert-title" className="mt-4 text-2xl font-semibold">{item.patient}</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar alerta" className="grid size-11 place-items-center rounded-full border border-[#dbe4f0] text-xl">×</button>
        </div>
        <div className="mt-8 rounded-3xl bg-[#f4f7fd] p-5"><p className="text-sm font-bold">{item.detail}</p><p className="mt-2 text-sm leading-6 text-[#5b6d88]">{item.context}</p></div>
        <section className="mt-7">
          <h3 className="text-sm font-bold">Contexto relevante</h3>
          {[
            ['Plano atual', 'Regularizar sono e manter adesão'],
            ['Último contato', 'Ontem, 20:14'],
            ['Próxima consulta', 'Hoje, 10:30'],
          ].map((row) => <div key={row[0]} className="flex justify-between gap-4 border-b border-[#eef2f8] py-3 text-sm"><span className="text-[#5b6d88]">{row[0]}</span><strong className="text-right">{row[1]}</strong></div>)}
        </section>
        <div className="mt-8 space-y-3"><button type="button" onClick={onResolve} className="min-h-12 w-full rounded-xl bg-[#124da0] text-sm font-bold text-white">Marcar como revisado</button><button type="button" className="min-h-12 w-full rounded-xl border border-[#c9d8ec] text-sm font-bold text-[#124da0]">Enviar mensagem</button></div>
        <p className="mt-5 text-xs leading-5 text-[#5b6d88]">Este alerta organiza prioridade; não representa diagnóstico ou emergência.</p>
      </div>
    </div>
  );
}
