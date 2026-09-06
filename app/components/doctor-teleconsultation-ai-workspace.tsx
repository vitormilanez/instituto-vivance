'use client';

import {
  CornersIn,
  CornersOut,
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  VideoCamera,
  VideoCameraSlash,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { AiDraftBadge, ClinicalLayerBadge } from './clinical';
import { useCareDemo } from './care-demo-store';
import type { CareConsultationClosureItemKind } from './care-demo-types';
import { PatientAvatar } from './doctor-patient-longitudinal';
import { getPatientAvatarIdentity } from './patient-care-demo-data';
import { cn, Status } from './shared';
import { useSessionDemoState } from './use-session-demo-state';

type LiveSessionStatus = 'idle' | 'active' | 'paused' | 'ended';
type LiveInsightKind = 'patient-report' | 'gap' | 'hypothesis' | 'contradiction';
type LiveInsightDecision = 'pending' | 'pinned' | 'dismissed';
type DraftStatus = 'empty' | 'draft' | 'approved' | 'rejected';

interface TranscriptExcerpt {
  id: string;
  at: string;
  speaker: 'Paciente' | 'Médico';
  body: string;
}

interface LiveInsight {
  id: string;
  excerptId: string;
  title: string;
  detail: string;
  sourceQuote: string;
  kind: LiveInsightKind;
  coverage: 'direct' | 'partial';
  limitation: string;
  handoffKind: CareConsultationClosureItemKind;
  resolvedByExcerptId?: string;
}

interface InsightReview {
  decision: LiveInsightDecision;
  dismissalReason: string | null;
}

interface TeleconsultAuditEvent {
  id: string;
  at: string;
  label: string;
}

interface TeleconsultDemoState {
  consentConfirmed: boolean;
  status: LiveSessionStatus;
  visibleExcerptCount: number;
  reviews: Record<string, InsightReview>;
  draftContent: string;
  draftStatus: DraftStatus;
  draftRejectionReason: string | null;
  sessionVersion: number;
  reviewVersion: number;
  auditEvents: TeleconsultAuditEvent[];
}

const transcriptScript: TranscriptExcerpt[] = [
  {
    id: 'tele-excerpt-001',
    at: '00:18',
    speaker: 'Paciente',
    body: 'Eu melhorei um pouco do sono, mas ainda acordo cansada em alguns dias.',
  },
  {
    id: 'tele-excerpt-002',
    at: '00:41',
    speaker: 'Médico',
    body: 'Quando esses despertares acontecem e quanto tempo você leva para dormir novamente?',
  },
  {
    id: 'tele-excerpt-003',
    at: '01:02',
    speaker: 'Paciente',
    body: 'Nas últimas duas noites acordei três vezes e voltei a dormir rápido em duas delas.',
  },
  {
    id: 'tele-excerpt-004',
    at: '01:38',
    speaker: 'Paciente',
    body: 'Percebi que isso aconteceu nos dias em que jantei depois das nove, mas não sei se tem relação.',
  },
  {
    id: 'tele-excerpt-005',
    at: '02:11',
    speaker: 'Paciente',
    body: 'Na pré-consulta marquei que não havia sintoma novo, mas lembrei que tive azia em duas noites.',
  },
  {
    id: 'tele-excerpt-006',
    at: '02:34',
    speaker: 'Médico',
    body: 'O que você considera mais importante esclarecer ou combinar hoje?',
  },
  {
    id: 'tele-excerpt-007',
    at: '02:47',
    speaker: 'Paciente',
    body: 'Quero entender melhor os despertares e sair com um próximo passo que caiba na minha rotina.',
  },
];

const liveInsights: LiveInsight[] = [
  {
    id: 'live-insight-001',
    excerptId: 'tele-excerpt-001',
    title: 'Melhora parcial e cansaço ainda relatado',
    detail: 'Organização literal do relato da paciente; não é conclusão clínica.',
    sourceQuote: '“melhorei um pouco do sono, mas ainda acordo cansada”',
    kind: 'patient-report',
    coverage: 'direct',
    limitation: 'Autorrelato sem validação clínica ou medida objetiva.',
    handoffKind: 'patient-report',
  },
  {
    id: 'live-insight-002',
    excerptId: 'tele-excerpt-001',
    title: 'Frequência dos despertares ainda ausente',
    detail: 'O primeiro trecho não informa quantidade nem duração dos despertares.',
    sourceQuote: '“ainda acordo cansada em alguns dias”',
    kind: 'gap',
    coverage: 'direct',
    limitation: 'A lacuna orienta uma pergunta; não representa risco ou urgência.',
    handoffKind: 'open-question',
    resolvedByExcerptId: 'tele-excerpt-003',
  },
  {
    id: 'live-insight-003',
    excerptId: 'tele-excerpt-003',
    title: 'Três despertares relatados em duas noites',
    detail: 'A paciente informou frequência e retorno ao sono em parte dos episódios.',
    sourceQuote: '“acordei três vezes e voltei a dormir rápido em duas delas”',
    kind: 'patient-report',
    coverage: 'direct',
    limitation: 'O relato não confirma padrão, causa ou efeito clínico.',
    handoffKind: 'patient-report',
  },
  {
    id: 'live-insight-004',
    excerptId: 'tele-excerpt-004',
    title: 'Possível relação temporal citada pela paciente',
    detail: 'O jantar após 21h apareceu próximo aos despertares no relato, sem demonstrar causalidade.',
    sourceQuote: '“aconteceu nos dias em que jantei depois das nove”',
    kind: 'hypothesis',
    coverage: 'partial',
    limitation: 'Associação temporal não significa causa e não orienta conduta.',
    handoffKind: 'hypothesis',
  },
  {
    id: 'live-insight-005',
    excerptId: 'tele-excerpt-005',
    title: 'Divergência com a resposta da pré-consulta',
    detail: 'O relato atual menciona azia, enquanto a pré-consulta registrou ausência de sintoma novo.',
    sourceQuote: '“marquei que não havia sintoma novo, mas lembrei que tive azia”',
    kind: 'contradiction',
    coverage: 'direct',
    limitation: 'A divergência precisa ser esclarecida pelo médico; não classifica gravidade ou urgência.',
    handoffKind: 'open-question',
  },
  {
    id: 'live-insight-006',
    excerptId: 'tele-excerpt-007',
    title: 'Prioridade declarada para a consulta',
    detail: 'A paciente quer compreender os despertares e combinar um passo viável para sua rotina.',
    sourceQuote: '“um próximo passo que caiba na minha rotina”',
    kind: 'patient-report',
    coverage: 'direct',
    limitation: 'Preferência declarada; não equivale a decisão ou plano aprovado.',
    handoffKind: 'patient-priority',
  },
];

const liveInsightIds = new Set(liveInsights.map((insight) => insight.id));

const initialTeleconsultState: TeleconsultDemoState = {
  consentConfirmed: false,
  status: 'idle',
  visibleExcerptCount: 0,
  reviews: {},
  draftContent: '',
  draftStatus: 'empty',
  draftRejectionReason: null,
  sessionVersion: 0,
  reviewVersion: 0,
  auditEvents: [],
};

const insightKindPresentation: Record<
  LiveInsightKind,
  { label: string; tone: 'green' | 'amber' | 'blue' | 'rose'; layer: 'relato' | 'sintese_ia' }
> = {
  'patient-report': { label: 'Relato organizado', tone: 'blue', layer: 'relato' },
  gap: { label: 'Lacuna', tone: 'amber', layer: 'sintese_ia' },
  hypothesis: { label: 'Hipótese', tone: 'amber', layer: 'sintese_ia' },
  contradiction: { label: 'Divergência', tone: 'rose', layer: 'sintese_ia' },
};

const dismissalOptions = [
  'Duplicado',
  'Já esclarecido na consulta',
  'Fonte insuficiente',
  'Não ajuda no objetivo de hoje',
];

const draftRejectionOptions = [
  'Estrutura inadequada',
  'Faltam informações importantes',
  'Prefiro registrar manualmente',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeInsightReview(value: unknown): InsightReview | null {
  if (!isRecord(value)) return null;
  const decision = value.decision === 'pending' || value.decision === 'pinned' || value.decision === 'dismissed'
    ? value.decision
    : null;
  if (!decision) return null;
  return {
    decision,
    dismissalReason: typeof value.dismissalReason === 'string' ? value.dismissalReason : null,
  };
}

function normalizeTeleconsultState(value: unknown): TeleconsultDemoState {
  if (!isRecord(value)) return initialTeleconsultState;
  const restoredStatus: LiveSessionStatus = value.status === 'active' || value.status === 'paused' || value.status === 'ended'
    ? value.status
    : 'idle';
  const status: LiveSessionStatus = restoredStatus === 'active' ? 'paused' : restoredStatus;
  const draftStatus: DraftStatus = value.draftStatus === 'draft' || value.draftStatus === 'approved' || value.draftStatus === 'rejected'
    ? value.draftStatus
    : 'empty';
  const reviews = isRecord(value.reviews)
    ? Object.fromEntries(
        Object.entries(value.reviews).flatMap(([id, review]) => {
          const normalized = normalizeInsightReview(review);
          const knownInsight = liveInsightIds.has(id);
          return normalized && knownInsight ? [[id, normalized]] : [];
        }),
      )
    : {};
  const auditEvents = Array.isArray(value.auditEvents)
    ? value.auditEvents.flatMap((event) => {
        if (
          !isRecord(event) ||
          typeof event.id !== 'string' ||
          typeof event.at !== 'string' ||
          typeof event.label !== 'string'
        ) {
          return [];
        }
        return [{ id: event.id, at: event.at, label: event.label }];
      }).slice(-12)
    : [];

  return {
    consentConfirmed: typeof value.consentConfirmed === 'boolean' ? value.consentConfirmed : false,
    status,
    visibleExcerptCount: typeof value.visibleExcerptCount === 'number'
      ? Math.max(0, Math.min(transcriptScript.length, Math.floor(value.visibleExcerptCount)))
      : 0,
    reviews,
    draftContent: typeof value.draftContent === 'string' ? value.draftContent : '',
    draftStatus,
    draftRejectionReason: typeof value.draftRejectionReason === 'string' ? value.draftRejectionReason : null,
    sessionVersion: typeof value.sessionVersion === 'number' ? Math.max(0, Math.floor(value.sessionVersion)) : 0,
    reviewVersion: typeof value.reviewVersion === 'number' ? Math.max(0, Math.floor(value.reviewVersion)) : 0,
    auditEvents,
  };
}

function formatEventTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function appendAuditEvent(events: TeleconsultAuditEvent[], label: string) {
  const now = new Date();
  return [
    ...events,
    { id: `tele-audit-${now.getTime()}-${events.length + 1}`, at: formatEventTime(now), label },
  ].slice(-12);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível registrar o fechamento aprovado.';
}

function buildReviewDraft(insights: LiveInsight[]) {
  const reports = insights.filter((insight) => insight.kind === 'patient-report');
  const confirmationPoints = insights.filter(
    (insight) => insight.kind === 'gap' || insight.kind === 'contradiction',
  );
  const hypotheses = insights.filter((insight) => insight.kind === 'hypothesis');
  const sections = [
    reports.length > 0
      ? `RELATOS-CHAVE\n${reports.map((insight) => `- ${insight.title} [${insight.excerptId}]`).join('\n')}`
      : '',
    confirmationPoints.length > 0
      ? `PONTOS A CONFIRMAR\n${confirmationPoints.map((insight) => `- ${insight.title} [${insight.excerptId}]`).join('\n')}`
      : '',
    hypotheses.length > 0
      ? `HIPÓTESES NÃO CONFIRMADAS\n${hypotheses.map((insight) => `- ${insight.title} [${insight.excerptId}]`).join('\n')}`
      : '',
    'REVISÃO MÉDICA\n- Completar avaliação, interpretação e conduta manualmente.',
  ].filter(Boolean);
  return sections.join('\n\n');
}

function SessionStatus({ status }: { status: LiveSessionStatus }) {
  if (status === 'active') return <Status tone="green">Sessão ativa</Status>;
  if (status === 'paused') return <Status tone="amber">Sessão pausada</Status>;
  if (status === 'ended') return <Status tone="gray">Sessão encerrada</Status>;
  return <Status tone="gray">Aguardando início</Status>;
}

export function DoctorTeleconsultationAiWorkspace({
  encounterId,
  notes,
  onApplyDraft,
  onContinue,
  onNotesChange,
  onNotify,
  patientId,
  patientName,
}: {
  encounterId: string;
  notes: string;
  onApplyDraft: (draft: string) => void;
  onContinue: () => void;
  onNotesChange: (notes: string) => void;
  onNotify: (message: string) => void;
  patientId: string;
  patientName: string;
}) {
  const storageKey = `instituto-vivans-teleconsulta-ai-v1:${patientId}:${encounterId}`;
  const [session, setSession, hydrated] = useSessionDemoState(
    storageKey,
    initialTeleconsultState,
    normalizeTeleconsultState,
  );
  const [feedback, setFeedback] = useState('');
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const { recordConsultationClosure } = useCareDemo(patientId, encounterId);

  const excerptOrderById = useMemo(
    () => new Map(transcriptScript.map((excerpt, index) => [excerpt.id, index + 1])),
    [],
  );
  const excerptById = useMemo(
    () => new Map(transcriptScript.map((excerpt) => [excerpt.id, excerpt])),
    [],
  );
  const visibleExcerpts = transcriptScript.slice(0, session.visibleExcerptCount);
  const visibleInsights = liveInsights.filter(
    (insight) => (excerptOrderById.get(insight.excerptId) ?? Infinity) <= session.visibleExcerptCount,
  );
  const pinnedInsights = visibleInsights.filter(
    (insight) => session.reviews[insight.id]?.decision === 'pinned',
  );
  const pendingCount = visibleInsights.filter(
    (insight) => (session.reviews[insight.id]?.decision ?? 'pending') === 'pending',
  ).length;
  const missingDismissalReason = visibleInsights.some((insight) => {
    const review = session.reviews[insight.id];
    return review?.decision === 'dismissed' && !review.dismissalReason;
  });
  const canRevealNext = session.status === 'active' && session.visibleExcerptCount < transcriptScript.length;
  const canBuildDraft = pinnedInsights.length > 0 && !missingDismissalReason;
  const latestExcerpt = visibleExcerpts.at(-1) ?? null;
  const patientAvatar = getPatientAvatarIdentity(patientId, patientName);

  const recordApprovedClosure = (reviewVersion: number) => recordConsultationClosure({
    sessionVersion: session.sessionVersion,
    reviewVersion,
    content: session.draftContent,
    items: pinnedInsights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      kind: insight.handoffKind,
      sourceExcerptId: insight.excerptId,
      sourceTime: excerptById.get(insight.excerptId)?.at ?? 'tempo não localizado',
      sourceQuote: insight.sourceQuote,
      coverage: insight.coverage,
      limitation: insight.limitation,
    })),
    consentVersion: 'teleconsulta-transcricao-v1',
    serviceMode: 'deterministic-mock',
  });

  const updateWithAudit = (
    update: (current: TeleconsultDemoState) => TeleconsultDemoState,
    label: string,
  ) => {
    setSession((current) => {
      const updated = update(current);
      return { ...updated, auditEvents: appendAuditEvent(current.auditEvents, label) };
    });
  };

  const startSession = () => {
    updateWithAudit(
      (current) => ({
        ...current,
        consentConfirmed: true,
        status: 'active',
        visibleExcerptCount: 1,
        reviews: {},
        draftContent: '',
        draftStatus: 'empty',
        draftRejectionReason: null,
        sessionVersion: current.sessionVersion + 1,
      }),
      'Consulta demonstrativa iniciada.',
    );
    setFeedback('Consulta iniciada. Os controles desta tela são apenas visuais e não acessam câmera ou microfone.');
  };

  const revealNextExcerpt = () => {
    if (!canRevealNext) return;
    const nextCount = session.visibleExcerptCount + 1;
    const nextExcerpt = transcriptScript[nextCount - 1];
    updateWithAudit(
      (current) => ({ ...current, visibleExcerptCount: nextCount }),
      `Novo trecho fictício disponibilizado: ${nextExcerpt.id}.`,
    );
    const insightCount = liveInsights.filter((insight) => insight.excerptId === nextExcerpt.id).length;
    setFeedback(
      insightCount > 0
        ? `${insightCount} ${insightCount === 1 ? 'novo insight requer' : 'novos insights requerem'} revisão médica.`
        : 'Trecho incluído sem novo insight sugerido.',
    );
  };

  const setSessionStatus = (status: LiveSessionStatus) => {
    const label = status === 'paused'
      ? 'Sessão simulada pausada.'
      : status === 'active'
        ? 'Sessão simulada retomada.'
        : 'Sessão simulada encerrada.';
    updateWithAudit((current) => ({ ...current, status }), label);
    setFeedback(label);
  };

  const resetSession = () => {
    setSession((current) => ({
      ...initialTeleconsultState,
      sessionVersion: current.sessionVersion,
      reviewVersion: current.reviewVersion,
      auditEvents: appendAuditEvent(current.auditEvents, 'Nova simulação preparada; ciência precisa ser confirmada novamente.'),
    }));
    setFeedback('Nova simulação pronta. Confirme novamente a ciência específica.');
  };

  const setInsightDecision = (insightId: string, decision: LiveInsightDecision) => {
    setSession((current) => ({
      ...current,
      reviews: {
        ...current.reviews,
        [insightId]: {
          decision,
          dismissalReason: decision === 'dismissed'
            ? current.reviews[insightId]?.dismissalReason ?? null
            : null,
        },
      },
      draftStatus: current.draftStatus === 'approved' ? 'draft' : current.draftStatus,
      auditEvents: appendAuditEvent(
        current.auditEvents,
        decision === 'pinned'
          ? 'Insight fixado para o fechamento médico.'
          : decision === 'dismissed'
            ? 'Insight marcado para descarte; motivo ainda precisa ser registrado.'
            : 'Insight devolvido para revisão.',
      ),
    }));
    setFeedback('Decisão atualizada. Nenhum conteúdo foi enviado à paciente.');
  };

  const setDismissalReason = (insightId: string, reason: string | null) => {
    setSession((current) => ({
      ...current,
      reviews: {
        ...current.reviews,
        [insightId]: { decision: 'dismissed', dismissalReason: reason },
      },
    }));
    setFeedback(reason ? 'Motivo registrado.' : 'Escolha um motivo para concluir o descarte.');
  };

  const prepareDraft = () => {
    if (!canBuildDraft) {
      setFeedback('Fixe ao menos um insight e justifique todos os descartes antes de preparar o fechamento.');
      return;
    }
    const draftContent = buildReviewDraft(pinnedInsights);
    updateWithAudit(
      (current) => ({
        ...current,
        draftContent,
        draftStatus: 'draft',
        draftRejectionReason: null,
      }),
      'Rascunho de fechamento criado a partir dos itens fixados.',
    );
    setFeedback('Rascunho criado. Edite e revise antes de aplicar às notas.');
  };

  const approveDraft = async () => {
    if (session.status !== 'ended') {
      setFeedback('Encerre a sessão simulada antes de aprovar o fechamento.');
      return;
    }
    if (session.draftContent.trim().length < 20) {
      setFeedback('Complete o rascunho antes de aprovar.');
      return;
    }
    const nextVersion = session.reviewVersion + 1;
    try {
      const closure = await recordApprovedClosure(nextVersion);
      updateWithAudit(
        (current) => ({
          ...current,
          draftStatus: 'approved',
          draftRejectionReason: null,
          reviewVersion: nextVersion,
        }),
        `Rascunho revisado e aprovado para as notas: versão ${nextVersion}.`,
      );
      onApplyDraft(session.draftContent);
      const message = `Fechamento v${closure.version} aplicado às notas e liberado como fonte do plano.`;
      setFeedback(message);
      onNotify(message);
    } catch (error) {
      const message = getErrorMessage(error);
      setFeedback(message);
      onNotify(message);
    }
  };

  const rejectDraft = (reason: string) => {
    updateWithAudit(
      (current) => ({
        ...current,
        draftStatus: 'rejected',
        draftRejectionReason: reason,
      }),
      'Rascunho assistido rejeitado; conteúdo preservado na sessão demonstrativa.',
    );
    setFeedback('Rascunho rejeitado. As notas manuais continuam disponíveis.');
  };

  const reapplyApprovedDraft = async () => {
    if (!session.draftContent.trim() || session.draftStatus !== 'approved') return;
    try {
      await recordApprovedClosure(session.reviewVersion);
      onApplyDraft(session.draftContent);
      const message = `Versão ${session.reviewVersion} reaplicada às notas e mantida como fonte do plano.`;
      setFeedback(message);
      onNotify(message);
    } catch (error) {
      const message = getErrorMessage(error);
      setFeedback(message);
      onNotify(message);
    }
  };

  if (!hydrated) {
    return (
      <section aria-labelledby="teleconsult-ai-title" className="rounded-3xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Consulta</p>
        <h3 id="teleconsult-ai-title" className="mt-2 text-xl font-semibold">Preparando a sala...</h3>
      </section>
    );
  }

  return (
    <section aria-labelledby="teleconsult-ai-title" className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-[#dbe4f0] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <AiDraftBadge>Apoio da IA · revisar antes de usar</AiDraftBadge>
            <SessionStatus status={session.status} />
          </div>
          <h3 id="teleconsult-ai-title" className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">Consulta com {patientName}</h3>
          <p className="mt-1 text-sm leading-6 text-[#61718a]">Conduza a conversa. A IA apenas organiza os registros para a sua revisão.</p>
        </div>
        <p className="rounded-xl bg-[#f7faff] px-3 py-2 text-xs font-semibold leading-5 text-[#526681]">{pendingCount} ponto{pendingCount === 1 ? '' : 's'} para revisar</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
        <section
          aria-labelledby="teleconsult-room-title"
          className={cn(
            'overflow-hidden rounded-3xl border border-[#dbe4f0] bg-white',
            focusMode && 'fixed inset-3 z-[90] min-h-[calc(100dvh-1.5rem)] overflow-y-auto shadow-[0_28px_90px_rgba(3,19,45,0.45)]',
          )}
        >
          <div className="relative isolate overflow-hidden bg-[#03132d] p-4 text-white sm:p-5">
            <div aria-hidden="true" className="absolute inset-x-[12%] top-0 h-40 rounded-full bg-[#155b97]/25 blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#a9c8ee]">Sala de consulta</p>
                <h4 id="teleconsult-room-title" className="mt-1 text-lg font-semibold">{session.status === 'ended' ? 'Consulta encerrada' : 'Em conversa com a paciente'}</h4>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#e8f0fb]">
                <span className={cn('size-2 rounded-full', session.status === 'active' ? 'bg-[#71d3aa]' : 'bg-[#a9bdd8]')} />
                {session.status === 'active' ? 'Em andamento · 08:42' : session.status === 'paused' ? 'Em pausa' : 'Pronta para iniciar'}
              </span>
            </div>

            <div className="relative mt-4 flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_20%,#1c3c69_0%,#0a1d3d_54%,#03132d_100%)] p-5 sm:min-h-[420px]">
              <div className="flex flex-col items-center text-center">
                <PatientAvatar patient={patientAvatar} size="lg" className="!size-28 ring-[4px] ring-white/45 ring-offset-[#16355d] sm:!size-32" />
                <p className="mt-5 text-xl font-semibold tracking-[-0.025em]">{patientName}</p>
                <p className="mt-1 text-sm text-[#bfd0e6]">Paciente</p>
              </div>

              <div className="absolute right-3 top-3 w-[132px] rounded-2xl border border-white/15 bg-[#173158] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.25)] sm:right-5 sm:top-5 sm:w-[166px] sm:p-4">
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#dfeaf7]">
                  <span role="img" aria-label="Avatar do Dr. Guilherme Martins" className="relative grid size-16 overflow-hidden rounded-full bg-[#d8e7f3] sm:size-[76px]">
                    <span aria-hidden="true" className="absolute -bottom-[18%] left-1/2 h-[52%] w-[86%] -translate-x-1/2 rounded-t-[52%] bg-[#285786]" />
                    <span aria-hidden="true" className="absolute left-1/2 top-[23%] h-[48%] w-[48%] -translate-x-1/2 rounded-full bg-[#c98765]" />
                    <span aria-hidden="true" className="absolute left-1/2 top-[13%] h-[29%] w-[57%] -translate-x-1/2 rounded-t-[52%] bg-[#30313a]" />
                    <span aria-hidden="true" className="absolute left-[37%] top-[50%] size-[5%] rounded-full bg-[#302927]" />
                    <span aria-hidden="true" className="absolute right-[37%] top-[50%] size-[5%] rounded-full bg-[#302927]" />
                  </span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-white">Dr. Guilherme</p>
                <p className="mt-0.5 text-[11px] text-[#bcd0e9]">Você</p>
              </div>

              {session.status === 'idle' ? (
                <button
                  type="button"
                  onClick={startSession}
                  className="absolute bottom-5 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#071a3a] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]"
                >
                  <VideoCamera aria-hidden="true" size={19} />
                  Iniciar atendimento
                </button>
              ) : session.status === 'paused' ? (
                <button type="button" onClick={() => setSessionStatus('active')} className="absolute bottom-5 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#071a3a] shadow-[0_10px_24px_rgba(0,0,0,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]">Retomar atendimento</button>
              ) : null}
            </div>

            <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label={microphoneEnabled ? 'Desativar microfone visual' : 'Ativar microfone visual'}
                aria-pressed={microphoneEnabled}
                onClick={() => {
                  setMicrophoneEnabled((current) => !current);
                  setFeedback(microphoneEnabled ? 'Microfone visual desativado.' : 'Microfone visual ativado.');
                }}
                className={cn('grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]', microphoneEnabled ? 'bg-white/12 text-white hover:bg-white/20' : 'bg-[#a2494a] text-white hover:bg-[#bc5b5d]')}
              >
                {microphoneEnabled ? <Microphone aria-hidden="true" size={20} /> : <MicrophoneSlash aria-hidden="true" size={20} />}
              </button>
              <button
                type="button"
                aria-label={cameraEnabled ? 'Desativar câmera visual' : 'Ativar câmera visual'}
                aria-pressed={cameraEnabled}
                onClick={() => {
                  setCameraEnabled((current) => !current);
                  setFeedback(cameraEnabled ? 'Câmera visual desativada.' : 'Câmera visual ativada.');
                }}
                className={cn('grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]', cameraEnabled ? 'bg-white/12 text-white hover:bg-white/20' : 'bg-[#a2494a] text-white hover:bg-[#bc5b5d]')}
              >
                {cameraEnabled ? <VideoCamera aria-hidden="true" size={20} /> : <VideoCameraSlash aria-hidden="true" size={20} />}
              </button>
              <button
                type="button"
                aria-label={focusMode ? 'Sair da tela cheia' : 'Abrir tela cheia'}
                aria-pressed={focusMode}
                onClick={() => {
                  setFocusMode((current) => !current);
                  setFeedback(focusMode ? 'Tela cheia fechada.' : 'Tela cheia aberta.');
                }}
                className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-xl bg-white/12 px-3 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]"
              >
                {focusMode ? <CornersIn aria-hidden="true" size={20} /> : <CornersOut aria-hidden="true" size={20} />}
              </button>
              {session.status === 'active' ? (
                <button type="button" onClick={() => setSessionStatus('paused')} className="min-h-11 cursor-pointer rounded-xl bg-white/12 px-4 text-xs font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]">Pausar</button>
              ) : null}
              {session.status !== 'ended' ? (
                <button type="button" onClick={() => setSessionStatus('ended')} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#b74e50] px-4 text-xs font-bold text-white transition-colors hover:bg-[#ca6062] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]"><PhoneDisconnect aria-hidden="true" size={18} />Encerrar</button>
              ) : (
                <button type="button" onClick={resetSession} className="min-h-11 cursor-pointer rounded-xl bg-white px-4 text-xs font-bold text-[#071a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03132d]">Nova consulta</button>
              )}
            </div>
            <p className="relative mt-3 text-center text-[11px] leading-5 text-[#b7c9df]">Câmera e microfone são controles visuais neste ambiente; nenhum dispositivo é acessado.</p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Transcrição incremental</p>
                <h4 className="mt-2 text-lg font-semibold text-[#071a3a]">Trechos de origem preservados</h4>
              </div>
              {latestExcerpt ? <span className="text-xs font-bold text-[#7890ac]">Último trecho · {latestExcerpt.at}</span> : null}
            </div>

            {visibleExcerpts.length > 0 ? (
              <ol className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1" aria-label="Transcrição da consulta">
                {visibleExcerpts.map((excerpt) => (
                  <li key={excerpt.id} className={cn('rounded-2xl border p-4', excerpt.speaker === 'Paciente' ? 'border-[#c9d8ec] bg-[#f7faff]' : 'border-[#dbe4f0] bg-[#f7faff]')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-xs text-[#405675]">{excerpt.speaker}</strong>
                      <time className="text-[11px] font-bold text-[#7890ac]">{excerpt.at} · {excerpt.id}</time>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#526681]">{excerpt.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-[#cbd8e9] bg-[#f7faff] p-5 text-sm leading-6 text-[#61718a]">Os trechos aparecem quando você inicia o atendimento.</p>
            )}

            <button
              type="button"
              onClick={revealNextExcerpt}
              disabled={!canRevealNext}
              className="mt-4 min-h-12 w-full cursor-pointer rounded-xl border border-[#9bb8db] bg-white px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#dbe4f0] disabled:text-[#94a3b8] disabled:hover:bg-white"
            >
              {session.visibleExcerptCount >= transcriptScript.length ? 'Todos os trechos foram exibidos' : session.status === 'paused' ? 'Assistência pausada' : session.status === 'ended' ? 'Sessão encerrada' : 'Simular próximo trecho'}
            </button>
          </div>
        </section>

        <aside aria-labelledby="live-insights-title" className="doctor-sticky-offset h-fit rounded-3xl border border-[#c9d8ec] bg-[#f7faff] p-5 sm:p-6 xl:sticky xl:top-[calc(var(--doctor-chrome-current-height)+1rem)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#456b9c]">Apoio em tempo real</p>
              <h4 id="live-insights-title" className="mt-2 text-lg font-semibold text-[#071a3a]">Pontos para o médico revisar</h4>
            </div>
            <Status tone={pendingCount > 0 ? 'amber' : 'gray'}>{pendingCount} pendentes</Status>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#61718a]">Cada cartão aponta o trecho exato. Fixar não aprova diagnóstico, conduta ou mensagem.</p>

          {visibleInsights.length > 0 ? (
            <div className="mt-4 max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {visibleInsights.map((insight) => {
                const review = session.reviews[insight.id] ?? { decision: 'pending' as const, dismissalReason: null };
                const presentation = insightKindPresentation[insight.kind];
                const source = excerptById.get(insight.excerptId);
                const resolved = Boolean(
                  insight.resolvedByExcerptId &&
                  (excerptOrderById.get(insight.resolvedByExcerptId) ?? Infinity) <= session.visibleExcerptCount,
                );
                return (
                  <article key={insight.id} className={cn('rounded-2xl border bg-white p-4', review.decision === 'pinned' ? 'border-[#8fb0d9]' : review.decision === 'dismissed' ? 'border-[#dbe4f0] opacity-80' : 'border-[#dce6f2]')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ClinicalLayerBadge layer={presentation.layer} />
                        <Status tone={presentation.tone}>{presentation.label}</Status>
                      </div>
                      <span className="text-[11px] font-bold text-[#7890ac]">{source?.at} · {insight.coverage === 'direct' ? 'fonte direta' : 'cobertura parcial'}</span>
                    </div>
                    <h5 className="mt-3 text-sm font-bold leading-6 text-[#071a3a]">{insight.title}</h5>
                    <p className="mt-1 text-xs leading-5 text-[#61718a]">{insight.detail}</p>
                    <blockquote className="mt-3 border-l-2 border-[#9eb9dd] pl-3 text-xs italic leading-5 text-[#526681]">{insight.sourceQuote}</blockquote>
                    <p className="mt-2 break-all text-[11px] font-semibold text-[#7890ac]">Fonte: {insight.excerptId}</p>
                    {resolved ? <p className="mt-3 rounded-xl bg-[#edf3fb] p-3 text-xs font-semibold leading-5 text-[#124da0]">Lacuna respondida no trecho {insight.resolvedByExcerptId}; confirme se ainda merece a pauta.</p> : null}

                    <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label={`Decisão sobre ${insight.title}`}>
                      <button
                        type="button"
                        aria-pressed={review.decision === 'pinned'}
                        onClick={() => setInsightDecision(insight.id, 'pinned')}
                        className={cn('min-h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2', review.decision === 'pinned' ? 'border-[#124da0] bg-[#124da0] text-white' : 'border-[#9bb8db] text-[#124da0] hover:bg-[#edf3fb]')}
                      >
                        Fixar
                      </button>
                      <button
                        type="button"
                        aria-pressed={review.decision === 'dismissed'}
                        onClick={() => setInsightDecision(insight.id, 'dismissed')}
                        className={cn('min-h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2', review.decision === 'dismissed' ? 'border-[#94a3b8] bg-[#eef2f7] text-[#405675]' : 'border-[#dbe4f0] text-[#61718a] hover:bg-[#f4f7fc]')}
                      >
                        Descartar
                      </button>
                    </div>

                    {review.decision === 'dismissed' ? (
                      <label className="mt-3 block text-xs font-bold text-[#405675]">
                        Motivo do descarte
                        <select
                          value={review.dismissalReason ?? ''}
                          onChange={(event) => setDismissalReason(insight.id, event.target.value || null)}
                          className="mt-2 min-h-11 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 text-sm font-normal text-[#405675] outline-none focus:ring-2 focus:ring-[#79a8df]"
                        >
                          <option value="">Selecione</option>
                          {dismissalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                    ) : null}

                    <details className="mt-3 rounded-xl border border-[#dfe7f1] bg-[#f7faff] p-3">
                      <summary className="cursor-pointer text-xs font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Ver limite do insight</summary>
                      <p className="mt-2 text-xs leading-5 text-[#61718a]">{insight.limitation}</p>
                    </details>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-[#c9d8ec] bg-white p-5 text-sm leading-6 text-[#61718a]">Os pontos para revisar aparecem quando há um registro organizável na conversa.</p>
          )}
        </aside>
      </div>

      <section aria-labelledby="teleconsult-closing-title" className="rounded-3xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Fechamento da consulta</p>
            <h4 id="teleconsult-closing-title" className="mt-2 text-xl font-semibold text-[#071a3a]">Dos itens fixados para as notas médicas</h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">O rascunho separa relatos, pontos a confirmar e hipóteses. Só entra nas notas depois de edição e aprovação explícita.</p>
          </div>
          <Status tone={session.draftStatus === 'approved' ? 'blue' : session.draftStatus === 'rejected' ? 'gray' : session.draftStatus === 'draft' ? 'amber' : 'gray'}>
            {session.draftStatus === 'approved' ? `Aprovado · v${session.reviewVersion}` : session.draftStatus === 'rejected' ? 'Rejeitado' : session.draftStatus === 'draft' ? 'Rascunho em revisão' : 'Ainda não criado'}
          </Status>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#071a3a]">Rascunho assistido</p>
              <button
                type="button"
                onClick={prepareDraft}
                disabled={!canBuildDraft}
                className="min-h-11 cursor-pointer rounded-xl border border-[#9bb8db] px-4 text-xs font-bold text-[#124da0] hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#dbe4f0] disabled:text-[#94a3b8] disabled:hover:bg-white"
              >
                {session.draftContent ? 'Recriar com itens fixados' : 'Preparar rascunho'}
              </button>
            </div>
            <textarea
              aria-label="Rascunho assistido do fechamento"
              value={session.draftContent}
              onChange={(event) => setSession((current) => ({ ...current, draftContent: event.target.value, draftStatus: 'draft', draftRejectionReason: null }))}
              placeholder="Fixe ao menos um insight para criar o rascunho."
              className="mt-3 min-h-72 w-full rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4 font-mono text-xs leading-6 text-[#405675] outline-none focus:ring-2 focus:ring-[#79a8df]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {session.draftStatus === 'approved' ? (
                <>
                  <button type="button" onClick={reapplyApprovedDraft} className="min-h-11 cursor-pointer rounded-xl bg-[#124da0] px-4 text-sm font-bold text-white hover:bg-[#0f3f83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Reaplicar versão aprovada</button>
                  <button type="button" onClick={() => setSession((current) => ({ ...current, draftStatus: 'draft' }))} className="min-h-11 cursor-pointer rounded-xl border border-[#cbd8e9] px-4 text-sm font-bold text-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Criar nova versão</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={approveDraft}
                  disabled={session.draftStatus !== 'draft' || session.status !== 'ended'}
                  className="min-h-11 cursor-pointer rounded-xl bg-[#124da0] px-4 text-sm font-bold text-white hover:bg-[#0f3f83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                >
                  Aprovar, aplicar às notas e liberar para o plano
                </button>
              )}
            </div>
            {session.draftStatus === 'draft' ? (
              <label className="mt-4 block text-xs font-bold text-[#405675]">
                Rejeitar este rascunho
                <select
                  value=""
                  onChange={(event) => event.target.value && rejectDraft(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 text-sm font-normal text-[#405675] outline-none focus:ring-2 focus:ring-[#79a8df]"
                >
                  <option value="">Escolha um motivo para rejeitar</option>
                  {draftRejectionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            ) : null}
            {session.draftStatus === 'rejected' && session.draftRejectionReason ? <p className="mt-3 rounded-xl bg-[#eef2f7] p-3 text-xs leading-5 text-[#526681]">Motivo registrado: {session.draftRejectionReason}. O conteúdo permanece preservado somente nesta sessão demonstrativa.</p> : null}
          </div>

          <div>
            <label htmlFor="teleconsult-notes" className="text-sm font-bold text-[#071a3a]">Notas médicas</label>
            <textarea
              id="teleconsult-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              className="mt-3 min-h-72 w-full rounded-2xl border border-[#dbe4f0] p-4 text-sm leading-6 text-[#405675] outline-none focus:ring-2 focus:ring-[#79a8df]"
            />
            <p className="mt-3 text-xs leading-5 text-[#7890ac]">Este campo continua sob autoria médica. Aplicar o rascunho não publica, prescreve nem sincroniza prontuário.</p>
            <button type="button" onClick={onContinue} className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-[#03132d] px-4 text-sm font-bold text-white hover:bg-[#082553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Construir próximo plano</button>
          </div>
        </div>

        <details className="mt-5 rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4">
          <summary className="cursor-pointer text-sm font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Auditoria da sessão demonstrativa</summary>
          {session.auditEvents.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {[...session.auditEvents].reverse().map((event) => <li key={event.id} className="flex flex-col gap-1 rounded-xl bg-white p-3 text-xs sm:flex-row sm:items-start sm:justify-between"><span className="leading-5 text-[#526681]">{event.label}</span><time className="shrink-0 font-bold text-[#7890ac]">{event.at}</time></li>)}
            </ol>
          ) : <p className="mt-3 text-xs leading-5 text-[#61718a]">Nenhuma transição registrada nesta sessão.</p>}
          <p className="mt-3 text-[11px] leading-5 text-[#7890ac]">A auditoria guarda transições e contagens, não o conteúdo clínico original.</p>
        </details>
      </section>

      <p aria-live="polite" className={cn('rounded-2xl border p-4 text-sm font-semibold', feedback ? 'border-[#c9d8ec] bg-[#edf3fb] text-[#124da0]' : 'border-[#dbe4f0] bg-[#f7faff] text-[#61718a]')}>
        {feedback || 'Aguardando uma ação. Nenhuma orientação será enviada automaticamente.'}
      </p>

      <p className="rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 text-xs leading-5 text-[#61718a]">A IA organiza relatos e lacunas com referência à fonte. Diagnóstico, conduta, prescrição e qualquer mensagem à paciente seguem sob revisão e aprovação médica.</p>
    </section>
  );
}
