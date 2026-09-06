'use client';

import {
  ArrowLeft,
  ChartLineDown,
  ChatCircle,
  CheckCircle,
  DotsThree,
  FileText,
  Footprints,
  Info,
  Moon,
  ShieldCheck,
  VideoCamera,
  WarningCircle,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useCareDemo } from './care-demo-store';
import { publishedPlanLabel } from './care-workflow';
import type { CareCheckIn } from './care-demo-types';
import { AiDraftBadge, ClinicalLayerBadge } from './clinical';
import {
  useClinicalIntelligence,
  type ClinicalExamDocument,
  type PatientAiContextStatus,
} from './clinical-intelligence-context';
import { DoctorAiPreparationWorkspace } from './doctor-ai-preparation-workspace';
import { DoctorCareCycleSummary } from './doctor-care-cycle-summary';
import { DoctorClinicalChangeSummary } from './doctor-clinical-change-summary';
import { DoctorExamReviewPanel } from './doctor-exam-review-panel';
import { CareSubmissionInbox } from './care-submission-inbox';
import { CareSyncStatus } from './shared-care-context';
import { DEFAULT_PATIENT_ID, doctorDemoCohortSummary, getDefaultEncounterId } from './demo-routes';
import { LongitudinalDossier } from './longitudinal-dossier';
import {
  DoctorPatientCheckInReview,
  DoctorPrescriptionNotice,
} from './doctor-patient-checkin-review';
import {
  getPatientCareDemo,
  type PatientDocument,
  type PatientDocumentKind,
  type PatientEvolutionMetric,
  type PatientEvolutionMetricKey,
} from './patient-care-demo-data';
import { cn, NavigationLink as Link, Status } from './shared';

type Tone = 'green' | 'amber' | 'rose' | 'blue' | 'gray';
export type ProgramSignal = 'expected' | 'monitor' | 'review';

const aiContextPresentation: Record<PatientAiContextStatus, { label: string; tone: Tone }> = {
  ready: { label: 'IA: contexto pronto', tone: 'green' },
  review_required: { label: 'IA: revisão pendente', tone: 'amber' },
  insufficient_data: { label: 'IA: dados insuficientes', tone: 'gray' },
  not_authorized: { label: 'IA: não autorizada', tone: 'gray' },
  paused: { label: 'IA: pausada', tone: 'blue' },
};

export type PatientWorkspaceProfile = {
  id: string;
  nextEncounterId: string;
  age?: number;
  initials: string;
  name: string;
  focus: string;
  progress: string;
  attention: string;
  tone: Tone;
  programSignal: ProgramSignal;
  avatarSeed: string;
  lastContactOrder: number;
  reportCount: string;
  prescriptionCount: string;
  cycle: string;
  lastContact: string;
  nextConsultation: string;
  adherence: string;
  report: {
    title: string;
    period: string;
    status: string;
    summary: string;
    metrics: Array<[string, string]>;
  };
  prescription: {
    title: string;
    status: string;
    detail: string;
    note: string;
  };
  insight: {
    title: string;
    detail: string;
    basis: string;
  };
  activity: Array<[string, string]>;
  nextSteps: string[];
};

type PatientTab = 'overview' | 'timeline' | 'documents' | 'evolution';
type DemoScenario = 'content' | 'loading' | 'empty' | 'error' | 'incomplete' | 'permission' | 'ai-unavailable' | 'conflict';
type DocumentKind = PatientDocumentKind;
type EvolutionMetric = PatientEvolutionMetricKey;

const patientTabs: Array<{ id: PatientTab; label: string; description: string }> = [
  { id: 'overview', label: 'Visão geral', description: 'Decisão e pendências' },
  { id: 'timeline', label: 'Linha do tempo', description: 'Histórico rastreável' },
  { id: 'documents', label: 'Documentos', description: 'Originais e versões' },
  { id: 'evolution', label: 'Evolução', description: 'Tendências por período' },
];

const scenarioLabels: Array<{ id: DemoScenario; label: string }> = [
  { id: 'content', label: 'Conteúdo completo' },
  { id: 'loading', label: 'Carregando' },
  { id: 'empty', label: 'Paciente novo' },
  { id: 'error', label: 'Erro localizado' },
  { id: 'incomplete', label: 'Dados incompletos' },
  { id: 'permission', label: 'Sem permissão' },
  { id: 'ai-unavailable', label: 'IA indisponível' },
  { id: 'conflict', label: 'Fonte conflitante' },
];

const documentFilters: Array<{ id: DocumentKind; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'exam', label: 'Exames recebidos' },
  { id: 'order', label: 'Pedidos' },
  { id: 'report', label: 'Relatórios' },
  { id: 'plan', label: 'Planos e orientações' },
];

type ClinicalDocument = PatientDocument;

const clinicalDocumentMonths = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatClinicalDocumentDate(value: string) {
  if (!value) return 'Coleta não informada';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || !clinicalDocumentMonths[month - 1]) return value;
  return `${day} ${clinicalDocumentMonths[month - 1]} ${year}`;
}

function parseClinicalFieldValue(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function presentClinicalExamDocument(exam: ClinicalExamDocument): ClinicalDocument {
  const includedFields = exam.fields.filter((field) => field.included);
  const confirmedFields = includedFields.filter((field) => field.status === 'confirmed' || field.status === 'corrected');
  const values = includedFields.flatMap((field) => {
    const value = parseClinicalFieldValue(field.value);
    return value === null ? [] : [{ marker: field.label, value, unit: field.unit }];
  });
  const fieldSummary = includedFields.length === 0
    ? 'sem campos estruturados'
    : exam.reviewStatus === 'approved'
      ? `${confirmedFields.length} ${confirmedFields.length === 1 ? 'campo confirmado' : 'campos confirmados'}`
      : `${includedFields.length} ${includedFields.length === 1 ? 'campo aguarda' : 'campos aguardam'} conferência`;

  return {
    id: exam.id,
    kind: 'exam',
    title: exam.title,
    date: formatClinicalDocumentDate(exam.examDate),
    author: `${exam.laboratory} · enviado por ${exam.submittedByLabel}`,
    origin: exam.submittedBy === 'patient' ? 'Enviado pela pessoa acompanhada' : 'Registrado pela equipe médica',
    status: exam.reviewStatus === 'approved'
      ? `Revisado por ${exam.reviewedBy ?? exam.doctorName}`
      : 'Aguardando conferência médica',
    statusTone: exam.reviewStatus === 'approved' ? 'green' : 'amber',
    version: exam.reviewStatus === 'approved'
      ? `Revisão v${exam.reviewVersion} · ${fieldSummary} · ${exam.reviewedAt ?? exam.receivedAt}`
      : `Recebido em ${exam.receivedAt} · ${fieldSummary}`,
    values: values.length > 0 ? values : undefined,
  };
}

function referencesCheckIn(...values: string[]) {
  return values.some((value) => value.toLocaleLowerCase('pt-BR').includes('check-in'));
}

function checkInCountLabel(checkIns: CareCheckIn[]) {
  return `${checkIns.length} ${checkIns.length === 1 ? 'recebido' : 'recebidos'}`;
}

function checkInDomainValue(checkIns: CareCheckIn[], hydrated: boolean) {
  if (!hydrated) return 'Consultando check-ins';
  const latestCheckIn = checkIns.at(-1);
  if (!latestCheckIn) return 'Sem check-in recebido';
  const sleepQuality = { poor: 'ruim', regular: 'regular', good: 'bom' }[latestCheckIn.sleepQuality];
  return `Energia ${latestCheckIn.energy} de 5 · sono ${sleepQuality} · ${checkInCountLabel(checkIns)}`;
}

export const programSignalPresentation: Record<ProgramSignal, {
  label: string;
  description: string;
  ringClass: string;
  dotClass: string;
  badgeClass: string;
}> = {
  expected: {
    label: 'Dentro da expectativa',
    description: 'Registros compatíveis com o combinado no programa',
    ringClass: 'ring-[#63a88a]',
    dotClass: 'bg-[#2d8a67]',
    badgeClass: 'bg-[#e7f4ef] text-[#17624e]',
  },
  monitor: {
    label: 'Acompanhamento estável',
    description: 'Sem urgência; acompanhar os próximos registros',
    ringClass: 'ring-[#d8aa46]',
    dotClass: 'bg-[#bf8620]',
    badgeClass: 'bg-[#fff0ca] text-[#77500a]',
  },
  review: {
    label: 'Revisar registros',
    description: 'A equipe precisa revisar a resposta relatada',
    ringClass: 'ring-[#d66a68]',
    dotClass: 'bg-[#bd4d4c]',
    badgeClass: 'bg-[#fdecea] text-[#9c453f]',
  },
};

const avatarPalettes: Record<string, { background: string; skin: string; hair: string; shirt: string; hairShape: string }> = {
  marina: { background: 'bg-[#f5e4dd]', skin: 'bg-[#efbb9b]', hair: 'bg-[#4a3430]', shirt: 'bg-[#b76669]', hairShape: 'h-[35%] w-[62%] rounded-t-[60%] rounded-b-[34%]' },
  ana: { background: 'bg-[#e2edf8]', skin: 'bg-[#eab58d]', hair: 'bg-[#47332e]', shirt: 'bg-[#4e7eaa]', hairShape: 'h-[32%] w-[66%] rounded-[48%]' },
  paulo: { background: 'bg-[#e9e5db]', skin: 'bg-[#c98765]', hair: 'bg-[#272a35]', shirt: 'bg-[#596b7d]', hairShape: 'h-[23%] w-[52%] rounded-t-[55%]' },
  rafael: { background: 'bg-[#e0eeea]', skin: 'bg-[#c78464]', hair: 'bg-[#5c3931]', shirt: 'bg-[#4f8d80]', hairShape: 'h-[28%] w-[58%] rounded-t-[52%]' },
  lucia: { background: 'bg-[#ede4f3]', skin: 'bg-[#e9b594]', hair: 'bg-[#6a4640]', shirt: 'bg-[#8564a5]', hairShape: 'h-[39%] w-[68%] rounded-t-[60%] rounded-b-[40%]' },
  lucas: { background: 'bg-[#e7edf7]', skin: 'bg-[#d59a75]', hair: 'bg-[#3d3432]', shirt: 'bg-[#50749d]', hairShape: 'h-[21%] w-[48%] rounded-t-[50%]' },
  fernanda: { background: 'bg-[#f5e7ee]', skin: 'bg-[#e7ae8f]', hair: 'bg-[#463034]', shirt: 'bg-[#b55d7e]', hairShape: 'h-[38%] w-[66%] rounded-[48%]' },
  diego: { background: 'bg-[#e8e9ee]', skin: 'bg-[#b8785b]', hair: 'bg-[#2d2b30]', shirt: 'bg-[#62677a]', hairShape: 'h-[24%] w-[55%] rounded-t-[48%]' },
  camila: { background: 'bg-[#e1f0eb]', skin: 'bg-[#d99170]', hair: 'bg-[#3e302d]', shirt: 'bg-[#398a78]', hairShape: 'h-[37%] w-[64%] rounded-t-[62%] rounded-b-[36%]' },
  bruno: { background: 'bg-[#e8edf3]', skin: 'bg-[#c88968]', hair: 'bg-[#3d3632]', shirt: 'bg-[#5e7591]', hairShape: 'h-[22%] w-[50%] rounded-t-[48%]' },
};

export function PatientAvatar({
  patient,
  size = 'md',
  className,
}: {
  patient: Pick<PatientWorkspaceProfile, 'name' | 'avatarSeed' | 'programSignal'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const palette = avatarPalettes[patient.avatarSeed] ?? avatarPalettes.marina;
  const signal = programSignalPresentation[patient.programSignal];
  const sizeClass = size === 'sm' ? 'size-10' : size === 'lg' ? 'size-[4.5rem]' : 'size-14';

  return (
    <span
      role="img"
      aria-label={`Avatar fictício de ${patient.name}. ${signal.label}.`}
      className={cn('relative grid shrink-0 overflow-hidden rounded-full ring-[3px] ring-offset-2', sizeClass, palette.background, signal.ringClass, className)}
    >
      <span aria-hidden="true" className={cn('absolute -bottom-[22%] left-1/2 h-[53%] w-[86%] -translate-x-1/2 rounded-t-[52%]', palette.shirt)} />
      <span aria-hidden="true" className={cn('absolute left-1/2 top-[22%] h-[49%] w-[49%] -translate-x-1/2 rounded-full', palette.skin)} />
      <span aria-hidden="true" className={cn('absolute left-1/2 top-[13%] -translate-x-1/2', palette.hair, palette.hairShape)} />
      <span aria-hidden="true" className="absolute left-[37%] top-[50%] size-[5%] rounded-full bg-[#3d302f]" />
      <span aria-hidden="true" className="absolute right-[37%] top-[50%] size-[5%] rounded-full bg-[#3d302f]" />
    </span>
  );
}

type CohortSignalFilter = 'all' | ProgramSignal;
type CohortSort = 'priority' | 'recent' | 'name';

export function PatientCohort({ patients, onSelectPatient }: { patients: PatientWorkspaceProfile[]; onSelectPatient: (patientId: string) => void }) {
  const [query, setQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<CohortSignalFilter>('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [sort, setSort] = useState<CohortSort>('priority');
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const programs = [...new Set(patients.map((patient) => patient.focus.split(' · ')[0]))].toSorted((left, right) => left.localeCompare(right, 'pt-BR'));
  const signalCounts = {
    expected: patients.filter((patient) => patient.programSignal === 'expected').length,
    monitor: patients.filter((patient) => patient.programSignal === 'monitor').length,
    review: patients.filter((patient) => patient.programSignal === 'review').length,
  };
  const isFiltered = Boolean(query || signalFilter !== 'all' || programFilter !== 'all' || sort !== 'priority');
  const visiblePatients = patients
    .filter((patient) => {
      const searchable = `${patient.name} ${patient.focus} ${patient.attention} ${patient.progress}`.toLocaleLowerCase('pt-BR');
      return searchable.includes(normalizedQuery) &&
        (signalFilter === 'all' || patient.programSignal === signalFilter) &&
        (programFilter === 'all' || patient.focus.startsWith(programFilter));
    })
    .toSorted((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name, 'pt-BR');
      if (sort === 'recent') return left.lastContactOrder - right.lastContactOrder;
      const priority = { review: 0, monitor: 1, expected: 2 } as const;
      return priority[left.programSignal] - priority[right.programSignal] || left.lastContactOrder - right.lastContactOrder;
    });

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#506681]">Carteira demonstrativa</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#071a3a]">Pacientes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#61718a]">Uma lista para encontrar quem precisa de contexto antes da próxima conversa.</p>
        </div>
        <p className="rounded-xl border border-[#dbe4f0] bg-white px-3.5 py-2 text-xs font-semibold text-[#50627f]">{patients.length} perfis fictícios nesta visualização · carteira de {doctorDemoCohortSummary.activePatients} acompanhados</p>
      </div>

      <section aria-label="Resumo dos perfis demonstrativos" className="mt-6 grid overflow-hidden rounded-2xl border border-[#dbe4f0] bg-[#e7edf5] sm:grid-cols-4">
        {[
          ['Perfis nesta tela', patients.length, 'border-b sm:border-b-0 sm:border-r'],
          ['Dentro da expectativa', signalCounts.expected, 'border-b sm:border-b-0 sm:border-r'],
          ['Acompanhamento estável', signalCounts.monitor, 'border-b sm:border-b-0 sm:border-r'],
          ['Para revisar', signalCounts.review, ''],
        ].map(([label, value, border]) => <div key={label as string} className={cn('bg-white p-4 sm:p-5', border as string, 'border-[#e7edf5]')}><p className="text-xs font-semibold text-[#50627f]">{label as string}</p><p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">{value as number}</p></div>)}
      </section>

      <section aria-labelledby="patient-filters-title" className="mt-5 rounded-2xl border border-[#dbe4f0] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#506681]">Organizar carteira</p>
                <h2 id="patient-filters-title" className="mt-1 text-base font-semibold text-[#071a3a]">Busca e filtros</h2>
              </div>
              {isFiltered ? <button type="button" onClick={() => { setQuery(''); setSignalFilter('all'); setProgramFilter('all'); setSort('priority'); }} className="min-h-10 rounded-xl px-3 text-xs font-bold text-[#124da0] underline underline-offset-4 transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Limpar filtros</button> : null}
            </div>
            <label className="mt-3 flex min-h-11 items-center rounded-xl border border-[#cbd8e9] bg-[#fbfdff] px-3.5 text-sm text-[#50627f] focus-within:ring-2 focus-within:ring-[#124da0] focus-within:ring-offset-2">
              <span className="sr-only">Buscar paciente por nome, foco ou alerta</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" className="w-full bg-transparent outline-none" placeholder="Buscar por nome, programa ou ponto de atenção" />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-[390px]">
            <label className="text-xs font-bold text-[#50627f]">Programa<select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-semibold text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]"><option value="all">Todos os programas</option>{programs.map((program) => <option key={program} value={program}>{program}</option>)}</select></label>
            <label className="text-xs font-bold text-[#50627f]">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value as CohortSort)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-semibold text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]"><option value="priority">Prioridade de revisão</option><option value="recent">Último contato</option><option value="name">Nome (A–Z)</option></select></label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar pelo sinal de acompanhamento">
          {([
            { id: 'all', label: 'Todos', count: patients.length, dotClass: 'bg-[#506681]' },
            ...(['expected', 'monitor', 'review'] as ProgramSignal[]).map((signal) => ({ id: signal, label: programSignalPresentation[signal].label, count: signalCounts[signal], dotClass: programSignalPresentation[signal].dotClass })),
          ] as Array<{ id: CohortSignalFilter; label: string; count: number; dotClass: string }>).map((filter) => (
            <button key={filter.id} type="button" aria-pressed={signalFilter === filter.id} onClick={() => setSignalFilter(filter.id)} className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]', signalFilter === filter.id ? 'border-[#173f78] bg-[#edf3fb] text-[#071a3a]' : 'border-[#dbe4f0] bg-white text-[#50627f] hover:bg-[#f7faff]')}><span aria-hidden="true" className={cn('size-2 rounded-full', filter.dotClass)} />{filter.label}<span className="text-[#7890ac]">{filter.count}</span></button>
          ))}
        </div>
      </section>

      <section aria-labelledby="patient-list-title" className="mt-5 overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf5] px-4 py-4 sm:px-5">
          <div>
            <h2 id="patient-list-title" className="text-base font-semibold text-[#071a3a]">Lista de pacientes</h2>
            <p className="mt-1 text-xs text-[#61718a]">{visiblePatients.length} de {patients.length} perfis demonstrativos</p>
          </div>
          <p className="text-xs leading-5 text-[#61718a]">O anel indica o acompanhamento demonstrativo, não uma conclusão clínica.</p>
        </div>

        <div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(150px,0.7fr)_minmax(130px,0.6fr)_minmax(140px,0.65fr)_minmax(160px,0.8fr)_24px] gap-4 border-b border-[#e7edf5] bg-[#f7faff] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#61718a] lg:grid">
          <span>Paciente</span><span>Progresso</span><span>Último contato</span><span>Próxima consulta</span><span>Sinal do programa</span><span aria-hidden="true" />
        </div>

        {visiblePatients.length === 0 ? (
          <div className="p-8 text-center"><h3 className="text-lg font-semibold text-[#071a3a]">Nenhum perfil encontrado</h3><p className="mt-2 text-sm leading-6 text-[#61718a]">Ajuste a busca ou os filtros para ver os perfis demonstrativos.</p></div>
        ) : visiblePatients.map((patient) => {
          const signal = programSignalPresentation[patient.programSignal];
          return (
            <button key={patient.id} type="button" onClick={() => onSelectPatient(patient.id)} className="group grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#e7edf5] px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0] sm:px-5 lg:grid-cols-[minmax(260px,1.4fr)_minmax(150px,0.7fr)_minmax(130px,0.6fr)_minmax(140px,0.65fr)_minmax(160px,0.8fr)_24px] lg:gap-4">
              <span className="flex min-w-0 items-center gap-4">
                <PatientAvatar patient={patient} />
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-bold text-[#071a3a] sm:text-base">{patient.name}</strong>
                  <span className="mt-1 block truncate text-xs text-[#50627f]">{patient.age ?? 38} anos · {patient.focus}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs lg:hidden"><span className="font-semibold text-[#071a3a]">{patient.progress}</span><span className="text-[#61718a]">{patient.lastContact}</span></span>
                </span>
              </span>
              <span className="hidden min-w-0 lg:block"><strong className="block truncate text-sm text-[#071a3a]">{patient.progress}</strong><span className="mt-1 block truncate text-xs text-[#61718a]">{patient.attention}</span></span>
              <span className="hidden text-sm text-[#405675] lg:block">{patient.lastContact}</span>
              <span className="hidden text-sm font-semibold text-[#405675] lg:block">{patient.nextConsultation}</span>
              <span className="hidden lg:block"><span className={cn('inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold', signal.badgeClass)}><span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', signal.dotClass)} />{signal.label}</span><span className="mt-1.5 block text-[11px] leading-4 text-[#61718a]">{signal.description}</span></span>
              <span className="grid size-8 place-items-center rounded-full bg-[#f0f5fb] text-[#50709c] transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

export function PatientLongitudinalWorkspace({
  patient,
  patients,
  hasLiveCheckIn,
  onSelectPatient,
  onStartConsultation,
  onOpenPreparation,
  onMessage,
  onNotify,
}: {
  patient: PatientWorkspaceProfile;
  patients: PatientWorkspaceProfile[];
  hasLiveCheckIn: boolean;
  onSelectPatient: (patientId: string) => void;
  onStartConsultation: (patientId: string, encounterId: string) => void;
  onOpenPreparation: (patientId: string, encounterId: string) => void;
  onMessage: (patientId: string) => void;
  onNotify: (text: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');
  const [scenario, setScenario] = useState<DemoScenario>('content');
  const { patientContexts } = useClinicalIntelligence();
  const { latestPublishedCarePlan } = useCareDemo(patient.id, patient.nextEncounterId);
  const patientAiContext = patientContexts.find((context) => context.patientId === patient.id);
  const aiContextStatus = patientAiContext ? aiContextPresentation[patientAiContext.status] : null;

  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace('#patient-', '') as PatientTab;
      setActiveTab(patientTabs.some((tab) => tab.id === hash) ? hash : 'overview');
    };
    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  const isDefaultPatient = patient.id === DEFAULT_PATIENT_ID;
  const isPendingPatient = patient.id === 'pac-demo-006';
  const primaryLabel = isDefaultPatient
    ? 'Iniciar consulta online'
    : isPendingPatient
      ? 'Solicitar informações'
      : 'Preparar próxima consulta';
  const attentionDetail = isDefaultPatient
    ? 'Sono médio caiu para 5h42, com despertares relatados às 3h em quatro noites.'
    : patient.insight.detail;
  const PrimaryActionIcon = isPendingPatient ? ChatCircle : VideoCamera;

  const runPrimaryAction = () => {
    if (isDefaultPatient) onStartConsultation(patient.id, patient.nextEncounterId);
    else if (isPendingPatient) onMessage(patient.id);
    else onOpenPreparation(patient.id, patient.nextEncounterId);
  };

  const activateTab = (tab: PatientTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#patient-${tab}`);
  };

  const moveTabFocus = (currentTab: PatientTab, key: string) => {
    const currentIndex = patientTabs.findIndex((tab) => tab.id === currentTab);
    let nextIndex = currentIndex;

    if (key === 'Home') nextIndex = 0;
    else if (key === 'End') nextIndex = patientTabs.length - 1;
    else if (key === 'ArrowRight') nextIndex = (currentIndex + 1) % patientTabs.length;
    else if (key === 'ArrowLeft') nextIndex = (currentIndex - 1 + patientTabs.length) % patientTabs.length;
    else return;

    const nextTab = patientTabs[nextIndex]?.id;
    if (!nextTab) return;

    activateTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`patient-tab-${nextTab}`)?.focus());
  };

  return (
    <div id="patient-longitudinal-workspace" className="min-w-0">
      <section className="doctor-sticky-offset -mx-4 border-b border-[#dbe4f0] bg-[#f6f9fe]/92 px-4 pb-4 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-9 lg:px-9 xl:sticky xl:top-[var(--doctor-chrome-current-height)] xl:z-30">
        <div className="mx-auto max-w-[1240px] pt-2">
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
            <Link href="/medico/pacientes" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#50627f] transition-colors hover:bg-white hover:text-[#071a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">
              <ArrowLeft aria-hidden="true" size={17} /> Voltar aos pacientes
            </Link>
            <label className="hidden min-h-11 items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white/90 px-3 text-xs font-semibold text-[#61718a] focus-within:ring-2 focus-within:ring-[#124da0] focus-within:ring-offset-2 sm:flex">
              Paciente
              <select value={patient.id} onChange={(event) => onSelectPatient(event.target.value)} className="max-w-[180px] bg-transparent font-bold text-[#071a3a] focus-visible:outline-none">
                {patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <PatientAvatar patient={patient} size="lg" className="ring-offset-[#f6f9fe]" />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-[#071a3a] sm:text-[2rem]">{patient.name}</h1>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#61718a] sm:text-sm">{patient.age ?? 38} anos · {patient.focus} · {patient.cycle}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Status tone={patient.tone}>{patient.attention} para revisar</Status>
                  <Status tone="blue">Vínculo ativo</Status>
                  {aiContextStatus ? (
                    <Status tone={aiContextStatus.tone}>
                      {aiContextStatus.label}{patientAiContext?.appliedConfigurationVersion ? ` · v${patientAiContext.appliedConfigurationVersion}` : ''}
                    </Status>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" onClick={runPrimaryAction} className="vivance-primary-action inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 sm:flex-none">
                <PrimaryActionIcon aria-hidden="true" size={20} /> {primaryLabel}
              </button>
              <details className="relative">
                <summary aria-label="Abrir mais ações" className="grid size-12 cursor-pointer list-none place-items-center rounded-xl border border-[#c7d5e7] bg-white text-[#082553] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0]">
                  <DotsThree aria-hidden="true" size={22} weight="bold" />
                </summary>
                <div className="vivance-glass-menu absolute right-0 top-14 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl p-2 text-white shadow-[0_20px_48px_rgba(3,19,45,0.32)]">
                  {[
                    ['Solicitar informação', () => onMessage(patient.id)],
                    ['Criar pedido de exame', () => onNotify('Novo pedido de exame aberto como rascunho demonstrativo.')],
                    ['Registrar observação', () => onNotify('Campo de observação médica aberto para preenchimento.')],
                    ['Revisar resumo assistido', () => {
                      activateTab('overview');
                      const details = document.getElementById('ai-support-details') as HTMLDetailsElement | null;
                      if (details) details.open = true;
                      window.requestAnimationFrame(() => details?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
                    }],
                  ].map(([label, action]) => (
                    <button key={label as string} type="button" onClick={action as () => void} className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8cbaf2]">{label as string}</button>
                  ))}
                  <div className="my-2 border-t border-white/15" />
                  <label className="block px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/60" htmlFor="demo-scenario">Cenário do protótipo</label>
                  <select id="demo-scenario" value={scenario} onChange={(event) => setScenario(event.target.value as DemoScenario)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#071a3a] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#79a8df]">
                    {scenarioLabels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
              </details>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[#dbe4f0] pt-3 text-xs text-[#61718a]">
            <span><strong className="text-[#071a3a]">Plano:</strong> {publishedPlanLabel(latestPublishedCarePlan)}</span>
            <span className="hidden sm:inline"><strong className="text-[#071a3a]">Última consulta:</strong> {isPendingPatient ? 'Não realizada' : '28 jul · 09:30'}</span>
            <span><strong className="text-[#071a3a]">Próxima:</strong> {patient.nextConsultation}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] pt-4 sm:pt-5">
        <div className="flex items-start gap-2.5 px-1 text-xs leading-5 text-[#61718a] sm:text-sm sm:leading-6">
          <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[#124da0]" size={17} />
          <p><strong className="text-[#071a3a]">Área de apoio ao cuidado.</strong> Não substitui o prontuário oficial.<span className="hidden sm:inline"> Originais, autoria, versões e revisão humana continuam identificados.</span></p>
        </div>

        <nav aria-label="Áreas do histórico do paciente" className="vivance-panel mt-4 overflow-x-auto rounded-2xl p-1.5">
          <div role="tablist" aria-label="Conteúdo do paciente" className="flex min-w-max gap-1 md:min-w-0">
            {patientTabs.map((tab) => (
              <button
                key={tab.id}
                id={`patient-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`patient-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => activateTab(tab.id)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  moveTabFocus(tab.id, event.key);
                }}
                className={cn(
                  'flex min-h-12 min-w-[132px] flex-1 cursor-pointer flex-col justify-center rounded-xl px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 md:min-w-0',
                  activeTab === tab.id ? 'bg-[#03132d] text-white shadow-[0_8px_18px_rgba(3,19,45,0.16)]' : 'text-[#405675] hover:bg-[#edf3fb]',
                )}
              >
                <span className="text-sm font-bold">{tab.label}</span>
                <span className={cn('mt-0.5 hidden text-[11px] sm:block', activeTab === tab.id ? 'text-[#c9d7ea]' : 'text-[#61718a]')}>{tab.description}</span>
              </button>
            ))}
          </div>
        </nav>

        <section id={`patient-panel-${activeTab}`} role="tabpanel" aria-labelledby={`patient-tab-${activeTab}`} className="mt-4 min-w-0 scroll-mt-44 sm:mt-5">
          {scenario === 'loading' ? (
            <LoadingState />
          ) : scenario === 'empty' ? (
            <EmptyPatientState onNotify={onNotify} />
          ) : activeTab === 'overview' ? (
            <OverviewPanel patient={patient} scenario={scenario} attentionDetail={attentionDetail} hasLiveCheckIn={hasLiveCheckIn} onMessage={onMessage} onNotify={onNotify} />
          ) : activeTab === 'timeline' ? (
            <TimelinePanel patient={patient} />
          ) : activeTab === 'documents' ? (
            <DocumentsPanel patient={patient} permissionDenied={scenario === 'permission'} onNotify={onNotify} />
          ) : (
            <EvolutionPanel patient={patient} error={scenario === 'error'} incomplete={scenario === 'incomplete'} onNotify={onNotify} />
          )}
        </section>
      </div>
    </div>
  );
}

function OverviewPanel({
  patient,
  scenario,
  attentionDetail,
  hasLiveCheckIn,
  onMessage,
  onNotify,
}: {
  patient: PatientWorkspaceProfile;
  scenario: DemoScenario;
  attentionDetail: string;
  hasLiveCheckIn: boolean;
  onMessage: (patientId: string) => void;
  onNotify: (text: string) => void;
}) {
  const [careDetailsOpen, setCareDetailsOpen] = useState(false);
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);
  const isPendingPatient = patient.id === 'pac-demo-006';
  const encounterId = getDefaultEncounterId(patient.id);
  const { hydrated: careDemoHydrated, checkIns, latestCheckIn, latestPublishedCarePlan } = useCareDemo(patient.id, encounterId);
  const { hydrated: clinicalIntelligenceHydrated, exams } = useClinicalIntelligence();
  const careDemo = getPatientCareDemo(patient.id, patient.name);
  const patientExams = exams.filter((exam) => exam.patientId === patient.id);
  const approvedExamCount = patientExams.filter((exam) => exam.reviewStatus === 'approved').length;
  const pendingExamCount = patientExams.length - approvedExamCount;
  const hasCanonicalCheckIn = careDemoHydrated ? Boolean(latestCheckIn) : hasLiveCheckIn;
  const metrics: Array<[string, string, string]> = careDemo.overviewMetrics.map(({ label, value, detail }) => {
    if (label === 'Exames') {
      return [
        label,
        clinicalIntelligenceHydrated
          ? patientExams.length === 0
            ? 'Nenhum'
            : `${patientExams.length} ${patientExams.length === 1 ? 'arquivo' : 'arquivos'}`
          : 'Carregando',
        !clinicalIntelligenceHydrated
          ? 'consultando documentos do acompanhamento'
          : patientExams.length === 0
            ? 'nenhum exame recebido'
            : pendingExamCount > 0
              ? `${pendingExamCount} ${pendingExamCount === 1 ? 'aguarda' : 'aguardam'} revisão${approvedExamCount > 0 ? ` · ${approvedExamCount} ${approvedExamCount === 1 ? 'revisado' : 'revisados'}` : ''}`
              : `${approvedExamCount} ${approvedExamCount === 1 ? 'revisado' : 'revisados'}`,
      ];
    }

    if (referencesCheckIn(label, detail)) {
      const isEnergyMetric = label.toLocaleLowerCase('pt-BR').includes('energia');
      return [
        label,
        !careDemoHydrated
          ? 'Carregando'
          : isEnergyMetric
            ? latestCheckIn
              ? `${latestCheckIn.energy} de 5`
              : 'Sem dados'
            : checkIns.length === 0
              ? 'Nenhum'
              : checkInCountLabel(checkIns),
        !careDemoHydrated
          ? 'consultando relatos do acompanhamento'
          : latestCheckIn
            ? `fonte original v${latestCheckIn.version} · ${latestCheckIn.submittedAt}`
            : 'nenhum check-in recebido',
      ];
    }

    return [
      label,
      isPendingPatient && hasCanonicalCheckIn && label === 'Etapas' ? '2 de 5' : value,
      detail,
    ];
  });
  const metricIcons = [ChartLineDown, Moon, Footprints, CheckCircle];
  const reviewStatus = isPendingPatient
    ? hasCanonicalCheckIn ? 'Revisar fonte recebida' : 'Aguardar preenchimento'
    : 'Revisar na consulta';
  const reviewEvidence = isPendingPatient
    ? hasCanonicalCheckIn ? 'Relato inicial recebido' : 'Sem check-ins recebidos'
    : !careDemoHydrated
      ? 'Consultando check-ins'
      : checkIns.length === 0
        ? 'Sem check-ins recebidos'
        : `${checkIns.length} ${checkIns.length === 1 ? 'check-in recebido' : 'check-ins recebidos'}`;
  const nextSteps = isPendingPatient && hasCanonicalCheckIn
    ? patient.nextSteps.map((step) => step === 'Aguardar relato inicial' ? 'Revisar relato inicial recebido' : step)
    : patient.nextSteps;

  return (
    <div className="space-y-4 sm:space-y-5">
      {scenario === 'incomplete' && <InlineState tone="amber" title="Dados incompletos" description="Seis dias não têm registros de sono e três check-ins ainda não foram respondidos. A síntese preserva essas lacunas." />}
      {scenario === 'error' && <InlineState tone="rose" title="Uma fonte não carregou" description="O exame mais recente está temporariamente indisponível. Os demais módulos e o acesso manual continuam funcionando." />}

      <DoctorPrescriptionNotice patientId={patient.id} />

      <section aria-labelledby="review-now-title" className="vivance-panel overflow-hidden rounded-2xl">
        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center sm:p-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex items-center gap-3 sm:hidden">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0ca] text-[#77500a]">
                <WarningCircle aria-hidden="true" size={20} weight="fill" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Status tone="amber">{reviewStatus}</Status>
                <span className="text-xs font-semibold text-[#61718a]">{reviewEvidence}</span>
              </div>
            </div>
            <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-[#fff0ca] text-[#77500a] sm:grid">
              <WarningCircle aria-hidden="true" size={22} weight="fill" />
            </span>
            <div className="min-w-0">
              <div className="hidden flex-wrap items-center gap-2 sm:flex">
                <Status tone="amber">{reviewStatus}</Status>
                <span className="text-xs font-semibold text-[#61718a]">{reviewEvidence}</span>
              </div>
              <h2 id="review-now-title" className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[#071a3a] sm:text-2xl">{isPendingPatient ? 'O que está pendente agora' : 'O que merece atenção agora'}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#405675]">{attentionDetail}</p>
              <p className="mt-2 text-xs leading-5 text-[#61718a]">{isPendingPatient ? 'Ainda não há dados suficientes para análise. A equipe decide se e quando solicitar o restante.' : 'É uma mudança observada no período. Não define causa, diagnóstico, urgência ou conduta.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => isPendingPatient ? onMessage(patient.id) : onNotify('Fontes do sono abertas para conferência.')} className="min-h-11 rounded-xl border border-[#9bb5d4] bg-white px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">{isPendingPatient ? 'Solicitar informações' : 'Conferir fontes'}</button>
        </div>
      </section>

      <CareSyncStatus patientId={patient.id} encounterId={getDefaultEncounterId(patient.id)} />
      <CareSubmissionInbox doctor patientId={patient.id} encounterId={getDefaultEncounterId(patient.id)} />
      <DoctorExamReviewPanel patientId={patient.id} onNotify={onNotify} />

      {patient.id === DEFAULT_PATIENT_ID ? (
        <DoctorClinicalChangeSummary patientId={patient.id} onNotify={onNotify} />
      ) : (
        <dl className="vivance-panel grid overflow-hidden rounded-2xl divide-y divide-[#e7edf5] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {metrics.slice(0, 4).map(([label, value, detail], index) => {
            const MetricIcon = metricIcons[index] ?? FileText;
            return (
              <div key={label} className={cn('bg-white/78 p-4 sm:p-5', index === 2 && 'sm:border-t sm:border-[#e7edf5] xl:border-t-0')}>
                <dt className="flex items-center gap-2 text-xs font-semibold text-[#61718a]"><MetricIcon aria-hidden="true" size={17} className="text-[#124da0]" />{label}</dt>
                <dd className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">{value}</dd>
                <p className="mt-1 text-xs text-[#61718a]">{detail}</p>
              </div>
            );
          })}
        </dl>
      )}

      <DoctorPatientCheckInReview
        patientId={patient.id}
        encounterId={getDefaultEncounterId(patient.id)}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-5">
        <section className="vivance-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]"><ShieldCheck aria-hidden="true" size={20} /></span>
            <div>
              <h2 className="text-lg font-semibold text-[#071a3a]">Situação do acompanhamento</h2>
              <p className="mt-1 text-sm leading-6 text-[#61718a]">O contexto principal para preparar a próxima conversa.</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-x-6 sm:grid-cols-2">
              {[
                ['Objetivo atual', patient.focus],
                ['Meta demonstrativa', `${careDemo.goal.label} · ${careDemo.goal.target}`],
                ['Progresso da meta', careDemo.goal.progress],
                ['Plano vigente', publishedPlanLabel(latestPublishedCarePlan)],
                ['Último contato', patient.lastContact],
                ['Próxima consulta', patient.nextConsultation],
              ].map(([label, value]) => <div key={label} className="border-t border-[#e7edf5] py-3"><dt className="text-xs font-semibold text-[#61718a]">{label}</dt><dd className="mt-1 text-sm font-bold text-[#405675]">{value}</dd>{label === 'Progresso da meta' ? <p className="mt-1 text-xs leading-5 text-[#61718a]">{careDemo.goal.source}</p> : null}</div>)}
          </dl>
        </section>
        <aside className="vivance-panel rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-[#071a3a]">Próximas ações</h2>
            <ol className="mt-4 space-y-3">
              {nextSteps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-[#50627f]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#edf3fb] text-xs font-bold text-[#124da0]">{index + 1}</span><span>{step}</span></li>)}
            </ol>
            <button type="button" onClick={() => onMessage(patient.id)} className="mt-5 min-h-11 w-full rounded-xl border border-[#9bb5d4] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Solicitar informação</button>
        </aside>
      </div>

      <details className="vivance-panel overflow-hidden rounded-2xl" onToggle={(event) => setCareDetailsOpen(event.currentTarget.open)}>
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-bold text-[#071a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0] sm:px-6">
          <ChartLineDown aria-hidden="true" size={20} className="text-[#124da0]" />
          Ver resumo completo do acompanhamento
        </summary>
        {careDetailsOpen ? <DoctorCareCycleSummary patientId={patient.id} encounterId={getDefaultEncounterId(patient.id)} /> : null}
      </details>

      {scenario === 'ai-unavailable' ? (
        <section className="vivance-panel rounded-2xl p-6">
          <Status tone="gray">IA indisponível</Status>
          <h2 className="mt-3 text-xl font-semibold text-[#071a3a]">Fluxo manual preservado</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">O profissional continua com relatos originais, documentos e linha do tempo. Nenhum conteúdo assistido é necessário para atender ou registrar a consulta.</p>
          <button type="button" onClick={() => onNotify('Fontes originais abertas sem geração assistida.')} className="mt-5 min-h-11 rounded-xl border border-[#9bb5d4] px-4 text-sm font-bold text-[#124da0]">Abrir fontes originais</button>
        </section>
      ) : (
        <details id="ai-support-details" className="vivance-panel overflow-hidden rounded-2xl" onToggle={(event) => setAiDetailsOpen(event.currentTarget.open)}>
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-bold text-[#071a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0] sm:px-6">
            <FileText aria-hidden="true" size={20} className="text-[#124da0]" />
            Abrir apoio para preparar a consulta
          </summary>
          {aiDetailsOpen ? (
            <div className="min-w-0 border-t border-[#dbe4f0] bg-white">
              <DoctorAiPreparationWorkspace key={`ai-${patient.id}-${scenario}`} patientId={patient.id} patientName={patient.name} encounterId={getDefaultEncounterId(patient.id)} conflictMode={scenario === 'conflict'} onNotify={onNotify} />
            </div>
          ) : null}
        </details>
      )}

      <details className="rounded-2xl border border-[#dbe4f0] bg-white/70 px-5 py-3">
        <summary className="min-h-11 cursor-pointer rounded-lg text-sm font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0]">Acesso, autoria e versões</summary>
        <div className="mt-2 space-y-2 pb-2 text-xs leading-5 text-[#61718a]"><p><strong className="text-[#071a3a]">Perfil:</strong> médico responsável · simulação.</p><p><strong className="text-[#071a3a]">Paciente:</strong> vê somente versões publicadas.</p><p><strong className="text-[#071a3a]">Apoio assistido:</strong> organiza fontes, mas nunca é autor da decisão clínica.</p><p>Autorização real e registro legal dependem de infraestrutura própria e não são simulados como concluídos.</p></div>
      </details>
    </div>
  );
}

function TimelinePanel({ patient }: { patient: PatientWorkspaceProfile }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white">
      <div className="border-b border-[#e7edf5] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">Linha do tempo clínica</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">Eventos de diferentes origens em ordem cronológica, com autoria, versão, estado de revisão e limitações visíveis.</p></div>
          <Status tone="gray">18 eventos demonstrativos</Status>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#50627f]">Para grandes volumes, use os filtros abaixo; a tela mantém o recorte atual sem ocultar a existência de outros registros.</p>
      </div>
      <LongitudinalDossier patientId={patient.id} patientName={patient.name} />
    </div>
  );
}

function DocumentsPanel({ patient, permissionDenied, onNotify }: { patient: PatientWorkspaceProfile; permissionDenied: boolean; onNotify: (text: string) => void }) {
  const [filter, setFilter] = useState<DocumentKind>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const { hydrated, exams } = useClinicalIntelligence();
  const nonExamDocuments = getPatientCareDemo(patient.id, patient.name).documents
    .filter((document) => document.kind !== 'exam');
  const examDocuments = exams
    .filter((exam) => exam.patientId === patient.id)
    .toSorted((left, right) => right.receivedAtIso.localeCompare(left.receivedAtIso))
    .map(presentClinicalExamDocument);
  const documents = [...examDocuments, ...nonExamDocuments];
  const filtered = filter === 'all' ? documents : documents.filter((document) => document.kind === filter);
  const comparable = documents.filter((document) => selected.includes(document.id) && document.values);

  const toggleSelected = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
    setCompareOpen(false);
  };

  if (permissionDenied) {
    return <RestrictedState onNotify={onNotify} />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">Documentos e histórico clínico</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">Originais preservados junto das versões, resumos assistidos e decisões humanas. Um resumo nunca substitui seu documento-fonte.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onNotify('Pedido de exame criado como rascunho demonstrativo.')} className="min-h-11 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white">Criar pedido</button><button type="button" onClick={() => onNotify('Solicitação de documento aberta para este acompanhamento.')} className="min-h-11 rounded-xl border border-[#c7d5e7] px-4 text-sm font-bold text-[#124da0]">Solicitar documento</button></div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar documentos">
          {documentFilters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={cn('min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold', filter === item.id ? 'bg-[#071a3a] text-white' : 'border border-[#dbe4f0] bg-white text-[#50627f] hover:bg-[#f6f9fe]')}>{item.label}</button>)}
        </div>
      </section>

      {!hydrated && (filter === 'all' || filter === 'exam') ? (
        <section aria-busy="true" className="rounded-2xl border border-[#dbe4f0] bg-white p-8 text-center">
          <h3 className="text-lg font-semibold text-[#071a3a]">Consultando documentos do acompanhamento</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#61718a]">Os exames só aparecem depois que o contexto deste paciente é carregado.</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#c7d5e7] bg-white p-8 text-center"><h3 className="text-lg font-semibold text-[#071a3a]">Nenhum documento neste recorte</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#61718a]">O estado vazio não é preenchido por dados de outro paciente. Solicite um documento ou altere o filtro.</p></section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white">
          <div className="divide-y divide-[#e7edf5]">
            {filtered.map((document) => (
              <article key={document.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><Status tone={document.statusTone}>{document.status}</Status><Status tone="gray">{document.origin}</Status>{document.aiSummary && <AiDraftBadge>Resumo IA separado</AiDraftBadge>}</div>
                    <h3 className="mt-3 text-lg font-semibold text-[#071a3a]">{document.title}</h3>
                    <p className="mt-1 text-sm text-[#61718a]">{document.date} · {document.author}</p>
                    <p className="mt-2 text-xs font-semibold text-[#50627f]">{document.version}</p>
                    {document.aiSummary && <div className="mt-4 rounded-xl border border-[#c9d8ec] bg-[#f8fbff] p-4"><ClinicalLayerBadge layer="sintese_ia" /><p className="mt-2 text-sm leading-6 text-[#50627f]">{document.aiSummary}</p></div>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {document.values && <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dbe4f0] px-3 text-sm font-bold text-[#405675]"><input type="checkbox" checked={selected.includes(document.id)} onChange={() => toggleSelected(document.id)} className="size-4 accent-[#124da0]" />Comparar</label>}
                    {document.originalHref ? <a href={document.originalHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-[#c7d5e7] px-4 text-sm font-bold text-[#124da0]">Abrir original</a> : <button type="button" onClick={() => onNotify('Documento aberto para conferência.')} className="min-h-11 rounded-xl border border-[#c7d5e7] px-4 text-sm font-bold text-[#124da0]">Abrir versão</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {selected.length > 0 && <section className="flex flex-col gap-3 rounded-2xl border border-[#c8d8eb] bg-[#edf3fb] p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-[#071a3a]">{selected.length} exame(s) selecionado(s) · escolha entre 2 e 3 para comparar</p><button type="button" disabled={comparable.length < 2} onClick={() => setCompareOpen(true)} className="min-h-11 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Comparar valores</button></section>}
      {compareOpen && comparable.length >= 2 && <ExamComparison documents={comparable} />}
    </div>
  );
}

function ExamComparison({ documents }: { documents: ClinicalDocument[] }) {
  const markers = documents[0].values ?? [];
  return (
    <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#071a3a]">Comparação objetiva de exames</h2><p className="mt-2 text-sm leading-6 text-[#61718a]">Mostra somente valores transcritos dos originais selecionados. Não classifica, diagnostica ou explica causalidade.</p></div><Status tone="amber">Requer conferência</Status></div>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[620px] w-full border-collapse text-left text-sm">
          <thead><tr className="border-b border-[#dbe4f0]"><th className="p-3 text-xs text-[#50627f]">Marcador</th>{documents.map((document) => <th key={document.id} className="p-3 text-xs text-[#50627f]">{document.date}</th>)}<th className="p-3 text-xs text-[#50627f]">Diferença</th></tr></thead>
          <tbody>{markers.map((marker) => { const first = documents[0].values?.find((item) => item.marker === marker.marker); const last = documents.at(-1)?.values?.find((item) => item.marker === marker.marker); const difference = first && last ? last.value - first.value : null; return <tr key={marker.marker} className="border-b border-[#eef3f9] last:border-0"><th className="p-3 font-bold text-[#405675]">{marker.marker}</th>{documents.map((document) => { const value = document.values?.find((item) => item.marker === marker.marker); return <td key={document.id} className="p-3 text-[#50627f]">{value ? `${value.value} ${value.unit}` : 'Não informado'}</td>; })}<td className="p-3 font-bold text-[#071a3a]">{difference === null ? '—' : `${difference > 0 ? '+' : ''}${difference.toFixed(1)} ${marker.unit}`}</td></tr>; })}</tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#50627f]">Sempre confira unidades, método e documento original antes de usar a comparação em uma decisão clínica.</p>
    </section>
  );
}

function EvolutionPanel({ patient, error, incomplete, onNotify }: { patient: PatientWorkspaceProfile; error: boolean; incomplete: boolean; onNotify: (text: string) => void }) {
  const [metricKey, setMetricKey] = useState<EvolutionMetric>('weight');
  const [period, setPeriod] = useState('30 dias');
  const { hydrated: careDemoHydrated, checkIns, latestCheckIn } = useCareDemo(patient.id, getDefaultEncounterId(patient.id));
  const careDemo = getPatientCareDemo(patient.id, patient.name);
  const metric = careDemo.evolution[metricKey];
  const metricUsesCheckIns = referencesCheckIn(metric.label, metric.source, metric.completeness);
  const domains: Array<[string, string]> = careDemo.domains.map(([label, value]) => {
    if (label === 'Check-ins') {
      return [
        label,
        !careDemoHydrated
          ? 'Consultando registros'
          : checkIns.length === 0
            ? 'Nenhum recebido'
            : checkInCountLabel(checkIns),
      ];
    }
    return label === 'Bem-estar'
      ? [label, checkInDomainValue(checkIns, careDemoHydrated)]
      : [label, value];
  });
  const first = metric.points[0].value;
  const last = metric.points.at(-1)?.value ?? first;

  if (error) {
    return <section className="rounded-2xl border border-[#efc7c3] bg-white p-8 text-center"><Status tone="rose">Erro localizado</Status><h2 className="mt-3 text-xl font-semibold text-[#071a3a]">A evolução não pôde ser carregada</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#61718a]">Documentos e linha do tempo continuam acessíveis. Nenhum valor antigo foi apresentado como atual.</p><button type="button" onClick={() => onNotify('Nova tentativa de carregamento iniciada no mock.')} className="mt-5 min-h-11 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white">Tentar novamente</button></section>;
  }

  return (
    <div className="space-y-5">
      {incomplete && <InlineState tone="amber" title="Período incompleto" description="A linha interrompida não foi interpolada. A leitura considera apenas registros confirmados e mostra a cobertura de cada fonte." />}
      <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">Histórico e evolução</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">Compare períodos e veja o que aconteceu perto de consultas, exames e mudanças no plano, sem afirmar que um evento causou o outro.</p></div><div className="flex gap-2 overflow-x-auto" aria-label="Selecionar período">{['30 dias', '90 dias', '6 meses'].map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)} className={cn('min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold', period === item ? 'bg-[#071a3a] text-white' : 'border border-[#dbe4f0] text-[#50627f]')}>{item}</button>)}</div></div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Selecionar indicador">{(Object.keys(careDemo.evolution) as EvolutionMetric[]).map((key) => <button key={key} type="button" aria-pressed={metricKey === key} onClick={() => setMetricKey(key)} className={cn('min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold', metricKey === key ? 'bg-[#edf3fb] text-[#124da0] ring-1 ring-[#c8d8eb]' : 'border border-[#dbe4f0] text-[#50627f]')}>{careDemo.evolution[key].label}</button>)}</div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
          {metricUsesCheckIns ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-[#071a3a]">{metric.label}</h3>
                  <p className="mt-1 text-sm text-[#61718a]">Check-ins deste acompanhamento</p>
                </div>
                <Status tone={latestCheckIn ? 'blue' : 'gray'}>{careDemoHydrated ? (latestCheckIn ? 'Fonte disponível' : 'Sem fonte') : 'Consultando'}</Status>
              </div>
              {!careDemoHydrated ? (
                <div aria-busy="true" className="mt-5 rounded-xl border border-[#dbe4f0] bg-[#f7faff] p-5 text-sm text-[#61718a]">Consultando check-ins deste paciente…</div>
              ) : latestCheckIn ? (
                <div className="mt-5 rounded-xl border border-[#c9d8ec] bg-[#f7faff] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#61718a]">Registro mais recente</p>
                  <p className="mt-2 text-xl font-semibold text-[#071a3a]">Energia {latestCheckIn.energy} de 5</p>
                  <p className="mt-2 text-sm leading-6 text-[#405675]">Check-in v{latestCheckIn.version} · {latestCheckIn.submittedAt} · {checkInCountLabel(checkIns)} neste acompanhamento.</p>
                  <p className="mt-3 text-xs leading-5 text-[#61718a]">Uma tendência só será apresentada quando houver registros canônicos suficientes e comparáveis. Nenhum ponto é preenchido com dados do cenário visual.</p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-[#c7d5e7] bg-[#f7faff] p-5">
                  <p className="text-sm font-bold text-[#405675]">Ainda não há check-in recebido</p>
                  <p className="mt-2 text-xs leading-5 text-[#61718a]">A evolução permanece vazia até existir uma fonte deste paciente; valores estáticos não são apresentados como registros reais.</p>
                </div>
              )}
          </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold text-[#071a3a]">{metric.label}</h3><p className="mt-1 text-sm text-[#61718a]">{metric.source}</p></div><Status tone="gray">{period}</Status></div>
              <EvolutionChart metric={metric} chartId={`${patient.id}-${metricKey}`} />
              <div className="mt-4 grid gap-3 rounded-xl bg-[#f6f9fe] p-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#61718a]">Mudança observada</p><p className="mt-1 text-sm font-bold text-[#071a3a]">{formatMetricValue(first, metric.unit)} → {formatMetricValue(last, metric.unit)}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#61718a]">Meta do ciclo</p><p className="mt-1 text-sm font-bold text-[#071a3a]">{metric.target === undefined ? 'Não registrada' : `${metric.targetLabel ?? 'Meta demonstrativa'} · ${formatMetricValue(metric.target, metric.unit)}`}</p></div><p className="sm:col-span-2 text-xs leading-5 text-[#61718a]">Eventos, registros e metas aparecem no mesmo período para dar contexto; o produto não atribui causalidade nem cria orientação clínica.</p></div>
            </>
          )}
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5"><h3 className="text-lg font-semibold text-[#071a3a]">Qualidade dos dados</h3><p className="mt-3 text-sm font-bold text-[#405675]">{metricUsesCheckIns ? (careDemoHydrated ? `${checkIns.length} ${checkIns.length === 1 ? 'fonte canônica disponível' : 'fontes canônicas disponíveis'}` : 'Consultando fontes') : metric.completeness}</p>{!metricUsesCheckIns ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7edf5]"><div style={{ width: `${getCompletenessPercent(metric.completeness)}%` }} className="h-full rounded-full bg-[#124da0] transition-[width] duration-300 motion-reduce:transition-none" /></div> : null}<p className="mt-3 text-xs leading-5 text-[#61718a]">Lacunas permanecem visíveis e não são preenchidas por estimativa.</p></section>
          <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5"><h3 className="text-lg font-semibold text-[#071a3a]">Outros domínios</h3><dl className="mt-4 divide-y divide-[#e7edf5]">{domains.map(([label, value]) => <div key={label} className="py-3 first:pt-0"><dt className="text-xs text-[#50627f]">{label}</dt><dd className="mt-1 text-sm font-bold text-[#405675]">{value}</dd></div>)}</dl></section>
        </aside>
      </div>
    </div>
  );
}

function EvolutionChart({ metric, chartId }: { metric: PatientEvolutionMetric; chartId: string }) {
  const values = metric.points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max((rawMax - rawMin) * 0.18, rawMax * 0.02, 0.5);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const width = 720;
  const height = 280;
  const left = 62;
  const right = 24;
  const top = 28;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (index / (metric.points.length - 1)) * plotWidth;
  const y = (value: number) => top + ((max - value) / (max - min)) * plotHeight;
  const points = metric.points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const gradientId = `${chartId}-fill`;
  const targetPosition = metric.target === undefined ? null : y(metric.target);
  const areaPoints = `${left},${height - bottom} ${points} ${width - right},${height - bottom}`;

  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
        <title id={`${chartId}-title`}>{metric.label} no período demonstrativo</title>
        <desc id={`${chartId}-desc`}>Gráfico de linha com cinco registros fictícios, meta demonstrativa e marcos de consulta e envio de exame. Os valores não representam uma interpretação clínica.</desc>
        <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={metric.color} stopOpacity="0.25" /><stop offset="100%" stopColor={metric.color} stopOpacity="0.02" /></linearGradient></defs>
        {[0, 1, 2, 3].map((index) => { const value = max - (index / 3) * (max - min); const position = top + (index / 3) * plotHeight; return <g key={index}><line x1={left} x2={width - right} y1={position} y2={position} stroke="#dbe4f0" strokeDasharray="4 5" /><text x={left - 10} y={position + 4} textAnchor="end" fill="#50627f" fontSize="11">{formatAxisValue(value, metric.unit)}</text></g>; })}
        {[2, 3].map((index) => <g key={index}><line x1={x(index)} x2={x(index)} y1={top} y2={height - bottom} stroke="#9bb5d4" strokeDasharray="3 5" /><text x={x(index)} y={top - 9} textAnchor="middle" fill="#124da0" fontSize="12">{index === 2 ? 'Consulta' : 'Exame'}</text></g>)}
        {targetPosition !== null && targetPosition >= top && targetPosition <= height - bottom ? <g><line x1={left} x2={width - right} y1={targetPosition} y2={targetPosition} stroke="#50627f" strokeDasharray="7 5" strokeWidth="1.5" /><text x={width - right} y={targetPosition - 7} textAnchor="end" fill="#50627f" fontSize="11">{metric.targetLabel ?? 'Meta demonstrativa'}</text></g> : null}
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
        <polyline points={points} fill="none" stroke={metric.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {metric.points.map((point, index) => <g key={point.date}><circle cx={x(index)} cy={y(point.value)} r="5" fill="white" stroke={metric.color} strokeWidth="3" /><text x={x(index)} y={height - 20} textAnchor="middle" fill="#61718a" fontSize="11">{point.date}</text></g>)}
      </svg>
      <details className="mt-3 rounded-xl border border-[#dbe4f0] bg-[#fbfdff] p-4"><summary className="min-h-11 cursor-pointer rounded-lg text-sm font-bold text-[#071a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0]">Ver dados em tabela</summary><table className="mt-3 w-full text-left text-sm"><thead><tr className="border-b border-[#dbe4f0]"><th className="py-2 text-xs text-[#50627f]">Data</th><th className="py-2 text-xs text-[#50627f]">Valor</th><th className="py-2 text-xs text-[#50627f]">Fonte</th></tr></thead><tbody>{metric.points.map((point) => <tr key={point.date} className="border-b border-[#eef3f9] last:border-0"><td className="py-2 text-[#50627f]">{point.date}</td><td className="py-2 font-bold text-[#071a3a]">{formatMetricValue(point.value, metric.unit)}</td><td className="py-2 text-xs text-[#61718a]">{point.source}</td></tr>)}</tbody></table></details>
    </div>
  );
}

function LoadingState() {
  return <div aria-live="polite" aria-busy="true" className="space-y-4"><span className="sr-only">Carregando histórico do paciente</span>{[120, 260, 420].map((height) => <div key={height} style={{ minHeight: height }} className="animate-pulse rounded-2xl border border-[#dbe4f0] bg-gradient-to-r from-white via-[#edf3fb] to-white motion-reduce:animate-none" />)}</div>;
}

function EmptyPatientState({ onNotify }: { onNotify: (text: string) => void }) {
  return <section className="rounded-2xl border border-dashed border-[#c7d5e7] bg-white p-8 text-center sm:p-12"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#edf3fb] text-xl font-bold text-[#124da0]">+</span><h2 className="mt-4 text-2xl font-semibold text-[#071a3a]">Paciente novo, histórico ainda vazio</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#61718a]">Comece por dados essenciais, objetivo do cuidado e documentos originais. A IA não cria uma história para preencher a ausência de fontes.</p><button type="button" onClick={() => onNotify('Coleta inicial aberta no mock.')} className="mt-6 min-h-11 rounded-xl bg-[#071a3a] px-5 text-sm font-bold text-white">Iniciar coleta manual</button></section>;
}

function RestrictedState({ onNotify }: { onNotify: (text: string) => void }) {
  return <section className="rounded-2xl border border-[#efc7c3] bg-white p-8 text-center sm:p-12"><Status tone="rose">Acesso restrito</Status><h2 className="mt-4 text-2xl font-semibold text-[#071a3a]">Você não tem permissão para ver estes documentos</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#61718a]">O conteúdo permanece oculto. O protótipo não revela título, resumo ou valores quando o perfil não tem acesso clínico.</p><button type="button" onClick={() => onNotify('Solicitação de acesso registrada no mock.')} className="mt-6 min-h-11 rounded-xl border border-[#c7d5e7] px-5 text-sm font-bold text-[#124da0]">Solicitar acesso</button></section>;
}

function InlineState({ tone, title, description }: { tone: 'amber' | 'rose'; title: string; description: string }) {
  return <div role="status" className={cn('rounded-2xl border p-4', tone === 'amber' ? 'border-[#ead8ad] bg-[#fffdf8]' : 'border-[#efc7c3] bg-[#fff8f7]')}><div className="flex flex-col gap-2 sm:flex-row sm:items-start"><Status tone={tone}>{title}</Status><p className="text-sm leading-6 text-[#50627f]">{description}</p></div></div>;
}

function formatMetricValue(value: number, unit: string) {
  if (unit === 'passos') return `${Math.round(value).toLocaleString('pt-BR')} passos`;
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

function formatAxisValue(value: number, unit: string) {
  if (unit === 'passos') return `${Math.round(value / 100) * 100}`;
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function getCompletenessPercent(completeness: string) {
  const match = completeness.match(/(\d+)\s+de\s+(\d+)/i);
  if (!match) return 0;
  const completed = Number(match[1]);
  const expected = Number(match[2]);
  if (!Number.isFinite(completed) || !Number.isFinite(expected) || expected <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / expected) * 100)));
}
