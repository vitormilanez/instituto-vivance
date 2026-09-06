'use client';

import {
  ArrowSquareOut,
  Books,
  Brain,
  CheckCircle,
  ClockCounterClockwise,
  CirclesFour,
  Database,
  FileText,
  LockKey,
  Plus,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import {
  useClinicalIntelligence,
  type AddKnowledgeSourceInput,
  type CareRelationship,
  type ClinicalAiModuleId,
  type ClinicalAiModulePolicy,
  type ClinicalExamDocument,
  type ClinicalKnowledgeSource,
  type EvidenceQuality,
  type KnowledgeSourceKind,
  type PatientAiContext,
  type PatientAiContextStatus,
} from './clinical-intelligence-context';
import { cn, Status } from './shared';
import { ClinicalPolicyWorkflow } from './clinical-policy-workflow';

type CentralTab = 'knowledge' | 'modules' | 'data' | 'rules';

const tabs: Array<{ id: CentralTab; label: string; description: string }> = [
  { id: 'knowledge', label: 'Conhecimento', description: 'Estudos e protocolos' },
  { id: 'modules', label: 'Módulos clínicos', description: 'Diretriz por análise' },
  { id: 'data', label: 'Dados conectados', description: 'Fontes do cuidado' },
  { id: 'rules', label: 'Regras da IA', description: 'Permissões e limites' },
];

const sourceKindLabels: Record<KnowledgeSourceKind, string> = {
  official: 'Fonte oficial',
  guideline: 'Diretriz',
  review: 'Revisão de evidências',
  primary_study: 'Estudo primário',
  institutional_protocol: 'Protocolo institucional',
};

const evidenceQualityLabels: Record<EvidenceQuality, string> = {
  REGULATORY: 'Regulatória',
  HIGH: 'Alta',
  MODERATE: 'Moderada',
  EXPERT_CONSENSUS: 'Consenso de especialistas',
  UNKNOWN: 'Ainda não classificada',
};

const patientContextPresentation: Record<PatientAiContextStatus, { label: string; tone: 'green' | 'amber' | 'gray' | 'blue' }> = {
  ready: { label: 'Contexto pronto', tone: 'green' },
  review_required: { label: 'Aguardando revisão', tone: 'amber' },
  insufficient_data: { label: 'Dados insuficientes', tone: 'gray' },
  not_authorized: { label: 'Sem autorização para IA', tone: 'gray' },
  paused: { label: 'IA pausada', tone: 'blue' },
};

const moduleLabels: Record<ClinicalAiModuleId, string> = {
  exam_ingestion: 'Leitura de exames',
  exam_analysis: 'Análise de exames',
  longitudinal_analysis: 'Análise longitudinal',
  visit_preparation: 'Preparação da consulta',
  clinical_synthesis: 'Síntese clínica',
};

function getDraftModuleBlockers(
  modulePolicy: ClinicalAiModulePolicy,
  dataConnections: ReturnType<typeof useClinicalIntelligence>['dataConnections'],
  capabilities: ReturnType<typeof useClinicalIntelligence>['capabilities'],
  knowledgeSources: ClinicalKnowledgeSource[],
) {
  if (!modulePolicy.enabled) return [];
  const blockers: string[] = [];
  const source = knowledgeSources.find((item) => item.id === modulePolicy.primaryKnowledgeSourceId);
  if (!source || source.status !== 'active' || !source.applicableModuleIds.includes(modulePolicy.id)) {
    blockers.push('diretriz principal ausente, inativa ou incompatível');
  }
  for (const connectionId of modulePolicy.requiredDataConnectionIds) {
    const connection = dataConnections.find((item) => item.id === connectionId);
    if (!connection?.enabled) blockers.push(`dado obrigatório desligado: ${connection?.label ?? connectionId}`);
  }
  for (const capabilityId of modulePolicy.allowedCapabilityIds) {
    const capability = capabilities.find((item) => item.id === capabilityId);
    if (!capability?.enabled) blockers.push(`capacidade obrigatória desligada: ${capability?.label ?? capabilityId}`);
  }
  return blockers;
}

const emptyKnowledgeForm: AddKnowledgeSourceInput = {
  title: '',
  organization: '',
  kind: 'guideline',
  version: '',
  publicationDate: '2026-09-04',
  reference: '',
  relevantClaims: '',
  limitations: '',
  studyDesign: '',
  population: '',
  sampleSize: '',
  followUp: '',
  conflicts: '',
  evidenceQuality: 'UNKNOWN',
  applicableModuleIds: [],
};

function KnowledgeStatus({ source }: { source: ClinicalKnowledgeSource }) {
  if (source.status === 'active') return <Status tone="green">Disponível para módulos</Status>;
  if (source.status === 'paused') return <Status tone="gray">Indisponível</Status>;
  return <Status tone="amber">Aguardando revisão</Status>;
}

function Toggle({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-[#124da0]' : 'bg-[#bdc8d7]',
      )}
    >
      <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow-sm transition-[left]', checked ? 'left-6' : 'left-1')} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function DoctorAiControlCenter() {
  const {
    hydrated,
    exams,
    knowledgeSources: publishedKnowledgeSources,
    policy,
    careRelationships,
    patientContexts,
    activeConfiguration,
    dataConnections,
    capabilities,
    modulePolicies,
    configurationVersion,
    configurationUpdatedAt,
    hasUnpublishedChanges,
    auditEvents,
    addKnowledgeSource,
    activateKnowledgeSource,
    toggleKnowledgeSource,
    toggleDataConnection,
    toggleCapability,
    updateModulePolicy,
    togglePatientAi,
  } = useClinicalIntelligence();
  const [activeTab, setActiveTab] = useState<CentralTab>('knowledge');
  const [formOpen, setFormOpen] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState<AddKnowledgeSourceInput>(emptyKnowledgeForm);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const knowledgeSources = policy.candidate.knowledgeSources;

  const connectedExams = exams.filter((exam) => careRelationships.some((relationship) => relationship.patientId === exam.patientId));
  const approvedExams = connectedExams.filter((exam) => exam.reviewStatus === 'approved');
  const pendingExams = connectedExams.filter((exam) => exam.reviewStatus === 'awaiting_review');
  const activeKnowledge = publishedKnowledgeSources.filter((source) => source.status === 'active');
  const pendingKnowledge = knowledgeSources.filter((source) => source.status === 'awaiting_review');
  const connectedPatients = careRelationships.filter((relationship) => relationship.status === 'active').length;
  const readyPatients = patientContexts.filter((context) => context.status === 'ready').length;
  const activeModules = activeConfiguration.modules.filter((module) => module.enabled).length;
  const recentAudit = useMemo(
    () => auditEvents.toSorted((left, right) => right.occurredAtIso.localeCompare(left.occurredAtIso)).slice(0, 6),
    [auditEvents],
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <div className="vivance-panel rounded-2xl p-6 text-sm text-[#61718a]">Carregando a configuração da IA…</div>
      </div>
    );
  }

  const updateKnowledgeForm = <Key extends keyof AddKnowledgeSourceInput>(
    key: Key,
    value: AddKnowledgeSourceInput[Key],
  ) => setKnowledgeForm((current) => ({ ...current, [key]: value }));

  const submitKnowledge = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (knowledgeSources.length >= 100 || knowledgeForm.version.length > 100 || knowledgeForm.reference.length > 2000
      || Object.values(knowledgeForm).some((value) => typeof value === 'string' && value.length > 4000)) {
      setFormError('Use até 100 caracteres na versão, 2.000 na referência e 4.000 nos demais campos. A biblioteca permite até 100 fichas.');
      return;
    }
    if (
      !knowledgeForm.title.trim()
      || !knowledgeForm.organization.trim()
      || !knowledgeForm.version.trim()
      || !knowledgeForm.publicationDate
      || !knowledgeForm.reference.trim()
      || !knowledgeForm.relevantClaims.trim()
      || !knowledgeForm.limitations.trim()
      || knowledgeForm.applicableModuleIds.length === 0
      || (knowledgeForm.kind === 'primary_study' && (
        !knowledgeForm.studyDesign.trim()
        || !knowledgeForm.population.trim()
        || !knowledgeForm.sampleSize.trim()
      ))
    ) {
      setFormError(knowledgeForm.kind === 'primary_study'
        ? 'Inclua módulos, desenho, população e amostra para cadastrar um estudo primário.'
        : 'Preencha identificação, versão, fonte, síntese, limitações e ao menos um módulo compatível.');
      return;
    }
    const created = addKnowledgeSource(knowledgeForm);
    setKnowledgeForm(emptyKnowledgeForm);
    setFormOpen(false);
    setMessage(`“${created.title}” foi adicionada para revisão e ainda não influencia a IA.`);
  };

  const moveTabFocus = (currentTab: CentralTab, key: string) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    const nextIndex = key === 'Home'
      ? 0
      : key === 'End'
        ? tabs.length - 1
        : key === 'ArrowRight'
          ? (currentIndex + 1) % tabs.length
          : key === 'ArrowLeft'
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : currentIndex;
    if (nextIndex === currentIndex && key !== 'Home' && key !== 'End') return;
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    setMessage('');
    window.requestAnimationFrame(() => document.getElementById(`central-tab-${nextTab.id}`)?.focus());
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      <header className="overflow-hidden rounded-2xl bg-[#03132d] text-white shadow-[0_18px_46px_rgba(3,19,45,0.16)]">
        <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-bold text-[#dce9f8]">
                <Brain aria-hidden="true" size={17} />
                Supervisão médica da IA
              </span>
              <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 px-3 text-xs font-semibold text-[#b9cce5]">Configuração global v{configurationVersion}</span>
              {hasUnpublishedChanges ? <span className="inline-flex min-h-8 items-center rounded-full bg-[#fff0ca] px-3 text-xs font-bold text-[#77500a]">Rascunho para v{configurationVersion + 1}</span> : null}
            </div>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Controle o que a IA pode usar</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c9d7ea] sm:text-base sm:leading-7">
              Atualize fontes, conecte dados revisados e escolha tarefas de apoio. A IA organiza conhecimento; o médico continua responsável por interpretar e decidir.
            </p>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4">
            <p className="text-xs font-semibold text-[#a9bdd8]">Política aplicada nas novas análises</p>
            <p className="mt-2 text-lg font-bold text-white">{activeModules} módulos · política global para a carteira</p>
            <p className="mt-2 text-xs leading-5 text-[#c9d7ea]">{connectedPatients} acompanhamento(s) conectado(s) ao seu usuário. A política é compartilhada pela clínica; dados e resultados continuam isolados por paciente.</p>
          </div>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Fontes disponíveis', activeKnowledge.length, `${pendingKnowledge.length} para revisar`],
            ['Exames aprovados', approvedExams.length, `${pendingExams.length} aguardando médico`],
            ['Acompanhamentos conectados', connectedPatients, `${readyPatients} com contexto pronto`],
            ['Última configuração', `v${configurationVersion}`, configurationUpdatedAt],
          ].map(([label, value, detail]) => (
            <div key={label} className="border-b border-white/10 p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0 sm:p-5">
              <p className="text-xs font-semibold text-[#a9bdd8]">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#b9cce5]">{detail}</p>
            </div>
          ))}
        </div>
      </header>

      {message ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl border border-[#b9d8cf] bg-[#edf7f4] p-4 text-sm font-semibold leading-6 text-[#17624e]">
          <CheckCircle aria-hidden="true" size={20} weight="fill" className="mt-0.5 shrink-0" />
          {message}
        </div>
      ) : null}

      <nav aria-label="Áreas da Central da IA" className="vivance-panel mt-5 overflow-x-auto rounded-2xl p-1.5">
        <div role="tablist" className="flex min-w-max gap-1 md:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`central-tab-${tab.id}`}
              aria-controls={`central-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onKeyDown={(event) => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  moveTabFocus(tab.id, event.key);
                }
              }}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage('');
              }}
              className={cn(
                'flex min-h-14 min-w-[175px] flex-1 flex-col justify-center rounded-xl px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] md:min-w-0',
                activeTab === tab.id ? 'bg-[#03132d] text-white' : 'text-[#405675] hover:bg-[#edf3fb]',
              )}
            >
              <span className="text-sm font-bold">{tab.label}</span>
              <span className={cn('mt-0.5 text-[11px]', activeTab === tab.id ? 'text-[#c9d7ea]' : 'text-[#61718a]')}>{tab.description}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main id={`central-panel-${activeTab}`} role="tabpanel" aria-labelledby={`central-tab-${activeTab}`} tabIndex={0} className="min-w-0 focus-visible:outline-none">
          {!policy.view ? <p role="alert" className="mb-4 rounded-xl bg-[#fff0ed] p-4 text-sm text-[#9c453f]">{policy.error || 'Conectando a Central compartilhada…'} Os controles só ficam disponíveis após carregar a configuração.</p> : null}
          <fieldset disabled={policy.busy || !policy.view} className="min-w-0 disabled:opacity-60">
          {activeTab === 'knowledge' ? (
            <KnowledgePanel
              sources={knowledgeSources}
              activeModules={activeConfiguration.modules}
              formOpen={formOpen}
              form={knowledgeForm}
              formError={formError}
              onOpenForm={() => {
                setFormOpen(true);
                setMessage('');
              }}
              onCloseForm={() => {
                setFormOpen(false);
                setFormError('');
              }}
              onRevise={(source) => {
                setKnowledgeForm({ ...emptyKnowledgeForm, ...source, version: '', studyDesign: source.studyDesign ?? '',
                  population: source.population ?? '', sampleSize: source.sampleSize ?? '', followUp: source.followUp ?? '', conflicts: source.conflicts ?? '' });
                setFormOpen(true); setFormError('');
                setMessage('Crie uma nova versão da fonte. A ficha anterior e as políticas publicadas serão preservadas.');
              }}
              onUpdateForm={updateKnowledgeForm}
              onSubmit={submitKnowledge}
              onActivate={(sourceId) => {
                activateKnowledgeSource(sourceId);
                setMessage('Fonte revisada. Ela só influenciará a IA quando for atribuída a um módulo e a nova configuração for publicada.');
              }}
              onToggle={(sourceId) => {
                const updated = toggleKnowledgeSource(sourceId);
                setMessage(updated
                  ? 'Disponibilidade alterada apenas no rascunho. Revise os módulos afetados, salve e teste antes de publicar.'
                  : 'Revise esta fonte antes de mudar sua disponibilidade.');
              }}
            />
          ) : null}

          {activeTab === 'modules' ? (
            <ModulesPanel
              modules={modulePolicies}
              activeModules={activeConfiguration.modules}
              sources={knowledgeSources}
              publishedSources={publishedKnowledgeSources}
              dataConnections={dataConnections}
              capabilities={capabilities}
              configurationVersion={configurationVersion}
              onUpdate={(moduleId, patch) => {
                updateModulePolicy(moduleId, patch);
                setMessage(`Módulo atualizado no rascunho da configuração v${configurationVersion + 1}.`);
              }}
            />
          ) : null}

          {activeTab === 'data' ? (
            <section className="vivance-panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]"><Database aria-hidden="true" size={22} /></span>
                <div><h3 className="text-xl font-semibold text-[#071a3a]">Dados conectados ao contexto</h3><p className="mt-1 text-sm leading-6 text-[#61718a]">Escolha categorias inteiras. Dentro delas, somente versões aprovadas ficam disponíveis.</p></div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {dataConnections.map((connection) => (
                  <button
                    key={connection.id}
                    type="button"
                    role="switch"
                    aria-checked={connection.enabled}
                    onClick={() => {
                      toggleDataConnection(connection.id);
                      setMessage('Conexão atualizada. Salve para versionar esta configuração.');
                    }}
                    className="flex min-h-24 items-start gap-4 rounded-2xl border border-[#dbe4f0] bg-white p-4 text-left transition-colors hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]"
                  >
                    <Toggle checked={connection.enabled} label={connection.label} />
                    <span><strong className="block text-sm text-[#071a3a]">{connection.label}</strong><span className="mt-1 block text-xs leading-5 text-[#61718a]">{connection.description}</span></span>
                  </button>
                ))}
              </div>

              <PatientContextsPanel
                contexts={patientContexts}
                relationships={careRelationships}
                exams={exams}
                onToggle={togglePatientAi}
              />
            </section>
          ) : null}

          {activeTab === 'rules' ? (
            <section className="vivance-panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]"><ShieldCheck aria-hidden="true" size={22} /></span>
                <div><h3 className="text-xl font-semibold text-[#071a3a]">Tarefas permitidas</h3><p className="mt-1 text-sm leading-6 text-[#61718a]">O médico pode reduzir o escopo. Os limites clínicos abaixo não podem ser removidos.</p></div>
              </div>

              <div className="mt-5 divide-y divide-[#e7edf5] border-y border-[#dbe4f0]">
                {capabilities.map((capability) => (
                  <button
                    key={capability.id}
                    type="button"
                    role="switch"
                    aria-checked={capability.enabled}
                    onClick={() => {
                      toggleCapability(capability.id);
                      setMessage('Permissão atualizada. Salve para registrar uma nova versão da configuração.');
                    }}
                    className="flex min-h-20 w-full items-center gap-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0]"
                  >
                    <Toggle checked={capability.enabled} label={capability.label} />
                    <span><strong className="block text-sm text-[#071a3a]">{capability.label}</strong><span className="mt-1 block text-xs leading-5 text-[#61718a]">{capability.description}</span></span>
                  </button>
                ))}
              </div>

              <section className="mt-6 rounded-2xl border border-[#c9d8ec] bg-[#f7faff] p-5">
                <div className="flex items-center gap-2"><LockKey aria-hidden="true" size={19} className="text-[#124da0]" /><h4 className="text-sm font-bold text-[#071a3a]">Limites fixos do sistema</h4></div>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    'Não diagnosticar nem classificar risco autonomamente.',
                    'Não prescrever, alterar medicamento ou sugerir dose.',
                    'Não publicar nem enviar mensagem clínica sem aprovação.',
                    'Não alterar fonte original nem preencher dado ausente.',
                  ].map((rule) => <li key={rule} className="flex gap-2 text-xs leading-5 text-[#405675]"><CheckCircle aria-hidden="true" size={16} weight="fill" className="mt-0.5 shrink-0 text-[#124da0]" />{rule}</li>)}
                </ul>
              </section>
            </section>
          ) : null}

          </fieldset>
          <ClinicalPolicyWorkflow policy={policy} />
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="vivance-panel rounded-2xl p-5">
            <div className="flex items-center gap-2"><FileText aria-hidden="true" size={19} className="text-[#124da0]" /><h3 className="text-sm font-bold text-[#071a3a]">O que a IA sabe agora</h3></div>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-[#50627f]">
              <li><strong className="text-[#071a3a]">Abrangência:</strong> política da clínica, com {connectedPatients} acompanhamento(s) vinculado(s) a este médico. Outros perfis ilustrativos não recebem acesso automaticamente.</li>
              <li><strong className="text-[#071a3a]">Dados:</strong> {approvedExams.length} exames revisados; {pendingExams.length} ainda fora do contexto.</li>
              <li><strong className="text-[#071a3a]">Conhecimento:</strong> {activeKnowledge.length} fontes ativas; {pendingKnowledge.length} aguardando revisão.</li>
              <li><strong className="text-[#071a3a]">Política:</strong> {activeModules} módulos governados pela configuração v{configurationVersion}.</li>
            </ul>
          </section>

          <section className="vivance-panel rounded-2xl p-5">
            <div className="flex items-center gap-2"><ClockCounterClockwise aria-hidden="true" size={19} className="text-[#124da0]" /><h3 className="text-sm font-bold text-[#071a3a]">Atividade recente</h3></div>
            <ol className="mt-4 divide-y divide-[#e7edf5] border-y border-[#e7edf5]">
              {recentAudit.map((event) => (
                <li key={event.id} className="py-3 text-xs leading-5">
                  <strong className="block text-[#405675]">{event.summary}</strong>
                  <span className="mt-1 block text-[#61718a]">{event.actor} · {event.occurredAt}</span>
                </li>
              ))}
            </ol>
          </section>

          <p className="rounded-xl border border-dashed border-[#c7d5e7] bg-white p-4 text-[11px] leading-5 text-[#61718a]">Configuração e fontes salvas na Central compartilhada. Dados e protocolos iniciais são fictícios. Cadastrar uma fonte não lê o estudo, treina um modelo nem valida evidência clínica. Alterações antigas do navegador não são importadas automaticamente.</p>
        </aside>
      </div>
    </div>
  );
}

function ModulesPanel({
  modules,
  activeModules,
  sources,
  publishedSources,
  dataConnections,
  capabilities,
  configurationVersion,
  onUpdate,
}: {
  modules: ClinicalAiModulePolicy[];
  activeModules: ClinicalAiModulePolicy[];
  sources: ClinicalKnowledgeSource[];
  publishedSources: ClinicalKnowledgeSource[];
  dataConnections: ReturnType<typeof useClinicalIntelligence>['dataConnections'];
  capabilities: ReturnType<typeof useClinicalIntelligence>['capabilities'];
  configurationVersion: number;
  onUpdate: (
    moduleId: ClinicalAiModuleId,
    patch: Partial<Pick<ClinicalAiModulePolicy, 'enabled' | 'primaryKnowledgeSourceId' | 'feedbackGoal'>>,
  ) => void;
}) {
  return (
    <section className="vivance-panel overflow-hidden rounded-2xl">
      <header className="border-b border-[#dbe4f0] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]"><CirclesFour aria-hidden="true" size={22} /></span>
          <div>
            <h3 className="text-xl font-semibold text-[#071a3a]">Módulos governados</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#61718a]">Cada tarefa tem uma finalidade, dados permitidos, capacidades e uma diretriz principal. Sem diretriz ativa, o módulo não produz análise assistida.</p>
          </div>
        </div>
      </header>

      <div className="divide-y divide-[#e7edf5] bg-white">
        {modules.map((module) => {
          const activeModule = activeModules.find((item) => item.id === module.id);
          const source = sources.find((item) => item.id === module.primaryKnowledgeSourceId);
          const appliedSource = publishedSources.find((item) => item.id === activeModule?.primaryKnowledgeSourceId);
          const compatibleActiveSources = sources.filter((item) => (
            item.status === 'active' && item.applicableModuleIds.includes(module.id)
          ));
          const changed = module.enabled !== activeModule?.enabled
            || module.primaryKnowledgeSourceId !== activeModule?.primaryKnowledgeSourceId;
          const moduleBlockers = getDraftModuleBlockers(module, dataConnections, capabilities, sources);
          const blocked = moduleBlockers.length > 0;
          return (
            <article key={module.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Status tone={blocked ? 'amber' : module.enabled ? 'green' : 'gray'}>{blocked ? 'Sem diretriz ativa' : module.enabled ? 'Módulo habilitado' : 'Módulo pausado'}</Status>
                    {changed ? <Status tone="blue">Alteração em rascunho</Status> : <Status tone="gray">Aplicado na v{configurationVersion}</Status>}
                  </div>
                  <h4 className="mt-3 text-lg font-semibold text-[#071a3a]">{module.label}</h4>
                  <p className="mt-1 text-sm leading-6 text-[#61718a]">{module.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={module.enabled}
                  aria-label={`${module.enabled ? 'Pausar' : 'Ativar'} módulo ${module.label}`}
                  onClick={() => onUpdate(module.id, { enabled: !module.enabled })}
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]"
                >
                  <Toggle checked={module.enabled} label={module.label} />
                  {module.enabled ? 'Ativo' : 'Pausado'}
                </button>
              </div>

              <div className="mt-4 grid gap-4 rounded-2xl border border-[#dbe4f0] bg-[#f7faff] p-4 lg:grid-cols-[minmax(230px,0.8fr)_minmax(0,1.2fr)]">
                <label className="text-xs font-bold text-[#50627f]">
                  Diretriz principal do módulo
                  <select
                    value={module.primaryKnowledgeSourceId}
                    onChange={(event) => onUpdate(module.id, { primaryKnowledgeSourceId: event.target.value })}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-semibold text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]"
                  >
                    {source && (source.status !== 'active' || !source.applicableModuleIds.includes(module.id)) ? <option value={source.id}>{source.reference} · indisponível ou incompatível</option> : null}
                    {compatibleActiveSources.map((item) => <option key={item.id} value={item.id}>{item.reference} · v{item.version}</option>)}
                  </select>
                  <span className={cn('mt-2 block text-[11px] leading-5', blocked ? 'text-[#825b0b]' : 'text-[#61718a]')}>
                    {blocked ? moduleBlockers.join(' · ') : `${source?.title ?? 'Fonte não localizada'} · qualidade ${source ? evidenceQualityLabels[source.evidenceQuality].toLowerCase() : 'não classificada'}`}
                  </span>
                </label>
                <div className="text-xs leading-5 text-[#61718a]">
                  <label className="block font-bold text-[#405675]">Objetivo do feedback
                    <textarea value={module.feedbackGoal} maxLength={1200} rows={3} onChange={(event) => onUpdate(module.id, { feedbackGoal: event.target.value })}
                      className="mt-2 w-full rounded-xl border border-[#cbd8e9] bg-white p-3 text-xs font-normal leading-5 focus:ring-2 focus:ring-[#124da0]" />
                  </label>
                  <p className="mt-2"><strong className="text-[#405675]">Dados exigidos:</strong> {module.requiredDataConnectionIds.map((id) => dataConnectionShortLabel[id]).join(', ')}.</p>
                  <p className="mt-2"><strong className="text-[#405675]">Bloqueia quando:</strong> {module.blockingConditions.join('; ')}.</p>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-[#61718a]">Versão vigente: {appliedSource ? `${appliedSource.reference} v${appliedSource.version}` : 'sem fonte'} · qualquer mudança só alcança novas análises após publicação.</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const dataConnectionShortLabel = {
  approved_exams: 'exames aprovados',
  checkins: 'check-ins',
  care_plans: 'planos publicados',
  messages: 'conversas',
} as const;

function PatientContextsPanel({
  contexts,
  relationships,
  exams,
  onToggle,
}: {
  contexts: PatientAiContext[];
  relationships: CareRelationship[];
  exams: ClinicalExamDocument[];
  onToggle: (patientId: string) => void;
}) {
  const statusOrder: PatientAiContextStatus[] = ['review_required', 'ready', 'insufficient_data', 'not_authorized', 'paused'];
  const orderedContexts = contexts.toSorted((left, right) => (
    statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status)
  ));
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#dbe4f0]">
      <header className="bg-[#f7faff] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dce9f8] text-[#124da0]"><UserCircle aria-hidden="true" size={22} /></span>
          <div><h4 className="text-sm font-bold text-[#071a3a]">Contextos privados dos pacientes</h4><p className="mt-1 text-xs leading-5 text-[#61718a]">O motor e a política são globais; nomes, documentos, dados e resultados permanecem separados por paciente.</p></div>
        </div>
      </header>
      <div className="divide-y divide-[#e7edf5] bg-white">
        {orderedContexts.map((context) => {
          const relationship = relationships.find((item) => item.id === context.relationshipId);
          if (!relationship) return null;
          const patientExams = exams.filter((exam) => exam.patientId === context.patientId);
          const approvedCount = patientExams.filter((exam) => exam.reviewStatus === 'approved').length;
          const pendingCount = patientExams.filter((exam) => exam.reviewStatus === 'awaiting_review').length;
          const presentation = patientContextPresentation[context.status];
          const canToggle = context.authorizationStatus === 'authorized';
          return (
            <article key={context.patientId} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Status tone={presentation.tone}>{presentation.label}</Status><span className="text-[11px] font-semibold text-[#61718a]">{approvedCount} {approvedCount === 1 ? 'aprovado' : 'aprovados'} · {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}</span></div>
                  <h5 className="mt-2 text-sm font-bold text-[#071a3a]">{relationship.patientName}</h5>
                  <p className="mt-1 text-xs leading-5 text-[#61718a]">{relationship.doctorName} · {context.reason}</p>
                  <p className="mt-1 text-[11px] text-[#61718a]">Última versão aplicada: {context.appliedConfigurationVersion ? `v${context.appliedConfigurationVersion}` : 'nenhuma'}{context.lastProcessedAt ? ` · ${context.lastProcessedAt}` : ''}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {canToggle ? <button type="button" aria-label={`${context.status === 'paused' ? 'Retomar' : 'Pausar'} IA para ${relationship.patientName}`} onClick={() => onToggle(context.patientId)} className="min-h-10 rounded-xl border border-[#cbd8e9] px-3 text-xs font-bold text-[#405675] hover:bg-[#f7faff]">{context.status === 'paused' ? 'Retomar IA' : 'Pausar IA'}</button> : null}
                  <Link aria-label={`Abrir contexto de ${relationship.patientName}`} href={`/medico/pacientes/${context.patientId}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#03132d] px-3 text-xs font-bold text-white hover:bg-[#082553]"><ArrowSquareOut aria-hidden="true" size={16} />Abrir contexto</Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgePanel({
  sources,
  activeModules,
  formOpen,
  form,
  formError,
  onOpenForm,
  onCloseForm,
  onUpdateForm,
  onSubmit,
  onActivate,
  onToggle,
  onRevise,
}: {
  sources: ClinicalKnowledgeSource[];
  activeModules: ClinicalAiModulePolicy[];
  formOpen: boolean;
  form: AddKnowledgeSourceInput;
  formError: string;
  onOpenForm: () => void;
  onCloseForm: () => void;
  onUpdateForm: <Key extends keyof AddKnowledgeSourceInput>(key: Key, value: AddKnowledgeSourceInput[Key]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onActivate: (sourceId: string) => void;
  onToggle: (sourceId: string) => void;
  onRevise: (source: ClinicalKnowledgeSource) => void;
}) {
  return (
    <section className="vivance-panel overflow-hidden rounded-2xl">
      <header className="flex flex-col gap-4 border-b border-[#dbe4f0] bg-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]"><Books aria-hidden="true" size={22} /></span><div><h3 className="text-xl font-semibold text-[#071a3a]">Biblioteca do rascunho</h3><p className="mt-1 text-sm leading-6 text-[#61718a]">Cada fonte guarda versão, origem e limitações. A qualidade é declarada pelo médico, não verificada automaticamente. Salve o rascunho para compartilhar a ficha.</p></div></div>
        {!formOpen ? <button type="button" onClick={onOpenForm} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#03132d] px-4 text-sm font-bold text-white transition-colors hover:bg-[#082553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2"><Plus aria-hidden="true" size={18} weight="bold" />Adicionar fonte</button> : null}
      </header>

      {formOpen ? (
        <form onSubmit={onSubmit} className="border-b border-[#dbe4f0] bg-[#f7faff] p-5 sm:p-6">
          <div><h4 className="text-base font-semibold text-[#071a3a]">Nova fonte para revisão</h4><p className="mt-1 text-xs leading-5 text-[#61718a]">Adicionar não ativa automaticamente. O médico revisa a ficha antes de permitir o uso.</p></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="Título" value={form.title} onChange={(value) => onUpdateForm('title', value)} />
            <TextField label="Organização ou periódico" value={form.organization} onChange={(value) => onUpdateForm('organization', value)} />
            <SelectField label="Tipo" value={form.kind} options={Object.entries(sourceKindLabels)} onChange={(value) => onUpdateForm('kind', value as KnowledgeSourceKind)} />
            <TextField label="Versão" value={form.version} onChange={(value) => onUpdateForm('version', value)} placeholder="Ex.: 2.1 ou 2026" />
            <label className="text-xs font-bold text-[#50627f]">Data de publicação<input type="date" value={form.publicationDate} onChange={(event) => onUpdateForm('publicationDate', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]" /></label>
            <TextField label="URL, DOI ou código interno" value={form.reference} onChange={(value) => onUpdateForm('reference', value)} />
            <SelectField label="Qualidade da evidência" value={form.evidenceQuality} options={Object.entries(evidenceQualityLabels)} onChange={(value) => onUpdateForm('evidenceQuality', value as EvidenceQuality)} />
          </div>
          <fieldset className="mt-4 rounded-2xl border border-[#cbd8e9] bg-white p-4">
            <legend className="px-2 text-xs font-bold text-[#405675]">Módulos em que esta fonte pode ser aplicada</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.entries(moduleLabels) as Array<[ClinicalAiModuleId, string]>).map(([moduleId, label]) => {
                const checked = form.applicableModuleIds.includes(moduleId);
                return (
                  <label key={moduleId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-[#405675] hover:bg-[#f7faff]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onUpdateForm(
                        'applicableModuleIds',
                        checked
                          ? form.applicableModuleIds.filter((item) => item !== moduleId)
                          : [...form.applicableModuleIds, moduleId],
                      )}
                      className="size-5 accent-[#124da0]"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextAreaField label="Achados relevantes" value={form.relevantClaims} onChange={(value) => onUpdateForm('relevantClaims', value)} />
            <TextAreaField label="Limitações e conflitos" value={form.limitations} onChange={(value) => onUpdateForm('limitations', value)} />
          </div>
          {form.kind === 'primary_study' ? (
            <fieldset className="mt-4 rounded-2xl border border-[#cbd8e9] bg-white p-4">
              <legend className="px-2 text-xs font-bold text-[#405675]">Ficha metodológica do estudo</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Desenho do estudo" value={form.studyDesign} onChange={(value) => onUpdateForm('studyDesign', value)} placeholder="Ex.: ensaio clínico randomizado" />
                <TextField label="População estudada" value={form.population} onChange={(value) => onUpdateForm('population', value)} placeholder="Ex.: adultos com obesidade" />
                <TextField label="Tamanho da amostra" value={form.sampleSize} onChange={(value) => onUpdateForm('sampleSize', value)} placeholder="Ex.: 420 participantes" />
                <TextField label="Seguimento" value={form.followUp} onChange={(value) => onUpdateForm('followUp', value)} placeholder="Ex.: 52 semanas" />
              </div>
              <div className="mt-4">
                <TextAreaField label="Financiamento e conflitos declarados" value={form.conflicts} onChange={(value) => onUpdateForm('conflicts', value)} />
              </div>
            </fieldset>
          ) : null}
          {formError ? <p role="alert" className="mt-3 text-sm font-bold text-[#9c453f]">{formError}</p> : null}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCloseForm} className="min-h-11 rounded-xl px-4 text-sm font-bold text-[#50627f]">Cancelar</button><button type="submit" className="min-h-11 rounded-xl bg-[#124da0] px-5 text-sm font-bold text-white hover:bg-[#0f3f83]">Adicionar para revisão</button></div>
        </form>
      ) : null}

      <div className="divide-y divide-[#e7edf5] bg-white">
        {sources.toSorted((left, right) => right.updatedAtIso.localeCompare(left.updatedAtIso)).map((source) => {
          const activeUseCount = activeModules.filter((modulePolicy) => (
            modulePolicy.enabled && modulePolicy.primaryKnowledgeSourceId === source.id
          )).length;
          return <article key={source.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><KnowledgeStatus source={source} /><Status tone="gray">{sourceKindLabels[source.kind]}</Status>{activeUseCount > 0 ? <Status tone="blue">Em uso em {activeUseCount} {activeUseCount === 1 ? 'módulo' : 'módulos'}</Status> : null}</div>
                <h4 className="mt-3 text-base font-semibold text-[#071a3a]">{source.title}</h4>
                <p className="mt-1 text-xs text-[#61718a]">{source.organization} · versão {source.version} · {source.reference}</p>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-[#61718a]">Aplicável em: {source.applicableModuleIds.map((moduleId) => moduleLabels[moduleId]).join(', ')}.</p>
              </div>
              {source.status === 'awaiting_review' ? (
                <button type="button" onClick={() => onActivate(source.id)} className="min-h-11 shrink-0 rounded-xl border border-[#9bb5d4] px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb]">Marcar ficha revisada no rascunho</button>
              ) : (
                <button type="button" role="switch" aria-checked={source.status === 'active'} aria-label={`${source.status === 'active' ? 'Pausar' : 'Reativar'} fonte ${source.title} no rascunho`} onClick={() => onToggle(source.id)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]"><Toggle checked={source.status === 'active'} label={source.title} />{source.status === 'active' ? 'Disponível no rascunho' : 'Indisponível no rascunho'}</button>
              )}
            </div>
            <button type="button" onClick={() => onRevise(source)} className="mt-2 min-h-11 text-xs font-bold text-[#124da0] underline">Criar revisão desta fonte</button>
            <details className="mt-3 border-t border-[#e7edf5] pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-bold text-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">Ver ficha da fonte</summary>
              <dl className="grid gap-3 pb-2 text-xs leading-5 sm:grid-cols-2">
                <div><dt className="font-bold text-[#405675]">Uso relevante</dt><dd className="mt-1 text-[#61718a]">{source.relevantClaims}</dd></div>
                <div><dt className="font-bold text-[#405675]">Limitações</dt><dd className="mt-1 text-[#61718a]">{source.limitations}</dd></div>
                <div><dt className="font-bold text-[#405675]">Qualidade</dt><dd className="mt-1 text-[#61718a]">{evidenceQualityLabels[source.evidenceQuality]}</dd></div>
                <div><dt className="font-bold text-[#405675]">Registro</dt><dd className="mt-1 text-[#61718a]">Acessada em {source.accessedAt} · atualizada por {source.addedBy}</dd></div>
                {source.studyDesign ? <div><dt className="font-bold text-[#405675]">Desenho e população</dt><dd className="mt-1 text-[#61718a]">{source.studyDesign} · {source.population}</dd></div> : null}
                {source.sampleSize ? <div><dt className="font-bold text-[#405675]">Amostra e seguimento</dt><dd className="mt-1 text-[#61718a]">{source.sampleSize}{source.followUp ? ` · ${source.followUp}` : ''}</dd></div> : null}
                {source.conflicts ? <div className="sm:col-span-2"><dt className="font-bold text-[#405675]">Financiamento e conflitos</dt><dd className="mt-1 text-[#61718a]">{source.conflicts}</dd></div> : null}
              </dl>
            </details>
          </article>;
        })}
      </div>
    </section>
  );
}

function TextField({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="text-xs font-bold text-[#50627f]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]" /></label>;
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-bold text-[#50627f]">{label}<textarea value={value} maxLength={4000} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-[#cbd8e9] bg-white px-3 py-3 text-sm leading-6 text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]" /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="text-xs font-bold text-[#50627f]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
