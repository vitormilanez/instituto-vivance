'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCareDemo } from './care-demo-store';
import type {
  CareConsultationClosure,
  CareConsultationClosureItem,
  CarePlanAction,
  CarePlanDraftContent,
  CarePlanStatus,
  CarePlanVersion,
} from './care-demo-types';
import { cn, Status } from './shared';

type StatusPresentation = {
  label: string;
  tone: 'green' | 'amber' | 'blue' | 'gray';
  description: string;
};

const statusPresentation: Record<CarePlanStatus, StatusPresentation> = {
  draft: {
    label: 'Rascunho editável',
    tone: 'amber',
    description: 'Esta versão ainda não foi aprovada nem aparece para a paciente.',
  },
  approved: {
    label: 'Aprovado pelo médico',
    tone: 'blue',
    description: 'A aprovação é um passo separado da publicação para a paciente.',
  },
  published: {
    label: 'Publicado para a paciente',
    tone: 'green',
    description: 'Esta é a versão que a paciente consegue ver no próprio plano.',
  },
  superseded: {
    label: 'Versão anterior preservada',
    tone: 'gray',
    description: 'O histórico permanece disponível; a paciente vê a versão publicada mais recente.',
  },
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível atualizar o plano demonstrativo.';
}

const sourceKindPresentation: Record<
  CareConsultationClosureItem['kind'],
  { label: string; tone: 'green' | 'amber' | 'blue' | 'gray'; eligible: boolean }
> = {
  'patient-report': { label: 'Relato aprovado', tone: 'blue', eligible: true },
  'patient-priority': { label: 'Prioridade da paciente', tone: 'green', eligible: true },
  'open-question': { label: 'Ainda precisa confirmar', tone: 'amber', eligible: false },
  hypothesis: { label: 'Hipótese não confirmada', tone: 'gray', eligible: false },
};

function quoteAsSentence(value: string) {
  return value.replace(/[“”"]/g, '').trim();
}

function getPlanChangeSummary(plan: CarePlanVersion, previous: CarePlanVersion | null) {
  if (!previous) return ['Primeira versão criada para este atendimento.'];
  const changes: string[] = [];
  const comparableActions = (actions: CarePlanAction[]) => actions.map((action) => ({
    title: action.title,
    cadence: action.cadence,
    active: action.active,
    sourceItemId: action.sourceItemId,
  }));
  if (plan.objective !== previous.objective) changes.push('Objetivo atualizado');
  if (plan.introduction !== previous.introduction) changes.push('Abertura para a paciente atualizada');
  if (JSON.stringify(comparableActions(plan.actions)) !== JSON.stringify(comparableActions(previous.actions))) changes.push('Ações ou frequências revisadas');
  if (plan.monitoring !== previous.monitoring) changes.push('Acompanhamento atualizado');
  if (plan.supportNotice !== previous.supportNotice) changes.push('Canal combinado atualizado');
  if (plan.sourceClosureId !== previous.sourceClosureId) changes.push('Nova fonte aprovada vinculada');
  return changes.length > 0 ? changes : ['Nenhuma diferença de conteúdo registrada até agora.'];
}

function ConsultationSourcePanel({
  closure,
  editable,
  selectedItemIds,
  lockedActionLabel,
  onUseAsObjective,
  onCreateAction,
}: {
  closure: CareConsultationClosure;
  editable: boolean;
  selectedItemIds: string[];
  lockedActionLabel: string;
  onUseAsObjective: (item: CareConsultationClosureItem) => void;
  onCreateAction: (item: CareConsultationClosureItem) => void;
}) {
  const selected = new Set(selectedItemIds);

  return (
    <section aria-labelledby="consultation-plan-source-title" className="rounded-2xl border border-[#c9d8ec] bg-[#f7faff] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#456b9c]">Handoff consulta → plano</p>
          <h4 id="consultation-plan-source-title" className="mt-2 text-base font-bold text-[#071a3a]">Fechamento aprovado · versão {closure.version}</h4>
          <p className="mt-1 text-xs leading-5 text-[#61718a]">Escolha o que sustenta o plano. A fonte permanece preservada; selecionar não publica nem define conduta.</p>
        </div>
        <Status tone="blue">{closure.items.length} itens rastreáveis</Status>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {closure.items.map((item) => {
          const presentation = sourceKindPresentation[item.kind];
          const isSelected = selected.has(item.id);
          return (
            <article key={item.id} className={cn('rounded-xl border bg-white p-4', isSelected ? 'border-[#8fb0d9]' : 'border-[#dce6f2]')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Status tone={presentation.tone}>{presentation.label}</Status>
                <span className="text-[11px] font-bold text-[#7890ac]">{item.sourceTime} · {item.sourceExcerptId}</span>
              </div>
              <p className="mt-3 text-sm font-bold leading-5 text-[#071a3a]">{item.title}</p>
              <blockquote className="mt-2 border-l-2 border-[#9eb9dd] pl-3 text-xs italic leading-5 text-[#526681]">{item.sourceQuote}</blockquote>
              {presentation.eligible ? (
                <button
                  type="button"
                  disabled={!editable || isSelected}
                  onClick={() => item.kind === 'patient-priority' ? onUseAsObjective(item) : onCreateAction(item)}
                  className="mt-3 min-h-11 w-full cursor-pointer rounded-xl border border-[#9bb8db] px-3 text-xs font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#dbe4f0] disabled:bg-[#f4f7fc] disabled:text-[#7890ac]"
                >
                  {isSelected ? 'Vinculado ao plano' : !editable ? lockedActionLabel : item.kind === 'patient-priority' ? 'Usar como objetivo' : 'Criar ação em branco vinculada'}
                </button>
              ) : (
                <p className="mt-3 rounded-xl bg-[#fff8e9] p-3 text-xs font-semibold leading-5 text-[#704f10]">Não elegível para o plano: confirme clinicamente antes de transformar em orientação.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlanActionInputs({
  actions,
  disabled,
  sourceItemsById,
  onAddManual,
  onChange,
  onRemove,
}: {
  actions: CarePlanAction[];
  disabled: boolean;
  sourceItemsById: Map<string, CareConsultationClosureItem>;
  onAddManual: () => void;
  onChange: (index: number, patch: Partial<CarePlanAction>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <fieldset disabled={disabled} className="mt-5">
      <legend className="text-sm font-bold text-[#071a3a]">Ações visíveis para a paciente</legend>
      <p className="mt-1 text-xs leading-5 text-[#61718a]">Escreva passos observáveis; a publicação não substitui prescrição, prontuário ou orientação de urgência.</p>
      <div className="mt-3 space-y-3">
        {actions.map((action, index) => {
          const sourceItem = action.sourceItemId ? sourceItemsById.get(action.sourceItemId) : null;
          return (
          <div key={action.id} className="rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-[#61718a]">{sourceItem ? `Ligada à fonte: ${sourceItem.title}` : 'Ação escrita manualmente'}</p>
              <button type="button" onClick={() => onRemove(index)} className="min-h-11 cursor-pointer rounded-xl px-3 text-xs font-bold text-[#8a3b3b] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Remover ação</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-end">
            <label className="block text-xs font-bold text-[#405675]">
              Ação {index + 1}
              <input
                value={action.title}
                onChange={(event) => onChange(index, { title: event.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-normal text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0] disabled:cursor-not-allowed disabled:bg-[#eef2f7]"
              />
            </label>
            <label className="block text-xs font-bold text-[#405675]">
              Frequência ou momento
              <input
                value={action.cadence}
                onChange={(event) => onChange(index, { cadence: event.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-normal text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0] disabled:cursor-not-allowed disabled:bg-[#eef2f7]"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-[#405675]">
              <input
                type="checkbox"
                checked={action.active}
                onChange={(event) => onChange(index, { active: event.target.checked })}
                className="size-4 accent-[#124da0]"
              />
              Exibir
            </label>
            </div>
          </div>
          );
        })}
        {actions.length === 0 ? <p className="rounded-xl border border-dashed border-[#cbd8e9] bg-white p-4 text-xs leading-5 text-[#61718a]">Nenhuma ação criada. Adicione uma ação manual ou transforme um relato aprovado em campo de decisão.</p> : null}
      </div>
      <button type="button" onClick={onAddManual} className="mt-3 min-h-11 cursor-pointer rounded-xl border border-[#cbd8e9] px-4 text-xs font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Adicionar ação manual</button>
    </fieldset>
  );
}

function ReadOnlyPlan({
  plan,
  sourceItemsById,
}: {
  plan: CarePlanVersion;
  sourceItemsById: Map<string, CareConsultationClosureItem>;
}) {
  return (
    <>
      <div className="mt-6 rounded-2xl bg-[#f4f7fc] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#124da0]">Objetivo desta versão</p>
        <p className="mt-2 text-base font-semibold leading-6 text-[#071a3a]">{plan.objective}</p>
        <p className="mt-3 text-sm leading-6 text-[#526681]">{plan.introduction}</p>
      </div>
      <div className="mt-5 space-y-3">
        {plan.actions.filter((action) => action.active).map((action) => (
          <article key={action.id} className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
            <p className="text-sm font-bold text-[#071a3a]">{action.title}</p>
            <p className="mt-1 text-xs text-[#61718a]">{action.cadence}</p>
            {action.sourceItemId && sourceItemsById.has(action.sourceItemId) ? <p className="mt-2 text-[11px] font-semibold leading-5 text-[#456b9c]">Fonte clínica vinculada e preservada no fechamento aprovado.</p> : null}
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7890ac]">Acompanhamento</p>
          <p className="mt-2 text-sm leading-6 text-[#526681]">{plan.monitoring}</p>
        </article>
        <article className="rounded-2xl border border-[#f0d59c] bg-[#fff8e9] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#704f10]">Canal combinado</p>
          <p className="mt-2 text-sm leading-6 text-[#704f10]">{plan.supportNotice}</p>
        </article>
      </div>
    </>
  );
}

export function DoctorCarePlanWorkspace({
  patientId,
  encounterId,
  notesPresent,
  onNotify,
  onContinue,
}: {
  patientId: string;
  encounterId: string;
  notesPresent: boolean;
  onNotify: (message: string) => void;
  onContinue: () => void;
}) {
  const {
    hydrated,
    activeReview,
    activeCarePlan,
    carePlans,
    consultationClosures,
    latestConsultationClosure,
    latestCarePlan,
    latestPublishedCarePlan,
    startCarePlan,
    createCarePlanRevision,
    saveCarePlan,
    approveCarePlan,
    publishCarePlan,
  } = useCareDemo(patientId, encounterId);
  const [draft, setDraft] = useState<{ plan: CarePlanVersion; baseline: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const currentDraft = draft?.plan.id === activeCarePlan?.id ? draft : null;
  useEffect(() => {
    if (!currentDraft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [currentDraft]);

  const template = useMemo<Partial<CarePlanDraftContent>>(() => {
    const approvedReview = activeReview?.status === 'approved' ? activeReview : null;
    return {
      sourceDescription: latestConsultationClosure
        ? `Fechamento médico aprovado da teleconsulta · versão ${latestConsultationClosure.version}`
        : approvedReview
        ? `Preparo ${approvedReview.sourceMode === 'assisted' ? 'assistido' : 'manual'} revisado · versão ${approvedReview.version}`
        : notesPresent
          ? 'Notas da consulta demonstrativa'
          : 'Estrutura manual do plano demonstrativo',
      sourceMode: latestConsultationClosure ? 'assisted' : approvedReview?.sourceMode ?? 'manual',
      sourceReviewId: approvedReview?.id ?? null,
      sourceClosureId: latestConsultationClosure?.id ?? null,
      sourceClosureVersion: latestConsultationClosure?.version ?? null,
      sourceItemIds: [],
      introduction: latestConsultationClosure
        ? 'Este plano organiza os combinados revisados com sua equipe depois da consulta e mostra os próximos passos de acompanhamento.'
        : undefined,
    };
  }, [activeReview, latestConsultationClosure, notesPresent]);

  if (!hydrated) {
    return <div className="rounded-3xl border border-[#dbe4f0] bg-white p-6 text-sm text-[#61718a]">Carregando o estado demonstrativo do plano...</div>;
  }

  const plan = currentDraft?.plan ?? activeCarePlan;
  const presentation = plan ? statusPresentation[plan.status] : statusPresentation.draft;
  const isEditable = plan?.status === 'draft';
  const planSourceClosure = plan?.sourceClosureId
    ? consultationClosures.find((closure) => closure.id === plan.sourceClosureId) ?? null
    : null;
  const handoffClosure = isEditable
    ? planSourceClosure ?? latestConsultationClosure
    : latestConsultationClosure ?? planSourceClosure;
  const sourceItemsById = new Map(
    (planSourceClosure?.items ?? []).map((item) => [item.id, item]),
  );
  const objectiveSourceItem = planSourceClosure?.items.find(
    (item) => item.kind === 'patient-priority' && plan?.sourceItemIds.includes(item.id),
  ) ?? null;
  const previousPlan = plan
    ? [...carePlans].reverse().find((candidate) => candidate.version < plan.version) ?? null
    : null;
  const changeSummary = plan ? getPlanChangeSummary(plan, previousPlan) : [];

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setSaveMessage('');
    try { await action(); }
    catch (error) { const message = getErrorMessage(error); setSaveMessage(message); onNotify(message); }
    finally { setBusy(false); }
  };
  const createOrResume = () => run(async () => {
    const hasOpenVersion = latestCarePlan?.status === 'draft' || latestCarePlan?.status === 'approved';
    const next = await (hasOpenVersion ? startCarePlan(template) : createCarePlanRevision(template));
    onNotify(`Versão ${next.version} do plano aberta como rascunho.`);
  });

  const createRevision = () => run(async () => {
    const next = await createCarePlanRevision(template);
    onNotify(`Versão ${next.version} do plano aberta como rascunho.`);
  });

  const updatePlan = (patch: Partial<CarePlanDraftContent>) => {
    if (!plan || !isEditable || busy) return;
    setDraft({ plan: { ...plan, ...patch }, baseline: currentDraft?.baseline ?? plan.updatedAtIso });
    setSaveMessage('Alterações ainda não salvas.');
  };

  const saveDraft = async () => {
    if (!plan) throw new Error('Plano indisponível.');
    if (!currentDraft) return plan;
    const { title, objective, introduction, actions, monitoring, supportNotice, sourceDescription, sourceMode, sourceReviewId, sourceClosureId, sourceClosureVersion, sourceItemIds } = plan;
    const saved = await saveCarePlan(plan.id, { title, objective, introduction, actions, monitoring, supportNotice, sourceDescription, sourceMode, sourceReviewId, sourceClosureId, sourceClosureVersion, sourceItemIds }, currentDraft.baseline);
    setDraft(null); setSaveMessage('Rascunho salvo no acompanhamento.'); return saved;
  };

  const updateAction = (index: number, patch: Partial<CarePlanAction>) => {
    if (!plan) return;
    updatePlan({
      actions: plan.actions.map((action, actionIndex) => actionIndex === index ? { ...action, ...patch } : action),
    });
  };

  const useSourceAsObjective = (item: CareConsultationClosureItem) => {
    if (!plan || !isEditable || plan.sourceItemIds.includes(item.id)) return;
    updatePlan({
      objective: `Objetivo combinado com a paciente: ${quoteAsSentence(item.sourceQuote)}`,
      sourceItemIds: [...plan.sourceItemIds, item.id],
    });
    onNotify('Prioridade aprovada vinculada ao objetivo. Revise a redação antes de aprovar.');
  };

  const createActionFromSource = (item: CareConsultationClosureItem) => {
    if (!plan || !isEditable || plan.sourceItemIds.includes(item.id)) return;
    updatePlan({
      actions: [
        ...plan.actions,
        {
          id: `plan-action-source-${Date.now()}-${plan.actions.length + 1}`,
          title: '',
          cadence: '',
          active: true,
          sourceItemId: item.id,
        },
      ],
      sourceItemIds: [...plan.sourceItemIds, item.id],
    });
    onNotify('Campo de ação criado com a fonte vinculada. A decisão e a redação continuam médicas.');
  };

  const addManualAction = () => {
    if (!plan || !isEditable) return;
    updatePlan({
      actions: [
        ...plan.actions,
        {
          id: `plan-action-manual-${Date.now()}-${plan.actions.length + 1}`,
          title: '',
          cadence: '',
          active: true,
          sourceItemId: null,
        },
      ],
    });
  };

  const removeAction = (index: number) => {
    if (!plan || !isEditable) return;
    const removed = plan.actions[index];
    updatePlan({
      actions: plan.actions.filter((_, actionIndex) => actionIndex !== index),
      sourceItemIds: removed?.sourceItemId
        ? plan.sourceItemIds.filter((itemId) => itemId !== removed.sourceItemId)
        : plan.sourceItemIds,
    });
  };

  const unlinkObjectiveSource = () => {
    if (!plan || !isEditable || !objectiveSourceItem) return;
    updatePlan({
      sourceItemIds: plan.sourceItemIds.filter((itemId) => itemId !== objectiveSourceItem.id),
    });
    onNotify('Vínculo removido. O texto permanece no rascunho como redação manual até você editá-lo.');
  };

  const approve = () => run(async () => {
    if (!plan) return;
      const saved = await saveDraft();
      const approved = await approveCarePlan(saved.id, saved.updatedAtIso);
      onNotify(`Versão ${approved.version} aprovada. A paciente ainda não consegue vê-la.`);
  });

  const publish = () => run(async () => {
    if (!plan) return;
      const published = await publishCarePlan(plan.id, plan.updatedAtIso);
      onNotify(`Versão ${published.version} publicada no acompanhamento da paciente.`);
  });

  return (
    <section aria-labelledby="care-plan-workspace-title" aria-busy={busy} className="rounded-3xl border border-[#dbe4f0] bg-white p-5 sm:p-6">
      <p role="status" className="mb-3 text-sm text-[#61718a]">{busy ? 'Salvando no acompanhamento…' : saveMessage}</p>
      {currentDraft && currentDraft.baseline !== activeCarePlan?.updatedAtIso ? <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Uma versão mais recente chegou. Seu texto foi preservado, mas não pode sobrescrevê-la. Copie o que deseja manter e <button type="button" className="min-h-11 px-2 font-bold underline" onClick={() => { setDraft(null); setSaveMessage('Versão salva carregada.'); }}>carregue a versão salva</button>.</div> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124da0]">Plano versionado</p>
          <h3 id="care-plan-workspace-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Da consulta ao plano que a paciente vê</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">Rascunhar, aprovar e publicar são ações distintas. A publicação não envia dados para prontuário ou integrações externas.</p>
        </div>
        <Status tone={presentation.tone}>{plan ? `v${plan.version} · ${presentation.label}` : presentation.label}</Status>
      </div>

      {handoffClosure ? (
        <div className="mt-6">
          <ConsultationSourcePanel
            closure={handoffClosure}
            editable={Boolean(isEditable)}
            selectedItemIds={plan?.sourceItemIds ?? []}
            lockedActionLabel={plan ? 'Crie uma nova versão para vincular' : 'Crie o rascunho para vincular'}
            onUseAsObjective={useSourceAsObjective}
            onCreateAction={createActionFromSource}
          />
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-[#cbd8e9] bg-[#f7faff] p-4 text-xs leading-5 text-[#61718a]">Nenhum fechamento de teleconsulta aprovado foi encontrado. O fluxo manual continua disponível e não depende da assistência de IA.</p>
      )}

      {!plan ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#cbd8e9] bg-[#f7faff] p-6 text-center">
          <p className="text-sm font-bold text-[#405675]">Ainda não há um plano para este contexto.</p>
          <p className="mt-1 text-xs leading-5 text-[#7890ac]">Crie um rascunho; a fonte aprovada será ligada, mas nenhum relato será transformado automaticamente em orientação.</p>
          <button type="button" onClick={createOrResume} className="mt-4 min-h-11 cursor-pointer rounded-xl bg-[#124da0] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0f3f83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">{handoffClosure ? 'Criar rascunho a partir do fechamento' : 'Criar rascunho manual'}</button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className={cn('rounded-2xl border p-4', plan.status === 'published' ? 'border-[#c9d8ec] bg-[#edf3fb]' : plan.status === 'approved' ? 'border-[#c8d9e8] bg-[#f0f6fb]' : 'border-[#f0d59c] bg-[#fff8e9]')}>
              <p className="text-sm font-bold text-[#071a3a]">{presentation.label}</p>
              <p className="mt-1 text-sm leading-6 text-[#526681]">{presentation.description}</p>
            </div>

            {isEditable ? (
              <div className="mt-5 space-y-5">
                <label className="block text-sm font-bold text-[#071a3a]">
                  Nome do plano
                  <input value={plan.title} onChange={(event) => updatePlan({ title: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[#cbd8e9] px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#124da0]" />
                </label>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="care-plan-objective" className="text-sm font-bold text-[#071a3a]">Objetivo combinado</label>
                    {objectiveSourceItem ? <button type="button" onClick={unlinkObjectiveSource} className="min-h-11 cursor-pointer rounded-xl px-3 text-xs font-bold text-[#8a3b3b] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Remover vínculo da fonte</button> : null}
                  </div>
                  <textarea id="care-plan-objective" value={plan.objective} onChange={(event) => updatePlan({ objective: event.target.value })} className="mt-2 min-h-28 w-full rounded-2xl border border-[#cbd8e9] p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-[#124da0]" />
                </div>
                <label className="block text-sm font-bold text-[#071a3a]">
                  Texto de abertura para a paciente
                  <textarea value={plan.introduction} onChange={(event) => updatePlan({ introduction: event.target.value })} className="mt-2 min-h-24 w-full rounded-2xl border border-[#cbd8e9] p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-[#124da0]" />
                </label>
                <PlanActionInputs
                  actions={plan.actions}
                  disabled={false}
                  sourceItemsById={sourceItemsById}
                  onAddManual={addManualAction}
                  onChange={updateAction}
                  onRemove={removeAction}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-[#071a3a]">
                    Como acompanhar
                    <textarea value={plan.monitoring} onChange={(event) => updatePlan({ monitoring: event.target.value })} className="mt-2 min-h-28 w-full rounded-2xl border border-[#cbd8e9] p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-[#124da0]" />
                  </label>
                  <label className="block text-sm font-bold text-[#071a3a]">
                    Mensagem sobre o canal combinado
                    <textarea value={plan.supportNotice} onChange={(event) => updatePlan({ supportNotice: event.target.value })} className="mt-2 min-h-28 w-full rounded-2xl border border-[#cbd8e9] p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-[#124da0]" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={busy} onClick={() => run(async () => { await saveDraft(); })} className="min-h-11 cursor-pointer rounded-xl border border-[#cbd8e9] px-5 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Salvar rascunho</button>
                  <button type="button" onClick={approve} className="min-h-11 cursor-pointer rounded-xl bg-[#03132d] px-5 text-sm font-bold text-white transition-colors hover:bg-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Aprovar versão {plan.version}</button>
                </div>
                <details className="rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4">
                  <summary className="cursor-pointer text-sm font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Ver prévia da paciente antes de aprovar</summary>
                  <ReadOnlyPlan plan={plan} sourceItemsById={sourceItemsById} />
                </details>
              </div>
            ) : (
              <>
                <ReadOnlyPlan plan={plan} sourceItemsById={sourceItemsById} />
                <div className="mt-6 flex flex-wrap gap-3">
                  {plan.status === 'approved' ? (
                    <button type="button" onClick={publish} className="min-h-11 cursor-pointer rounded-xl bg-[#124da0] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0f3f83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Publicar versão {plan.version} para a paciente</button>
                  ) : null}
                  <button type="button" onClick={createRevision} className="min-h-11 cursor-pointer rounded-xl border border-[#cbd8e9] px-5 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Criar nova versão</button>
                  <button type="button" onClick={onContinue} className="min-h-11 cursor-pointer rounded-xl px-5 text-sm font-bold text-[#405675] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Revisar fechamento</button>
                </div>
              </>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-[#03132d] p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9cc7ba]">Origem desta versão</p>
              <p className="mt-3 text-sm font-semibold leading-6">{plan.sourceDescription}</p>
              <p className="mt-3 text-xs leading-5 text-[#cfe0f4]">{plan.sourceMode === 'assisted' ? 'A organização assistida é uma referência revisável; a autoria e a decisão permanecem médicas.' : 'Esta versão começou no fluxo manual do protótipo.'}</p>
              {plan.sourceReviewId ? <p className="mt-3 break-all text-[11px] text-[#b7c9df]">Fonte ligada: {plan.sourceReviewId}</p> : null}
              {plan.sourceClosureId ? <p className="mt-2 break-all text-[11px] text-[#b7c9df]">Fechamento ligado: {plan.sourceClosureId} · {plan.sourceItemIds.length} {plan.sourceItemIds.length === 1 ? 'item usado' : 'itens usados'}</p> : null}
            </section>
            {plan ? (
              <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5">
                <h4 className="text-sm font-bold text-[#071a3a]">Diferenças da versão anterior</h4>
                <ul className="mt-3 space-y-2">
                  {changeSummary.map((change) => <li key={change} className="flex gap-2 text-xs leading-5 text-[#61718a]"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#124da0]" />{change}</li>)}
                </ul>
              </section>
            ) : null}
            <section className="rounded-2xl border border-[#dbe4f0] bg-white p-5">
              <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-[#071a3a]">Histórico de versões</h4><Status tone="gray">{carePlans.length}</Status></div>
              <ol className="mt-4 space-y-3">
                {[...carePlans].reverse().map((version) => (
                  <li key={version.id} className={cn('rounded-xl border p-3', version.id === plan.id ? 'border-[#9bb8db] bg-[#edf3fb]' : 'border-[#dbe4f0] bg-[#f7faff]')}>
                    <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-[#071a3a]">Versão {version.version}</p><Status tone={statusPresentation[version.status].tone}>{statusPresentation[version.status].label}</Status></div>
                    <p className="mt-2 text-xs leading-5 text-[#61718a]">{version.status === 'published' ? `Publicada em ${version.publishedAt}` : version.status === 'approved' ? `Aprovada em ${version.approvedAt}` : version.status === 'superseded' ? `Substituída pela versão ${version.supersededByVersion}` : `Atualizada em ${version.updatedAt}`}</p>
                  </li>
                ))}
              </ol>
            </section>
            {latestPublishedCarePlan ? <p className="rounded-xl border border-[#c9d8ec] bg-[#edf3fb] p-4 text-xs leading-5 text-[#124da0]">A paciente vê a versão {latestPublishedCarePlan.version} publicada em {latestPublishedCarePlan.publishedAt}.</p> : <p className="rounded-xl border border-dashed border-[#cbd8e9] bg-[#f7faff] p-4 text-xs leading-5 text-[#61718a]">Nenhuma versão foi publicada para a paciente neste contexto.</p>}
          </aside>
        </div>
      )}
    </section>
  );
}
