'use client';

import {
  CheckCircle,
  Database,
  FilePdf,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import {
  useClinicalIntelligence,
  type ClinicalExamDocument,
  type ClinicalExamField,
  type ExtractionConfidence,
} from './clinical-intelligence-context';
import { cn, Status } from './shared';
import { examReviewPresentation, selectPatientExams } from './care-workflow';

const confidencePresentation: Record<ExtractionConfidence, { label: string; className: string }> = {
  high: { label: 'Leitura alta', className: 'bg-[#e7f4ef] text-[#17624e]' },
  medium: { label: 'Leitura média', className: 'bg-[#fff0ca] text-[#77500a]' },
  low: { label: 'Leitura baixa', className: 'bg-[#fdecea] text-[#9c453f]' },
};

function formatExamDate(value: string) {
  if (!value) return 'Coleta não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

function ExamSourceCard({ exam }: { exam: ClinicalExamDocument }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-[#f7faff]">
      <div className="bg-[#03132d] p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#c4d8f4]">
            <FilePdf aria-hidden="true" size={23} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#a9bdd8]">Documento original</p>
            <h3 className="mt-1 break-words text-sm font-bold text-white">{exam.fileName}</h3>
            <p className="mt-2 text-xs leading-5 text-[#c9d7ea]">Preservado e vinculado a cada campo extraído.</p>
          </div>
        </div>
      </div>

      <dl className="divide-y divide-[#e7edf5] px-4">
        {[
          ['Paciente', exam.patientName],
          ['Enviado por', exam.submittedByLabel],
          ['Laboratório', exam.laboratory],
          ['Data da coleta', formatExamDate(exam.examDate)],
          ['Recebido', exam.receivedAt],
          ['Leitura assistida', exam.extractionVersion > 0 ? `versão ${exam.extractionVersion}` : 'não realizada'],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-3 text-xs leading-5">
            <dt className="font-semibold text-[#61718a]">{label}</dt>
            <dd className="font-bold text-[#405675]">{value}</dd>
          </div>
        ))}
      </dl>

      {exam.note ? <p className="border-t border-[#e7edf5] px-4 py-3 text-xs leading-5 text-[#61718a]">Observação: {exam.note}</p> : null}
      {exam.attachmentId ? <a href={`/api/care-files/${encodeURIComponent(exam.attachmentId)}`} className="flex min-h-12 items-center justify-center px-4 text-sm font-bold text-[#124da0] underline">Baixar documento original</a> : null}
      <details className="group border-t border-[#dbe4f0] bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#124da0]">
          Conferir transcrição do original
        </summary>
        <div className="border-t border-[#e7edf5] px-4 py-4">
          <p className="text-[11px] leading-5 text-[#61718a]">Valores lidos do documento antes de qualquer correção médica.</p>
          {exam.fields.length > 0 ? <dl className="mt-3 space-y-2">
            {exam.fields.map((field) => (
              <div key={field.id} className="flex items-start justify-between gap-3 text-xs leading-5">
                <dt className="text-[#61718a]">{field.label} · pág. {field.sourcePage}</dt>
                <dd className="text-right font-bold text-[#405675]">
                  {field.rawValue ? `${field.rawValue} ${field.rawUnit}` : 'Não identificado'}
                </dd>
              </div>
            ))}
          </dl> : <p className="mt-3 rounded-xl bg-[#f7faff] p-3 text-xs font-semibold leading-5 text-[#50627f]">Nenhuma extração automática foi realizada. Confira o arquivo original; a leitura manual não cria resultados laboratoriais.</p>}
        </div>
      </details>
    </aside>
  );
}

export function DoctorExamReviewPanel({
  patientId,
  onNotify,
}: {
  patientId: string;
  onNotify: (message: string) => void;
}) {
  const {
    hydrated,
    exams,
    knowledgeSources,
    careRelationships,
    patientContexts,
    activeConfiguration,
    approveExam,
  } = useClinicalIntelligence();
  const patientExams = useMemo(
    () => selectPatientExams(exams, patientId),
    [exams, patientId],
  );
  const firstPendingId = patientExams.find((exam) => exam.reviewStatus === 'awaiting_review')?.id;
  const [selectedExamId, setSelectedExamId] = useState(firstPendingId ?? patientExams[0]?.id ?? '');
  const [approvalError, setApprovalError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ClinicalExamField[]>>({});
  const [saving, setSaving] = useState(false);
  const updateExamField = (examId: string, fieldId: string, patch: Partial<ClinicalExamField>) => {
    if (saving) return;
    const exam = patientExams.find((item) => item.id === examId);
    if (!exam || exam.reviewStatus === 'approved') return;
    setDrafts((current) => ({ ...current, [examId]: (current[examId] ?? exam.fields).map((field) => field.id === fieldId ? { ...field, ...patch } : field) }));
  };
  const relationship = careRelationships.find((item) => item.patientId === patientId);
  const patientContext = patientContexts.find((item) => item.patientId === patientId);
  const examAnalysisPolicy = activeConfiguration.modules.find((module) => module.id === 'exam_analysis');
  const governingSource = knowledgeSources.find((source) => source.id === examAnalysisPolicy?.primaryKnowledgeSourceId);
  const governanceAvailable = Boolean(
    examAnalysisPolicy?.enabled
    && governingSource?.status === 'active'
    && governingSource.applicableModuleIds.includes('exam_analysis')
    && patientContext?.authorizationStatus === 'authorized'
    && patientContext.status !== 'paused'
    && patientContext.status !== 'not_authorized'
    && relationship?.status === 'active'
    && examAnalysisPolicy.requiredDataConnectionIds.every((connectionId) => (
      activeConfiguration.dataConnections.some((connection) => connection.id === connectionId && connection.enabled)
    ))
    && examAnalysisPolicy.allowedCapabilityIds.every((capabilityId) => (
      activeConfiguration.capabilities.some((capability) => capability.id === capabilityId && capability.enabled)
    )),
  );

  if (!hydrated) {
    return (
      <section className="vivance-panel rounded-2xl p-5 text-sm text-[#61718a] sm:p-6">
        Conectando documentos do acompanhamento…
      </section>
    );
  }

  const sourceExam = patientExams.find((exam) => exam.id === selectedExamId)
    ?? patientExams.find((exam) => exam.id === firstPendingId)
    ?? patientExams[0];
  const selectedExam = sourceExam && { ...sourceExam, fields: sourceExam.reviewStatus === 'awaiting_review' ? drafts[sourceExam.id] ?? sourceExam.fields : sourceExam.fields };
  if (!selectedExam) {
    return (
      <section aria-labelledby={`exam-review-title-${patientId}`} className="vivance-panel overflow-hidden rounded-2xl">
        <header className="border-b border-[#dbe4f0] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={patientContext?.status === 'review_required' ? 'amber' : patientContext?.status === 'ready' ? 'green' : 'gray'}>
              {patientContext?.status === 'not_authorized'
                ? 'IA sem autorização'
                : patientContext?.status === 'paused'
                  ? 'IA pausada'
                  : patientContext?.status === 'insufficient_data'
                    ? 'Dados insuficientes'
                    : patientContext?.status === 'review_required'
                      ? 'Revisão pendente'
                      : 'Módulo disponível'}
            </Status>
            <Status tone="gray">{relationship?.patientName ?? 'Paciente'} ↔ {relationship?.doctorName ?? 'Equipe médica'}</Status>
          </div>
          <h2 id={`exam-review-title-${patientId}`} className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">Análise de exames</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61718a]">Ainda não há exame estruturado neste contexto. O paciente continua conectado; a IA não reutiliza documentos nem valores de outra pessoa.</p>
        </header>
        <div className="grid gap-4 bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-dashed border-[#c7d5e7] bg-[#f7faff] p-5">
            <p className="text-sm font-bold text-[#405675]">Sem dados laboratoriais aprovados</p>
            <p className="mt-2 text-xs leading-5 text-[#61718a]">Quando um documento deste paciente for recebido, ele seguirá a leitura, a conferência médica e o versionamento antes de entrar em qualquer análise.</p>
          </div>
          <div className="rounded-2xl border border-[#dbe4f0] bg-white p-4 text-xs leading-5 text-[#61718a]">
            <p className="font-bold text-[#405675]">Diretriz do módulo</p>
            <p className="mt-2">{governanceAvailable && governingSource
              ? `${examAnalysisPolicy?.label} · ${governingSource.reference} v${governingSource.version} · configuração v${activeConfiguration.version}`
              : 'Sem diretriz ativa. A análise assistida permanece indisponível; o fluxo manual continua acessível.'}</p>
          </div>
        </div>
      </section>
    );
  }

  const includedFields = selectedExam.fields.filter((field) => field.included);
  const incompleteIncludedFields = includedFields.filter((field) => !field.value.trim() || !field.unit.trim());
  const missingFields = selectedExam.fields.filter((field) => !field.included);
  const correctedFields = selectedExam.fields.filter(
    (field) => field.included && (field.value !== field.rawValue || field.unit !== field.rawUnit),
  );
  const isManualDocumentReview = selectedExam.extractionVersion === 0 && selectedExam.fields.length === 0;
  const canApprove = selectedExam.reviewStatus === 'awaiting_review'
    && (
      isManualDocumentReview
      || (includedFields.length > 0 && incompleteIncludedFields.length === 0)
    );
  const appliedGovernance = selectedExam.governance
    .filter((snapshot) => snapshot.moduleId === 'exam_analysis')
    .toSorted((left, right) => right.governedAtIso.localeCompare(left.governedAtIso))[0];

  const handleApprove = async () => {
    if (saving) return;
    setApprovalError('');
    if (!canApprove) {
      setApprovalError('Revise valor e unidade de todos os campos incluídos.');
      return;
    }
    try {
      setSaving(true);
      await approveExam(selectedExam.id, selectedExam.fields);
      setDrafts((current) => { const next = { ...current }; delete next[selectedExam.id]; return next; });
      onNotify(isManualDocumentReview
        ? 'Leitura manual registrada. O documento foi revisado sem gerar dados para a IA.'
        : 'Exame aprovado. Os dados confirmados já estão disponíveis no histórico do acompanhamento e na Central da IA.');
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'Não foi possível aprovar este exame.');
    } finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="exam-review-title" className="vivance-panel overflow-hidden rounded-2xl">
      <header className="border-b border-[#dbe4f0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Status tone={examReviewPresentation(selectedExam).tone}>
                {examReviewPresentation(selectedExam).label}
              </Status>
              <Status tone="blue">{selectedExam.patientName} ↔ {selectedExam.doctorName}</Status>
            </div>
            <h2 id="exam-review-title" className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#071a3a]">
              Validar dados do novo exame
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#61718a]">
              Confira cada leitura contra o documento. Confiança de extração mede a leitura do arquivo; não representa confiança clínica.
            </p>
          </div>

          <label className="text-xs font-bold text-[#50627f]">
            Documento
            <select
              value={selectedExam.id}
              onChange={(event) => {
                setSelectedExamId(event.target.value);
                setApprovalError('');
              }}
              className="mt-2 min-h-11 w-full min-w-[260px] rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-semibold text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0]"
            >
              {patientExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {formatExamDate(exam.examDate)} · {exam.reviewStatus === 'approved' ? 'revisado' : 'pendente'}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-2 border-t border-[#e7edf5] pt-4 text-xs font-semibold text-[#50627f] sm:grid-cols-4">
          <span>{selectedExam.fields.length} campos lidos</span>
          <span>{includedFields.length} incluídos</span>
          <span>{missingFields.length} não localizado</span>
          <span>{correctedFields.length} {correctedFields.length === 1 ? 'correção médica' : 'correções médicas'}</span>
        </div>
      </header>

      <div className="border-b border-[#dbe4f0] bg-[#f7faff] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dce9f8] text-[#124da0]"><ShieldCheck aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-[#071a3a]">Governança da análise</p>
              <Status tone={appliedGovernance ? 'green' : 'amber'}>{appliedGovernance ? 'Versão preservada' : 'Conferência médica manual'}</Status>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#50627f]">
              {appliedGovernance
                ? `${appliedGovernance.moduleLabel} · ${appliedGovernance.knowledgeReference} v${appliedGovernance.knowledgeVersion} · configuração v${appliedGovernance.configurationVersion}`
                : 'Esta revisão confirma os dados conferidos pelo médico. Não registra uma nova execução de IA nem valida as diretrizes configuradas no protótipo.'}
            </p>
            {examAnalysisPolicy ? <p className="mt-1 text-[11px] leading-5 text-[#61718a]">Objetivo: {examAnalysisPolicy.feedbackGoal}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 bg-white p-5 sm:p-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ExamSourceCard exam={selectedExam} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#071a3a]">Extração para conferência</h3>
              <p className="mt-1 text-sm leading-6 text-[#61718a]">Desmarque o que não deve entrar no histórico ou corrija o valor mantendo o original ao lado.</p>
            </div>
            {selectedExam.reviewStatus === 'approved' ? (
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#e7f4ef] px-3 text-xs font-bold text-[#17624e]">
                <CheckCircle aria-hidden="true" size={17} weight="fill" />
                Disponível para o cuidado
              </span>
            ) : null}
          </div>

          <div className="mt-4 divide-y divide-[#e7edf5] border-y border-[#dbe4f0]">
            {selectedExam.fields.length === 0 ? (
              <div className="py-5">
                <p className="text-sm font-bold text-[#405675]">Leitura assistida não realizada</p>
                <p className="mt-2 text-xs leading-5 text-[#61718a]">O documento original permanece disponível para o médico. Autorize a IA neste acompanhamento antes de solicitar uma nova extração; este arquivo não é processado retroativamente.</p>
              </div>
            ) : selectedExam.fields.map((field) => {
              const confidence = confidencePresentation[field.extractionConfidence];
              const changed = field.value !== field.rawValue || field.unit !== field.rawUnit;
              return (
                <article key={field.id} className={cn('py-4', !field.included && 'bg-[#fbfcfe]')}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(170px,0.8fr)_minmax(230px,1fr)_minmax(180px,0.8fr)] lg:items-start">
                    <label className="flex min-h-11 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={field.included}
                        disabled={selectedExam.reviewStatus === 'approved'}
                        onChange={(event) => updateExamField(selectedExam.id, field.id, { included: event.target.checked })}
                        className="mt-1 size-5 shrink-0 accent-[#124da0]"
                      />
                      <span>
                        <strong className="block text-sm text-[#071a3a]">{field.label}</strong>
                        <span className="mt-1 block text-xs text-[#61718a]">Original: {field.rawValue || 'não localizado'} {field.rawValue ? field.rawUnit : ''}</span>
                      </span>
                    </label>

                    <div className="grid grid-cols-[minmax(100px,1fr)_110px] gap-2">
                      <label className="text-xs font-semibold text-[#61718a]">
                        Valor revisado
                        <input
                          value={field.value}
                          disabled={!field.included || selectedExam.reviewStatus === 'approved'}
                          onChange={(event) => updateExamField(selectedExam.id, field.id, { value: event.target.value })}
                          inputMode="decimal"
                          aria-label={`Valor revisado de ${field.label}`}
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-bold tabular-nums text-[#071a3a] outline-none focus:ring-2 focus:ring-[#124da0] disabled:bg-[#f1f4f8] disabled:text-[#8290a3]"
                          placeholder="Não informado"
                        />
                      </label>
                      <label className="text-xs font-semibold text-[#61718a]">
                        Unidade
                        <input
                          value={field.unit}
                          disabled={!field.included || selectedExam.reviewStatus === 'approved'}
                          onChange={(event) => updateExamField(selectedExam.id, field.id, { unit: event.target.value })}
                          aria-label={`Unidade revisada de ${field.label}`}
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cbd8e9] bg-white px-3 text-sm font-semibold text-[#405675] outline-none focus:ring-2 focus:ring-[#124da0] disabled:bg-[#f1f4f8] disabled:text-[#8290a3]"
                        />
                      </label>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', confidence.className)}>{confidence.label}</span>
                        <span className="text-[11px] font-semibold text-[#61718a]">Página {field.sourcePage}</span>
                        {changed ? <Status tone="blue">Corrigido</Status> : null}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#61718a]">Referência impressa: {field.referenceRange}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {missingFields.length > 0 ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ead3a6] bg-[#fff8e9] p-4">
              <WarningCircle aria-hidden="true" size={20} weight="fill" className="mt-0.5 shrink-0 text-[#825b0b]" />
              <div>
                <p className="text-sm font-bold text-[#5f470f]">Dado ausente preservado como lacuna</p>
                <p className="mt-1 text-xs leading-5 text-[#775f2d]">A insulina em jejum não foi localizada. O sistema não estima o valor e mantém o HOMA-IR indisponível.</p>
              </div>
            </div>
          ) : null}

          {approvalError ? <p role="alert" className="mt-4 text-sm font-bold text-[#9c453f]">{approvalError}</p> : null}

          <div className="mt-5 flex flex-col gap-3 border-t border-[#e7edf5] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-[#61718a]">
              Aprovar registra autoria e versão. Não produz diagnóstico, prescrição ou mensagem automática.
            </p>
            <button
              type="button"
              disabled={!canApprove || saving}
              onClick={handleApprove}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#03132d] px-5 text-sm font-bold text-white transition-colors hover:bg-[#082553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#91a0b5]"
            >
              {selectedExam.reviewStatus === 'approved' ? <CheckCircle aria-hidden="true" size={19} weight="fill" /> : <ShieldCheck aria-hidden="true" size={19} />}
              {selectedExam.reviewStatus === 'approved'
                ? `Exame revisado · v${selectedExam.reviewVersion}`
                : isManualDocumentReview
                  ? 'Registrar leitura manual'
                  : 'Aprovar dados do exame'}
            </button>
          </div>

          <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-[#61718a]">
            <Database aria-hidden="true" size={15} />
            Estado persistido neste navegador para simular a conexão real entre paciente e médico.
          </p>
        </div>
      </div>
    </section>
  );
}
