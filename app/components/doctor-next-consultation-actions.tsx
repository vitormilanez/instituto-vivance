'use client';

import {
  ArrowRight,
  BellRinging,
  ChartLineUp,
  ClipboardText,
  FileText,
  Flask,
  ListChecks,
  X,
} from '@phosphor-icons/react';
import {
  type ComponentType,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ClinicalLayerBadge, SimulationDisclaimer } from './clinical';
import { useCareDemo } from './care-demo-store';
import { useClinicalIntelligence } from './clinical-intelligence-context';
import { examReviewPresentation, selectExamIntake } from './care-workflow';
import type { CareCheckIn, CarePlanAction, CarePlanVersion } from './care-demo-types';
import { getPatientDossierHref, getPatientMessagesHref } from './demo-routes';
import { cn, NavigationLink as Link, Status } from './shared';

type ConsultationContextAction = 'summary' | 'plan' | 'adherence' | 'past-exams' | 'new-exams';

type ActionDefinition = {
  id: ConsultationContextAction;
  label: string;
  detail: string;
  Icon: ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'duotone' | 'bold' }>;
  tone: 'navy' | 'blue' | 'green' | 'amber';
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2';

const planExperienceLabel = {
  easy: 'Fácil de seguir',
  partial: 'Parcialmente fácil',
  difficult: 'Difícil de seguir',
  'not-applicable': 'Não se aplica',
} as const;

export function DoctorNextConsultationActions({
  patientId,
  encounterId,
  patientName,
  examReminderSent,
  onSendExamReminder,
}: {
  patientId: string;
  encounterId: string;
  patientName: string;
  examReminderSent: boolean;
  onSendExamReminder: () => void;
}) {
  const [openAction, setOpenAction] = useState<ConsultationContextAction | null>(null);
  const { exams, hydrated: examsHydrated } = useClinicalIntelligence();
  const intake = selectExamIntake(exams, patientId, examReminderSent);
  const {
    actionConfirmations,
    checkIns,
    latestCheckIn,
    latestCarePlan,
    latestPublishedCarePlan,
  } = useCareDemo(patientId, encounterId);
  const visiblePlan = latestPublishedCarePlan ?? latestCarePlan;
  const visibleActions = visiblePlan?.actions.filter((action) => action.active) ?? [];
  const latestConfirmationByAction = new Map<string, boolean>();

  for (const confirmation of actionConfirmations) {
    if (!visiblePlan || confirmation.planId === visiblePlan.id) {
      latestConfirmationByAction.set(confirmation.actionId, confirmation.completed);
    }
  }

  const confirmedActionCount = [...latestConfirmationByAction.values()].filter(Boolean).length;
  const hasLiveAdherence = checkIns.length > 0 || actionConfirmations.length > 0;
  const adherenceDetail = hasLiveAdherence
    ? `${checkIns.length} check-in${checkIns.length === 1 ? '' : 's'} nesta sessão`
    : '82% no ciclo demonstrativo';

  const actions: ActionDefinition[] = [
    {
      id: 'summary',
      label: 'Resumo da última consulta',
      detail: 'Revisado em 24 ago',
      Icon: ClipboardText,
      tone: 'navy',
    },
    {
      id: 'plan',
      label: 'Ver planos',
      detail: visiblePlan ? `v${visiblePlan.version} · ${visiblePlan.status === 'published' ? 'publicado' : 'em revisão'}` : 'Sem plano publicado',
      Icon: ListChecks,
      tone: 'green',
    },
    {
      id: 'adherence',
      label: 'Adesão ao plano',
      detail: adherenceDetail,
      Icon: ChartLineUp,
      tone: 'blue',
    },
    {
      id: 'past-exams',
      label: 'Histórico de exames',
      detail: examsHydrated ? `${intake.patientExams.length} documentos recebidos` : 'Carregando exames',
      Icon: Flask,
      tone: 'navy',
    },
    {
      id: 'new-exams',
      label: 'Novos exames',
      detail: examsHydrated ? intake.label : 'Carregando exames',
      Icon: BellRinging,
      tone: intake.tone,
    },
  ];

  return (
    <>
      <section aria-labelledby="next-consultation-context-title" className="mt-6 border-t border-[#dce5f1] pt-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#506681]">Antes de atender</p>
            <h3 id="next-consultation-context-title" className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#071a3a]">Contexto da paciente</h3>
          </div>
          <p className="text-xs leading-5 text-[#61718a]">Dados fictícios com fontes preservadas.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {actions.map((action) => (
            <ContextActionButton key={action.id} action={action} onClick={() => setOpenAction(action.id)} />
          ))}
        </div>
      </section>

      {openAction ? (
        <ConsultationContextSheet
          action={openAction}
          patientId={patientId}
          patientName={patientName}
          plan={visiblePlan}
          visibleActions={visibleActions}
          confirmedActionCount={confirmedActionCount}
          checkInCount={checkIns.length}
          latestCheckIn={latestCheckIn}
          hasLiveAdherence={hasLiveAdherence}
          examReminderSent={examReminderSent}
          onSendExamReminder={onSendExamReminder}
          onClose={() => setOpenAction(null)}
        />
      ) : null}
    </>
  );
}

function ContextActionButton({ action, onClick }: { action: ActionDefinition; onClick: () => void }) {
  const tones = {
    navy: 'border-[#d8e3f2] bg-[#f8fbff] hover:border-[#a9c0df] hover:bg-[#f1f6fd]',
    blue: 'border-[#d7e4f4] bg-[#f7faff] hover:border-[#aac5e7] hover:bg-[#f1f6fd]',
    green: 'border-[#cde3db] bg-[#f7fbf9] hover:border-[#9fc9bd] hover:bg-[#eff8f4]',
    amber: 'border-[#ead9a7] bg-[#fffaf0] hover:border-[#d9bf70] hover:bg-[#fff6df]',
  };
  const iconTones = {
    navy: 'bg-[#e8f0fb] text-[#274b7d]',
    blue: 'bg-[#edf3fb] text-[#124da0]',
    green: 'bg-[#e7f4ef] text-[#0b6a5b]',
    amber: 'bg-[#fff0ca] text-[#8b5a06]',
  };
  const Icon = action.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex min-h-[104px] cursor-pointer flex-col items-start rounded-xl border p-3.5 text-left transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(3,19,45,0.07)] active:translate-y-0',
        tones[action.tone],
        focusRing,
      )}
    >
      <span className={cn('grid size-8 place-items-center rounded-lg', iconTones[action.tone])}>
        <Icon aria-hidden="true" size={18} weight="duotone" />
      </span>
      <span className="mt-3 pr-4 text-xs font-bold leading-4 text-[#071a3a]">{action.label}</span>
      <span className="mt-1 text-[11px] leading-4 text-[#61718a]">{action.detail}</span>
      <ArrowRight aria-hidden="true" size={14} weight="bold" className="absolute bottom-3.5 right-3.5 text-[#91a6c1] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ConsultationContextSheet({
  action,
  patientId,
  patientName,
  plan,
  visibleActions,
  confirmedActionCount,
  checkInCount,
  latestCheckIn,
  hasLiveAdherence,
  examReminderSent,
  onSendExamReminder,
  onClose,
}: {
  action: ConsultationContextAction;
  patientId: string;
  patientName: string;
  plan: CarePlanVersion | null;
  visibleActions: CarePlanAction[];
  confirmedActionCount: number;
  checkInCount: number;
  latestCheckIn: CareCheckIn | null;
  hasLiveAdherence: boolean;
  examReminderSent: boolean;
  onSendExamReminder: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const label = {
    summary: 'Resumo da última consulta',
    plan: 'Plano de cuidado',
    adherence: 'Adesão ao plano',
    'past-exams': 'Histórico de exames',
    'new-exams': 'Status do envio de novos exames',
  }[action];

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center px-3 pb-3 sm:items-center sm:p-6">
      <button type="button" aria-label={`Fechar ${label}`} onClick={onClose} className="absolute inset-0 bg-[#071a3a]/45 backdrop-blur-[2px]" />
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="next-consultation-context-sheet-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="relative z-10 max-h-[min(780px,calc(100vh-24px))] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-white/70 bg-white shadow-[0_28px_76px_rgba(3,19,45,0.3)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e4ebf4] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Pré-consulta · {patientName}</p>
            <h2 id="next-consultation-context-sheet-title" className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#071a3a]">{label}</h2>
          </div>
          <button type="button" onClick={onClose} className={cn('grid size-11 place-items-center rounded-xl text-[#50627f] hover:bg-[#edf3fb]', focusRing)} aria-label="Fechar">
            <X aria-hidden="true" size={21} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {action === 'summary' ? <LastConsultationPanel patientId={patientId} /> : null}
          {action === 'plan' ? <CarePlanPanel patientId={patientId} plan={plan} visibleActions={visibleActions} /> : null}
          {action === 'adherence' ? (
            <AdherencePanel
              patientId={patientId}
              checkInCount={checkInCount}
              latestCheckIn={latestCheckIn}
              hasLiveAdherence={hasLiveAdherence}
              confirmedActionCount={confirmedActionCount}
              actionCount={visibleActions.length}
            />
          ) : null}
          {action === 'past-exams' ? <PastExamsPanel patientId={patientId} /> : null}
          {action === 'new-exams' ? (
            <NewExamsPanel
              patientId={patientId}
              examReminderSent={examReminderSent}
              onSendExamReminder={onSendExamReminder}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function LastConsultationPanel({ patientId }: { patientId: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClinicalLayerBadge layer="decisao_medica" />
        <Status tone="green">Revisado em 24 ago</Status>
      </div>
      <section className="mt-5 rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Resumo aprovado do retorno anterior</p>
        <p className="mt-3 text-base font-semibold leading-7 text-[#071a3a]">Evolução consistente de peso e boa adesão; o sono ficou abaixo do padrão pessoal em quatro noites.</p>
        <p className="mt-3 text-sm leading-6 text-[#405675]">Para esta conversa, ficaram registrados: validar despertares noturnos, confirmar a tolerância ao plano atual e decidir o foco da próxima quinzena.</p>
      </section>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Peso" value="−3,2 kg" detail="1 jul–1 set · fontes identificadas" />
        <Metric label="Adesão" value="82%" detail="registros autorrelatados" />
        <Metric label="Sono médio" value="6h12" detail="fonte registrada" />
      </div>
      <SimulationDisclaimer>Este resumo foi revisado pelo médico no mock. Ele não substitui os relatos, registros e documentos originais.</SimulationDisclaimer>
      <Link href={getPatientDossierHref(patientId)} className={cn('mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9bb8db] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb]', focusRing)}>
        Abrir prontuário completo
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </div>
  );
}

function CarePlanPanel({
  patientId,
  plan,
  visibleActions,
}: {
  patientId: string;
  plan: CarePlanVersion | null;
  visibleActions: CarePlanAction[];
}) {
  if (!plan) {
    return (
      <div>
        <SimulationDisclaimer>Nenhum plano foi publicado para esta paciente nesta demonstração. Criar, aprovar e publicar um plano continuam sendo ações do médico.</SimulationDisclaimer>
        <Link href={getPatientDossierHref(patientId)} className={cn('mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9bb8db] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb]', focusRing)}>
          Abrir prontuário
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
    );
  }

  const status = plan.status === 'published'
    ? { label: 'Publicado para a paciente', tone: 'green' as const }
    : plan.status === 'approved'
      ? { label: 'Aprovado pelo médico', tone: 'blue' as const }
      : { label: 'Ainda não publicado', tone: 'amber' as const };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ClinicalLayerBadge layer="decisao_medica" />
          <h3 className="mt-3 text-lg font-semibold text-[#071a3a]">{plan.title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#61718a]">Versão {plan.version} · {plan.publishedAt ?? plan.updatedAt}</p>
        </div>
        <Status tone={status.tone}>{status.label}</Status>
      </div>
      <section className="mt-5 rounded-2xl bg-[#f4f7fc] p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Objetivo publicado</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#071a3a]">{plan.objective}</p>
        <p className="mt-3 text-sm leading-6 text-[#526681]">{plan.introduction}</p>
      </section>
      <section className="mt-5" aria-labelledby="plan-actions-title">
        <h3 id="plan-actions-title" className="text-sm font-bold text-[#071a3a]">Ações visíveis para a paciente</h3>
        <div className="mt-3 space-y-2.5">
          {visibleActions.map((action, index) => (
            <article key={action.id} className="flex items-start gap-3 rounded-xl border border-[#dbe4f0] bg-white p-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e7f4ef] text-xs font-bold text-[#0b6a5b]">{index + 1}</span>
              <div>
                <p className="text-sm font-bold leading-5 text-[#071a3a]">{action.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#61718a]">{action.cadence}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <p className="mt-4 text-xs leading-5 text-[#61718a]">O plano organiza o combinado; ele não substitui prescrição, prontuário nem orientação para situações urgentes.</p>
      <Link href={getPatientDossierHref(patientId)} className={cn('mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9bb8db] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb]', focusRing)}>
        Abrir prontuário completo
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </div>
  );
}

function AdherencePanel({
  patientId,
  checkInCount,
  latestCheckIn,
  hasLiveAdherence,
  confirmedActionCount,
  actionCount,
}: {
  patientId: string;
  checkInCount: number;
  latestCheckIn: CareCheckIn | null;
  hasLiveAdherence: boolean;
  confirmedActionCount: number;
  actionCount: number;
}) {
  const latestResponse = latestCheckIn?.originalText || '“Mais saciedade, sono pior nesta semana e nenhum sintoma novo.”';
  const checkInDetail = hasLiveAdherence
    ? `${checkInCount} registro${checkInCount === 1 ? '' : 's'} nesta sessão`
    : '11 de 14 no ciclo demonstrativo';
  const actionDetail = hasLiveAdherence
    ? `${confirmedActionCount} de ${actionCount} ações confirmadas`
    : '2 de 3 ações confirmadas no ciclo';
  const experience = latestCheckIn
    ? planExperienceLabel[latestCheckIn.planExperience]
    : 'Parcialmente fácil';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <ClinicalLayerBadge layer="relato" />
          <p className="mt-3 text-sm leading-6 text-[#405675]">Veja como {patientId === 'pac-demo-001' ? 'Marina' : 'a paciente'} está respondendo ao protocolo pelos próprios registros.</p>
        </div>
        <Status tone="blue">Acompanhar na consulta</Status>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Check-ins" value={hasLiveAdherence ? String(checkInCount) : '11/14'} detail={checkInDetail} />
        <Metric label="Ações do plano" value={hasLiveAdherence ? `${confirmedActionCount}/${actionCount}` : '2/3'} detail={actionDetail} />
        <Metric label="Experiência relatada" value={experience} detail="no último check-in" />
      </div>
      <section className="mt-4 rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#506681]">Último relato preservado</p>
        <blockquote className="mt-2 border-l-2 border-[#9eb9dd] pl-3 text-sm italic leading-6 text-[#405675]">{latestResponse}</blockquote>
        <p className="mt-3 text-xs leading-5 text-[#61718a]">Os registros mostram frequência e percepção da paciente; não equivalem a resposta clínica, diagnóstico ou ajuste de conduta.</p>
      </section>
      <Link href={getPatientDossierHref(patientId)} className={cn('mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9bb8db] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb]', focusRing)}>
        Abrir histórico e fontes
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </div>
  );
}

function PastExamsPanel({ patientId }: { patientId: string }) {
  const { exams } = useClinicalIntelligence();
  const { patientExams } = selectExamIntake(exams, patientId);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClinicalLayerBadge layer="fato" />
        <Status tone="blue">{patientExams.length} documentos recebidos</Status>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#405675]">Os arquivos originais permanecem a fonte principal. Os valores abaixo são transcrições demonstrativas, sem interpretação de normalidade, risco ou conduta.</p>
      <div className="mt-5 space-y-3">
        {patientExams.map((exam) => (
          <article key={exam.id} className="rounded-2xl border border-[#dbe4f0] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#071a3a]">{exam.title}</h3>
                <p className="mt-1 text-xs text-[#61718a]">Recebido em {exam.receivedAt} · {exam.laboratory} · {exam.submittedByLabel}</p>
              </div>
              <Status tone={examReviewPresentation(exam).tone}>{examReviewPresentation(exam).label}</Status>
            </div>
            <ul className="mt-4 grid gap-2 text-sm text-[#405675] sm:grid-cols-3">
              {exam.fields.filter((field) => field.included).map((field) => <li key={field.id} className="rounded-xl bg-[#f7faff] px-3 py-2">{field.label} · {field.value} {field.unit}{exam.reviewStatus !== 'approved' ? ' · não confirmado' : ''}</li>)}
            </ul>
            <Link href={`${getPatientDossierHref(patientId)}#patient-documents`} className={cn('mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#124da0] underline underline-offset-4', focusRing)}>
              <FileText aria-hidden="true" size={18} />
              Conferir documento e fontes
            </Link>
          </article>
        ))}
      </div>
      {patientExams.length === 0 ? <p className="mt-4 text-sm text-[#61718a]">Nenhum exame recebido neste acompanhamento.</p> : null}
    </div>
  );
}

function NewExamsPanel({
  patientId,
  examReminderSent,
  onSendExamReminder,
}: {
  patientId: string;
  examReminderSent: boolean;
  onSendExamReminder: () => void;
}) {
  const { exams, hydrated } = useClinicalIntelligence();
  const intake = selectExamIntake(exams, patientId, examReminderSent);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClinicalLayerBadge layer="fato" />
        <Status tone={intake.tone}>{hydrated ? intake.label : 'Carregando exames'}</Status>
      </div>
      <section className="mt-5 rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Documentos do acompanhamento</p>
        <p className="mt-2 text-base font-semibold text-[#071a3a]">{intake.latest?.title ?? 'Aguardando o primeiro documento'}</p>
        <p className="mt-2 text-sm leading-6 text-[#405675]">{intake.latest ? `Recebido em ${intake.latest.receivedAt}. ${intake.pendingCount > 0 ? 'A próxima ação é a conferência médica.' : 'A revisão foi concluída; não há envio pendente registrado.'}` : 'Nenhum exame consta neste acompanhamento.'}</p>
      </section>
      <div className="mt-4 rounded-xl border border-dashed border-[#c7d5e7] bg-white p-4">
        <p className="text-sm font-bold text-[#071a3a]">{intake.latest ? 'O documento recebido já está disponível no prontuário.' : examReminderSent ? 'A paciente foi lembrada de enviar os documentos.' : 'Confira o envio antes de iniciar a consulta.'}</p>
        <p className="mt-1 text-xs leading-5 text-[#61718a]">O lembrete é administrativo: não cria pedido, prescrição ou orientação clínica nova.</p>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {!intake.latest ? <button
          type="button"
          disabled={!hydrated || !intake.canRemind}
          onClick={onSendExamReminder}
          className={cn('inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0b2854] disabled:cursor-not-allowed disabled:bg-[#91a2b9]', focusRing)}
        >
          <BellRinging aria-hidden="true" size={18} />
          {examReminderSent ? 'Lembrete enviado' : 'Enviar lembrete'}
        </button> : <Link href={`${getPatientDossierHref(patientId)}#patient-documents`} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white', focusRing)}>Conferir exames recebidos</Link>}
        <Link href={getPatientMessagesHref(patientId)} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#9bb8db] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb]', focusRing)}>
          Abrir conversa com a paciente
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[#dbe4f0] bg-white p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#61718a]">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-[#071a3a]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#61718a]">{detail}</p>
    </div>
  );
}
