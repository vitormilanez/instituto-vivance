'use client';

import {
  Calculator,
  CheckCircle,
  FileText,
  Info,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getClinicalChangeDemo,
  type ClinicalChangeSource,
  type ClinicalOutputType,
} from './clinical-change-demo-data';
import { AiDraftBadge, ClinicalLayerBadge } from './clinical';
import { useClinicalIntelligence } from './clinical-intelligence-context';
import { getDefaultEncounterId } from './demo-routes';
import { parseSynthesisContent, type SavedSynthesis } from '../lib/clinical-synthesis-contract';
import { cn, Status } from './shared';

const outputTypePresentation: Record<ClinicalOutputType, { label: string; className: string }> = {
  FACT: { label: 'Dado original', className: 'border-[#b9d8cf] bg-[#edf7f4] text-[#0b6a5b]' },
  CALCULATION: { label: 'Cálculo reproduzível', className: 'border-[#c9d8ec] bg-[#edf3fb] text-[#355f95]' },
  REFERENCE_FLAG: { label: 'Flag do laudo', className: 'border-[#ead3a6] bg-[#fff8e9] text-[#825b0b]' },
  AI_SUMMARY: { label: 'Resumo da IA', className: 'border-[#c9d8ec] bg-[#edf3fb] text-[#456b9c]' },
  DATA_GAP: { label: 'Dado ausente', className: 'border-[#d6dce5] bg-[#f4f6f9] text-[#526681]' },
  SOURCE_CONFLICT: { label: 'Fontes conflitantes', className: 'border-[#efc7c3] bg-[#fdf0ef] text-[#8d3f39]' },
};

function OutputTypeBadge({ type }: { type: ClinicalOutputType }) {
  const presentation = outputTypePresentation[type];
  return (
    <span className={cn('inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-[11px] font-bold', presentation.className)}>
      {presentation.label}
    </span>
  );
}

function SourceReferences({
  sourceIds,
  sourceMap,
}: {
  sourceIds: string[];
  sourceMap: Map<string, ClinicalChangeSource>;
}) {
  return (
    <ul className="mt-3 divide-y divide-[#e7edf5] border-y border-[#e7edf5]">
      {sourceIds.map((sourceId) => {
        const source = sourceMap.get(sourceId);
        if (!source) return null;
        return (
          <li key={source.id} className="py-3 text-xs leading-5 text-[#61718a]">
            <strong className="block text-[#405675]">{source.label}</strong>
            <span>{source.date} · {source.origin} · {source.reviewState}</span>
            {source.limitation ? <span className="mt-1 block text-[#825b0b]">Limite: {source.limitation}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function DoctorClinicalChangeSummary({
  patientId,
  onNotify,
}: {
  patientId: string;
  onNotify?: (message: string) => void;
}) {
  // Patient switches reset the editor; a draft must never follow another patient.
  return <ClinicalChangeEditor key={patientId} patientId={patientId} onNotify={onNotify} />;
}

function ClinicalChangeEditor({ patientId, onNotify }: { patientId: string; onNotify?: (message: string) => void }) {
  const summary = getClinicalChangeDemo(patientId);
  const encounterId = getDefaultEncounterId(patientId);
  const {
    activeConfiguration,
    governedArtifacts,
    knowledgeSources,
    patientContexts,
    recordGovernedArtifact,
    loadGovernedArtifacts,
  } = useClinicalIntelligence();
  const [draftText, setDraftText] = useState(summary?.draft.text ?? '');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>(
    summary?.draft.points.map((point) => point.id) ?? [],
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedArtifact, setSavedArtifact] = useState<SavedSynthesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [comparisonText, setComparisonText] = useState('');
  const dirtyRef = useRef(false);
  const attemptRef = useRef<{ payload: string; id: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadGovernedArtifacts(patientId, encounterId, controller.signal).then((artifacts) => {
      if (controller.signal.aborted) return;
      const latest = artifacts[0] ?? null;
      const restored = latest ? parseSynthesisContent(latest.content) : null;
      if (latest && !restored) throw new Error('A revisão salva está incompleta. O conteúdo não será substituído.');
      setSavedArtifact(latest);
      if (restored && !dirtyRef.current) {
        setDraftText(restored.draftText);
        setSelectedPointIds(restored.selectedPointIds);
      } else if (restored) {
        setComparisonText(restored.draftText);
      }
      setLoadError('');
      setSaveError('');
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Não foi possível recuperar a revisão.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [patientId, encounterId, loadGovernedArtifacts, loadAttempt]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);
  const patientContext = patientContexts.find((context) => context.patientId === patientId);
  const patientAssistanceAllowed = patientContext?.authorizationStatus === 'authorized'
    && patientContext.status !== 'paused'
    && patientContext.status !== 'not_authorized';
  const longitudinalModule = activeConfiguration.modules.find((module) => module.id === 'longitudinal_analysis');
  const longitudinalSource = knowledgeSources.find((source) => source.id === longitudinalModule?.primaryKnowledgeSourceId);
  const synthesisModule = activeConfiguration.modules.find((module) => module.id === 'clinical_synthesis');
  const synthesisSource = knowledgeSources.find((source) => source.id === synthesisModule?.primaryKnowledgeSourceId);
  const longitudinalGovernanceAvailable = Boolean(
    patientAssistanceAllowed
    && longitudinalModule?.enabled
    && longitudinalSource?.status === 'active'
    && longitudinalSource.applicableModuleIds.includes('longitudinal_analysis')
    && longitudinalModule.requiredDataConnectionIds.every((connectionId) => (
      activeConfiguration.dataConnections.some((connection) => connection.id === connectionId && connection.enabled)
    ))
    && longitudinalModule.allowedCapabilityIds.every((capabilityId) => (
      activeConfiguration.capabilities.some((capability) => capability.id === capabilityId && capability.enabled)
    )),
  );
  const synthesisGovernanceAvailable = Boolean(
    patientAssistanceAllowed
    && synthesisModule?.enabled
    && synthesisSource?.status === 'active'
    && synthesisSource.applicableModuleIds.includes('clinical_synthesis')
    && synthesisModule.requiredDataConnectionIds.every((connectionId) => (
      activeConfiguration.dataConnections.some((connection) => connection.id === connectionId && connection.enabled)
    ))
    && synthesisModule.allowedCapabilityIds.every((capabilityId) => (
      activeConfiguration.capabilities.some((capability) => capability.id === capabilityId && capability.enabled)
    )),
  );
  const latestLongitudinalArtifact = governedArtifacts
    .filter((artifact) => artifact.patientId === patientId && artifact.moduleId === 'longitudinal_analysis')
    .toSorted((left, right) => right.createdAtIso.localeCompare(left.createdAtIso))[0];
  const legacySynthesisArtifact = governedArtifacts
    .filter((artifact) => artifact.patientId === patientId && artifact.moduleId === 'clinical_synthesis'
      && (!artifact.encounterId || artifact.encounterId === encounterId) && !artifact.content && artifact.persistence !== 'd1')
    .toSorted((left, right) => right.createdAtIso.localeCompare(left.createdAtIso))[0];
  const latestSynthesisArtifact = savedArtifact;
  const revisionNumber = savedArtifact?.version ?? 0;
  const isReviewSaved = Boolean(savedArtifact) && !hasUnsavedChanges && !loading && !loadError;
  const sourceMap = useMemo(
    () => new Map(summary?.sources.map((source) => [source.id, source]) ?? []),
    [summary],
  );

  if (!summary) return null;

  const markChanged = () => { dirtyRef.current = true; setHasUnsavedChanges(true); };
  const togglePoint = (pointId: string) => {
    setSelectedPointIds((current) => (
      current.includes(pointId)
        ? current.filter((id) => id !== pointId)
        : [...current, pointId]
    ));
    markChanged();
  };
  const canSave = draftText.trim().length > 0
    && draftText.length <= 20_000 && !loading && !saving && !loadError
    && selectedPointIds.length > 0
    && synthesisGovernanceAvailable;

  const saveReview = async () => {
    if (!canSave) return;
    const selectedSourceIds = summary?.draft.points
      .filter((point) => selectedPointIds.includes(point.id))
      .flatMap((point) => point.sourceIds) ?? [];
    const content = JSON.stringify({ draftText, selectedPointIds });
    const payload = `${revisionNumber}:${content}`;
    if (attemptRef.current?.payload !== payload) attemptRef.current = { payload, id: crypto.randomUUID() };
    setSaving(true);
    setSaveError('');
    try {
      const artifact = await recordGovernedArtifact({
        patientId,
        encounterId,
        baseVersion: revisionNumber,
        requestId: attemptRef.current.id,
        moduleId: 'clinical_synthesis',
        status: 'reviewed',
        sourceIds: selectedSourceIds,
        content,
      });
      if (!artifact) {
        throw new Error('A síntese não foi salva porque o contexto, os dados ou a diretriz do módulo não estão disponíveis.');
      }
      setSavedArtifact(artifact);
      dirtyRef.current = false;
      setHasUnsavedChanges(false);
      setComparisonText('');
      onNotify?.(`Resumo longitudinal revisado e salvo como artefato v${artifact.version} sob ${artifact.governance.knowledgeReference} v${artifact.governance.knowledgeVersion}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar. Seu texto continua no editor.');
    } finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="clinical-change-summary-title" className="vivance-panel overflow-hidden rounded-2xl">
      <header className="border-b border-[#dbe4f0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 id="clinical-change-summary-title" className="text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">Desde a última consulta</h2>
            <p className="mt-2 text-sm leading-6 text-[#61718a]">
              Mudanças objetivas entre {summary.period.from} e {summary.period.to}, com dado original, fórmula e limite disponíveis para conferência.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Status tone="blue">Dados do acompanhamento</Status>
            <Status tone={isReviewSaved ? 'green' : 'amber'}>{isReviewSaved ? `Revisado · v${revisionNumber}` : 'Revisão médica necessária'}</Status>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#e7edf5] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#50627f]">
            <span>{summary.sources.length} fontes registradas</span>
            <span>{summary.reviewItems.filter((item) => item.type === 'DATA_GAP').length} lacuna de dado</span>
            <span>{summary.reviewItems.filter((item) => item.type === 'SOURCE_CONFLICT').length} conflito de fonte</span>
          </div>
          <span className="text-xs text-[#61718a]">Consulta anterior: {summary.period.previousConsultation}</span>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#dbe4f0] bg-[#f7faff] p-4">
          <ShieldCheck aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-[#124da0]" />
          <div className="text-xs leading-5 text-[#61718a]">
            <p className="font-bold text-[#405675]">Governança da análise e da síntese</p>
            <p className="mt-1">{latestLongitudinalArtifact
              ? `Análise preservada: ${latestLongitudinalArtifact.governance.knowledgeReference} v${latestLongitudinalArtifact.governance.knowledgeVersion} · configuração v${latestLongitudinalArtifact.governance.configurationVersion} · impressão ${latestLongitudinalArtifact.contentFingerprint}.`
              : longitudinalGovernanceAvailable && longitudinalSource
                ? `${longitudinalModule?.label}: diretriz ${longitudinalSource.reference} v${longitudinalSource.version} disponível, mas este conteúdo ainda não tem execução registrada.`
                : 'Análise longitudinal assistida bloqueada: contexto, dados ou diretriz indisponíveis.'}</p>
            <p className="mt-1">{latestSynthesisArtifact
              ? `Síntese preservada: ${latestSynthesisArtifact.governance.knowledgeReference} v${latestSynthesisArtifact.governance.knowledgeVersion} · configuração v${latestSynthesisArtifact.governance.configurationVersion} · impressão ${latestSynthesisArtifact.contentFingerprint}.`
              : synthesisGovernanceAvailable && synthesisSource
                ? `${synthesisModule?.label}: ${synthesisSource.reference} v${synthesisSource.version} · configuração v${activeConfiguration.version}.`
                : 'Nova síntese assistida bloqueada; artefatos anteriores permanecem somente para conferência.'}</p>
          </div>
        </div>
      </header>

      <div className="grid divide-y divide-[#e7edf5] bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {summary.metrics.map((metric, index) => (
          <div key={metric.id} className={cn('p-4 sm:p-5', index === 2 && 'sm:border-t sm:border-[#e7edf5] xl:border-t-0')}>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#61718a]">
              <Calculator aria-hidden="true" size={17} className="text-[#124da0]" />
              <span>{metric.label}</span>
            </div>
            <p className="mt-3 text-xl font-semibold tabular-nums tracking-[-0.025em] text-[#071a3a]">{metric.value}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-[#124da0]">{metric.change}</p>
            <details className="mt-3 border-t border-[#e7edf5] pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-bold text-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Por que estou vendo isso?</summary>
              <div className="pb-2 text-xs leading-5 text-[#61718a]">
                <OutputTypeBadge type={metric.type} />
                <p className="mt-3"><strong className="text-[#405675]">Fórmula:</strong> {metric.formula}</p>
                <p className="mt-2"><strong className="text-[#405675]">Limite:</strong> {metric.limitation}</p>
                <SourceReferences sourceIds={metric.sourceIds} sourceMap={sourceMap} />
              </div>
            </details>
          </div>
        ))}
      </div>

      <div className="grid border-t border-[#dbe4f0] bg-white xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section aria-labelledby="lab-comparison-title" className="min-w-0 p-5 sm:p-6 xl:border-r xl:border-[#dbe4f0]">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]">
              <FileText aria-hidden="true" size={21} />
            </span>
            <div>
              <h3 id="lab-comparison-title" className="text-lg font-semibold text-[#071a3a]">Comparação objetiva dos exames</h3>
              <p className="mt-1 text-sm leading-6 text-[#61718a]">O sistema compara valores e calcula métricas aprovadas; não cria uma faixa ideal nem define meta terapêutica.</p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-[#e7edf5] border-y border-[#dbe4f0] md:hidden">
            {summary.labComparisons.map((comparison) => (
              <article key={comparison.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-semibold text-[#071a3a]">{comparison.label}</h4>
                  <OutputTypeBadge type={comparison.type} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#dbe4f0]">
                  <div className="bg-white p-3">
                    <dt className="text-xs font-semibold text-[#61718a]">18 jul</dt>
                    <dd className="mt-1 text-sm tabular-nums text-[#405675]">{comparison.previous}</dd>
                  </div>
                  <div className="bg-[#f7faff] p-3">
                    <dt className="text-xs font-semibold text-[#61718a]">14 ago</dt>
                    <dd className="mt-1 text-sm font-bold tabular-nums text-[#071a3a]">{comparison.current}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-[#61718a]">{comparison.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <caption className="sr-only">Comparação dos exames de julho e agosto de 2026</caption>
              <thead>
                <tr className="border-y border-[#dbe4f0] text-xs text-[#61718a]">
                  <th className="py-3 pr-4 font-semibold">Métrica</th>
                  <th className="px-4 py-3 font-semibold">18 jul</th>
                  <th className="px-4 py-3 font-semibold">14 ago</th>
                  <th className="pl-4 py-3 font-semibold">Natureza</th>
                </tr>
              </thead>
              <tbody>
                {summary.labComparisons.map((comparison) => (
                  <tr key={comparison.id} className="border-b border-[#e7edf5] align-top last:border-b-0">
                    <th className="py-4 pr-4 font-semibold text-[#071a3a]">
                      {comparison.label}
                      <span className="mt-1 block max-w-[36ch] text-xs font-normal leading-5 text-[#61718a]">{comparison.detail}</span>
                    </th>
                    <td className="px-4 py-4 tabular-nums text-[#405675]">{comparison.previous}</td>
                    <td className="px-4 py-4 tabular-nums font-bold text-[#071a3a]">{comparison.current}</td>
                    <td className="pl-4 py-4"><OutputTypeBadge type={comparison.type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-3 border-t border-[#e7edf5] pt-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">
              <Info aria-hidden="true" size={18} />
              Conferir fontes dos exames
            </summary>
            <SourceReferences sourceIds={['src-lab-jul-001', 'src-lab-aug-001']} sourceMap={sourceMap} />
          </details>
        </section>

        <aside aria-labelledby="review-items-title" className="bg-[#fbfcfe] p-5 sm:p-6">
          <h3 id="review-items-title" className="text-lg font-semibold text-[#071a3a]">Precisa de conferência humana</h3>
          <p className="mt-2 text-sm leading-6 text-[#61718a]">O sistema bloqueia inferências quando falta informação ou quando duas fontes não podem ser reconciliadas.</p>
          <div className="mt-5 divide-y divide-[#dbe4f0] border-y border-[#dbe4f0]">
            {summary.reviewItems.map((item) => (
              <article key={item.id} className="py-4">
                <div className="flex items-start gap-3">
                  <WarningCircle aria-hidden="true" size={20} weight="fill" className={cn('mt-0.5 shrink-0', item.type === 'SOURCE_CONFLICT' ? 'text-[#9c453f]' : 'text-[#825b0b]')} />
                  <div>
                    <OutputTypeBadge type={item.type} />
                    <h4 className="mt-2 text-sm font-bold text-[#071a3a]">{item.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-[#61718a]">{item.detail}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#405675]">Próximo passo: {item.nextStep}</p>
                  </div>
                </div>
                <details className="mt-2 pl-8">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-bold text-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Ver fontes relacionadas</summary>
                  <SourceReferences sourceIds={item.sourceIds} sourceMap={sourceMap} />
                </details>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <section aria-labelledby="assisted-draft-title" className="border-t border-[#dbe4f0] bg-[#f7faff] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {isReviewSaved ? <ClinicalLayerBadge layer="decisao_medica" /> : <AiDraftBadge />}
              <OutputTypeBadge type="AI_SUMMARY" />
            </div>
            <h3 id="assisted-draft-title" className="mt-4 text-xl font-semibold text-[#071a3a]">Rascunho para a próxima conversa</h3>
            <p className="mt-2 text-sm leading-6 text-[#61718a]">Edite o texto, escolha os pontos que entram na pauta e salve um artefato rastreável. Salvar não publica nem envia nada automaticamente.</p>
          </div>
          <div className="self-start">
            <Status tone={isReviewSaved ? 'green' : synthesisGovernanceAvailable ? 'blue' : 'gray'}>{isReviewSaved ? `Artefato revisado · v${revisionNumber}` : synthesisGovernanceAvailable ? 'Não publicado' : 'Nova síntese bloqueada'}</Status>
          </div>
        </div>

        <label htmlFor="clinical-change-draft" className="mt-5 block text-sm font-bold text-[#071a3a]">Resumo assistido editável</label>
        {loading ? <p role="status" className="mt-2 text-sm text-[#61718a]">Recuperando a última revisão salva…</p> : null}
        {legacySynthesisArtifact && !savedArtifact && !loading ? <p className="mt-2 text-sm text-[#775f2d]">A revisão antiga tem apenas metadados, sem texto recuperável. Confira e salve esta síntese para preservar o conteúdo completo.</p> : null}
        {loadError || saveError ? <div role="alert" className="mt-3 rounded-xl border border-[#ead3a6] bg-[#fff8e9] p-4 text-sm text-[#775f2d]">
          <p>{loadError || saveError}</p>
          <button type="button" disabled={loading || saving} onClick={() => { setLoading(true); setLoadAttempt((attempt) => attempt + 1); }} className="mt-2 min-h-11 font-bold underline">Recarregar revisão salva sem apagar meu texto</button>
        </div> : null}
        {comparisonText ? <details open className="mt-3 rounded-xl border border-[#dbe4f0] p-4 text-sm text-[#405675]"><summary className="cursor-pointer font-bold">Revisão salva v{revisionNumber} — compare antes de salvar uma nova versão</summary><p className="mt-3 whitespace-pre-wrap">{comparisonText}</p></details> : null}
        {!synthesisGovernanceAvailable ? <p className="mt-2 rounded-xl border border-[#ead3a6] bg-[#fff8e9] p-3 text-xs font-semibold leading-5 text-[#775f2d]">A edição de uma nova síntese está bloqueada enquanto o contexto do paciente, os dados exigidos ou a diretriz do módulo não estiverem disponíveis.</p> : null}
        <textarea
          id="clinical-change-draft"
          value={draftText}
          disabled={!synthesisGovernanceAvailable || loading || saving || Boolean(loadError)}
          maxLength={20_000}
          onChange={(event) => {
            setDraftText(event.target.value);
            markChanged();
          }}
          rows={6}
          className="mt-2 w-full resize-y rounded-xl border border-[#b9cae0] bg-white px-4 py-3 text-sm leading-6 text-[#405675] outline-none transition-shadow focus:border-[#124da0] focus:ring-2 focus:ring-[#124da0]/20"
        />
        <p className="mt-2 text-right text-xs tabular-nums text-[#61718a]">{draftText.length} caracteres</p>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[#071a3a]">Pontos sugeridos para incluir na pauta</legend>
          <div className="mt-3 grid gap-px overflow-hidden rounded-xl border border-[#dbe4f0] bg-[#dbe4f0] lg:grid-cols-2">
            {summary.draft.points.map((point) => {
              const selected = selectedPointIds.includes(point.id);
              return (
                <label key={point.id} className="flex min-h-[76px] cursor-pointer items-start gap-3 bg-white p-4 text-sm leading-6 text-[#405675] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#124da0]">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!synthesisGovernanceAvailable || loading || saving || Boolean(loadError)}
                    onChange={() => togglePoint(point.id)}
                    className="mt-1 size-5 shrink-0 accent-[#124da0]"
                  />
                  <span>
                    <strong className="block text-[#071a3a]">{point.text}</strong>
                    <span className="mt-1 block text-xs text-[#61718a]">{point.sourceIds.length} {point.sourceIds.length === 1 ? 'fonte vinculada' : 'fontes vinculadas'}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 border-t border-[#dbe4f0] pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold text-[#071a3a]">Perguntas sugeridas, não condutas</p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-[#61718a]">
              {summary.draft.questions.map((question) => <li key={question}>• {question}</li>)}
            </ul>
          </div>
          <button
            type="button"
            disabled={!canSave || isReviewSaved}
            onClick={saveReview}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#03132d] px-5 text-sm font-bold text-white transition-colors hover:bg-[#082553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#91a0b5]"
          >
            {isReviewSaved ? <CheckCircle aria-hidden="true" size={19} weight="fill" /> : <ShieldCheck aria-hidden="true" size={19} />}
            {saving ? 'Salvando revisão…' : isReviewSaved
              ? `Artefato salvo · v${revisionNumber}`
              : synthesisGovernanceAvailable
                ? 'Salvar síntese revisada'
                : 'Síntese assistida bloqueada'}
          </button>
        </div>
      </section>

      <details className="border-t border-[#dbe4f0] bg-white px-5 py-2 sm:px-6">
        <summary className="flex min-h-12 cursor-pointer list-none items-center text-sm font-bold text-[#405675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2">Ver todas as fontes desta análise</summary>
        <div className="pb-4">
          <SourceReferences sourceIds={summary.sources.map((source) => source.id)} sourceMap={sourceMap} />
        </div>
      </details>
    </section>
  );
}
