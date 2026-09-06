'use client';

import {
  ArrowRight,
  CheckCircle,
  FileText,
  Microphone,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { AiDraftBadge, ClinicalLayerBadge } from './clinical';
import { useCareDemo } from './care-demo-store';
import type { CareCheckIn } from './care-demo-types';
import { DEFAULT_PATIENT_ID, getPatientDossierHref } from './demo-routes';
import { cn, NavigationLink as Link, Status } from './shared';

type CaptureMode = 'voice' | 'text' | 'guided';

type RichCheckIn = Omit<CareCheckIn, 'aiSummary'> & {
  aiDraft?: string;
  aiGaps?: string[];
  aiSummary?: string | string[];
  assistedDraft?: string;
  audioDurationSeconds?: number;
  audioRef?: string;
  captureMode?: 'voice' | 'text';
  inputMode?: 'voice' | 'text';
  originalContent?: string;
  originalText?: string;
  responseMode?: 'voice' | 'text';
  structuredDraft?: string;
  transcript?: string;
  transcription?: string;
};

interface CheckInPresentation {
  aiAssistanceAllowed: boolean;
  aiDraft: string | null;
  audioDurationSeconds: number | null;
  audioRef: string | null;
  gaps: string[];
  id: string;
  mode: CaptureMode;
  originalContent: string;
  submittedAt: string;
  version: number;
}

const sleepLabel: Record<CareCheckIn['sleepQuality'], string> = {
  poor: 'ruim',
  regular: 'regular',
  good: 'bom',
};

export function DoctorPrescriptionNotice({ patientId }: { patientId: string }) {
  const [feedback, setFeedback] = useState('');
  if (patientId !== DEFAULT_PATIENT_ID) return null;

  return (
    <section className="rounded-2xl border border-[#ead8ad] bg-[#fffaf0] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Status tone="amber">Receita · vence em 8 dias</Status>
            <Status tone="gray">Aviso operacional</Status>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[#071a3a]">Revisar antes de preparar uma nova receita</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#704f10]">
            O prazo gera somente esta pendência. A emissão depende de decisão e ação do médico; não há renovação automática.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFeedback('Rascunho de renovação aberto para revisão médica.')}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#071a3a] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2"
        >
          Preparar renovação
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#704f10]" aria-live="polite">{feedback}</p>
    </section>
  );
}

function asRecord(value: unknown) {
  return value as Record<string, unknown>;
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function stringList(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  }
  return [];
}

function getCaptureMode(record: Record<string, unknown>): CaptureMode {
  const value = firstString(record, ['captureMode', 'inputMode', 'responseMode']);
  if (value === 'voice' || value === 'text') return value;
  return 'guided';
}

function formatAudioDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function presentLiveCheckIn(checkIn: CareCheckIn): CheckInPresentation {
  const richCheckIn = checkIn as RichCheckIn;
  const record = asRecord(richCheckIn);
  const mode = getCaptureMode(record);
  const originalContent = firstString(record, [
    'originalText',
    'originalContent',
    'transcript',
    'transcription',
  ]) ?? `Energia ${checkIn.energy}/5 · sono ${sleepLabel[checkIn.sleepQuality]} · ${checkIn.newSymptom ? 'sintoma novo marcado' : 'nenhum sintoma novo marcado'}.`;
  const aiAssistanceAllowed = checkIn.aiAssistanceAllowed !== false;
  const aiSummaryLines = stringList(record, ['aiSummary']);
  const aiDraft = aiAssistanceAllowed
    ? firstString(record, [
        'aiDraft',
        'assistedDraft',
        'structuredDraft',
      ]) ?? (aiSummaryLines.length > 0
        ? aiSummaryLines.join(' ')
        : `A pessoa registrou energia ${checkIn.energy}/5, sono ${sleepLabel[checkIn.sleepQuality]} e ${checkIn.newSymptom ? 'uma mudança que precisa ser detalhada' : 'nenhum sintoma novo no formulário guiado'}. Confirmar o contexto diretamente com ela.`)
    : null;
  const explicitGaps = stringList(record, ['aiGaps', 'gaps']);
  const inferredGaps = [
    mode === 'guided' ? 'O envio contém respostas guiadas, sem relato livre nesta versão.' : '',
    checkIn.newSymptom
      ? mode === 'guided'
        ? 'Tipo, início, intensidade e evolução da mudança ainda não foram descritos.'
        : 'Intensidade, duração e evolução da mudança precisam ser confirmadas.'
      : '',
    checkIn.newSymptom && mode !== 'guided'
      ? 'A relação com alimentação, medicamento ou outra causa ainda não foi confirmada.'
      : '',
  ].filter(Boolean);
  const audioDurationSeconds = typeof richCheckIn.audioDurationSeconds === 'number'
    ? richCheckIn.audioDurationSeconds
    : null;

  return {
    aiAssistanceAllowed,
    aiDraft,
    audioDurationSeconds,
    audioRef: typeof richCheckIn.audioRef === 'string' ? richCheckIn.audioRef : null,
    gaps: [...new Set([...explicitGaps, ...inferredGaps])],
    id: checkIn.id,
    mode,
    originalContent,
    submittedAt: checkIn.submittedAt,
    version: checkIn.version,
  };
}

function EmptyCheckInState({ patientId }: { patientId: string }) {
  const isIncompleteScenario = patientId === 'pac-demo-006';

  return (
    <section
      aria-labelledby="doctor-patient-checkin-review-title"
      className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white"
    >
      <div className="flex flex-col gap-4 bg-[#071a3a] p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <h2 id="doctor-patient-checkin-review-title" className="text-xl font-semibold tracking-[-0.025em]">
            Check-in ainda não recebido
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c7d5e7]">
            Não há uma fonte original para leitura neste acompanhamento.
          </p>
        </div>
        <Status tone={isIncompleteScenario ? 'amber' : 'gray'}>
          {isIncompleteScenario ? 'Preparação incompleta' : 'Sem envio nesta sessão'}
        </Status>
      </div>

      <div className="grid gap-px bg-[#dbe4f0] sm:grid-cols-3">
        <div className="bg-white p-5">
          <FileText aria-hidden="true" size={21} className="text-[#7890ac]" />
          <h3 className="mt-3 text-sm font-bold text-[#071a3a]">Fonte original ausente</h3>
          <p className="mt-1 text-xs leading-5 text-[#61718a]">Nenhum texto, áudio ou resposta guiada foi atribuído à pessoa.</p>
        </div>
        <div className="bg-[#f7faff] p-5">
          <ShieldCheck aria-hidden="true" size={21} className="text-[#456b9c]" />
          <h3 className="mt-3 text-sm font-bold text-[#071a3a]">IA não gerou rascunho</h3>
          <p className="mt-1 text-xs leading-5 text-[#61718a]">Sem fonte, a ausência permanece visível e não é transformada em normalidade.</p>
        </div>
        <div className="bg-[#fffaf0] p-5">
          <WarningCircle aria-hidden="true" size={21} className="text-[#77500a]" />
          <h3 className="mt-3 text-sm font-bold text-[#071a3a]">Próximo passo humano</h3>
          <p className="mt-1 text-xs leading-5 text-[#704f10]">A equipe decide se solicita o preenchimento; o protótipo não cria alerta clínico.</p>
        </div>
      </div>
    </section>
  );
}

export function DoctorPatientCheckInReview({
  patientId,
  encounterId,
}: {
  patientId: string;
  encounterId: string;
}) {
  const {
    hydrated,
    latestCheckIn,
    latestCheckInReview,
    reviewCheckIn,
  } = useCareDemo(patientId, encounterId);
  const [feedback, setFeedback] = useState('');
  const [hasError, setHasError] = useState(false);

  if (!hydrated) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="doctor-patient-checkin-review-loading-title"
        className="rounded-2xl border border-[#dbe4f0] bg-white p-5 sm:p-6"
      >
        <h2 id="doctor-patient-checkin-review-loading-title" className="text-lg font-semibold text-[#071a3a]">Carregando o check-in...</h2>
        <p className="mt-2 text-sm text-[#61718a]">Nenhum dado de outra pessoa é exibido durante a preparação.</p>
      </section>
    );
  }

  const checkIn = latestCheckIn ? presentLiveCheckIn(latestCheckIn) : null;

  if (!checkIn) return <EmptyCheckInState patientId={patientId} />;

  const isReviewed = Boolean(latestCheckInReview);
  const modeLabel = checkIn.mode === 'voice'
    ? 'Relato por voz'
    : checkIn.mode === 'text'
      ? 'Relato por texto'
      : 'Respostas guiadas';
  const SourceIcon = checkIn.mode === 'voice' ? Microphone : FileText;
  const historyHref = getPatientDossierHref(patientId);

  const registerReading = async () => {
    if (isReviewed) return;
    try {
      const review = await reviewCheckIn(checkIn.id);
      setHasError(false);
      setFeedback(`Leitura humana registrada em ${review.reviewedAt}.`);
    } catch (error) {
      setHasError(true);
      setFeedback(error instanceof Error ? error.message : 'Não foi possível registrar a leitura da fonte.');
    }
  };

  return (
    <section
      aria-labelledby="doctor-patient-checkin-review-title"
      className="overflow-hidden rounded-2xl border border-[#c7d5e7] bg-white"
    >
      <div className="flex flex-col gap-4 bg-[#071a3a] p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <h2 id="doctor-patient-checkin-review-title" className="text-xl font-semibold tracking-[-0.025em]">
            Novo check-in recebido
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c7d5e7]">
            Fonte enviada pela pessoa e organização assistida permanecem em camadas separadas.
          </p>
        </div>
        <Status tone={isReviewed ? 'blue' : 'amber'}>
          {isReviewed ? 'Leitura humana registrada' : 'Aguardando leitura humana'}
        </Status>
      </div>

      <div className="grid lg:grid-cols-2">
        <article className="p-5 sm:p-6 lg:border-r lg:border-[#dbe4f0]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ClinicalLayerBadge layer="relato" />
            <span className="text-xs font-semibold tabular-nums text-[#61718a]">v{checkIn.version} · {checkIn.submittedAt}</span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3fb] text-[#124da0]">
              <SourceIcon aria-hidden="true" size={21} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[#071a3a]">{modeLabel}</h3>
              <p className="mt-0.5 text-xs text-[#61718a]">
                {checkIn.mode === 'voice' && checkIn.audioRef
                  ? 'Transcrição ligada à referência do áudio original'
                  : 'Conteúdo preservado como recebido'}
              </p>
            </div>
          </div>

          <blockquote className="mt-4 rounded-xl bg-[#f6f9fe] p-4 text-sm leading-6 text-[#405675]">
            “{checkIn.originalContent}”
          </blockquote>

          {checkIn.mode === 'voice' ? (
            <dl className="mt-4 grid gap-3 text-xs text-[#61718a] sm:grid-cols-2">
              <div>
                <dt className="font-bold text-[#405675]">Duração</dt>
                <dd className="mt-1 tabular-nums">{checkIn.audioDurationSeconds === null ? 'Não informada' : formatAudioDuration(checkIn.audioDurationSeconds)}</dd>
              </div>
              <div>
                <dt className="font-bold text-[#405675]">Referência do áudio</dt>
                <dd className="mt-1 break-all">{checkIn.audioRef ?? 'Não armazenada nesta versão demonstrativa'}</dd>
              </div>
            </dl>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-[#61718a]">ID da fonte: <span className="break-all font-semibold text-[#405675]">{checkIn.id}</span>. O resumo assistido nunca substitui este conteúdo.</p>
        </article>

        <article className="border-t border-[#dbe4f0] bg-[#f7faff] p-5 sm:p-6 lg:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {checkIn.aiAssistanceAllowed ? (
              <AiDraftBadge>Organizado pela IA · revisão obrigatória</AiDraftBadge>
            ) : (
              <Status tone="gray">Organização por IA não autorizada</Status>
            )}
            <Status tone="gray">Fonte rastreável</Status>
          </div>
          <h3 className="mt-5 text-base font-semibold text-[#071a3a]">
            {checkIn.aiDraft ? 'Rascunho para preparar a conversa' : 'Sem rascunho assistido'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#405675]">
            {checkIn.aiDraft ?? 'A pessoa escolheu enviar somente a fonte original. Nenhum resumo foi criado.'}
          </p>

          <div className="mt-5 border-t border-[#dbe4f0] pt-4">
            <h4 className="text-sm font-bold text-[#071a3a]">Lacunas para confirmar</h4>
            {checkIn.gaps.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {checkIn.gaps.map((gap) => (
                  <li key={gap} className="flex gap-2 text-xs leading-5 text-[#61718a]">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#d39439]" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-5 text-[#61718a]">Nenhuma lacuna estrutural marcada. A interpretação e qualquer decisão continuam sob responsabilidade médica.</p>
            )}
          </div>

          <p className="mt-5 rounded-xl border border-[#ead8ad] bg-[#fffaf0] p-3 text-xs leading-5 text-[#704f10]">Este rascunho não diagnostica, não define urgência, não prescreve e não é enviado à pessoa.</p>
        </article>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#dbe4f0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href={historyHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-[#124da0] underline decoration-[#9bb5d4] underline-offset-4 transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2"
        >
          Ver histórico e versões
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <button
          type="button"
          onClick={registerReading}
          disabled={isReviewed}
          aria-describedby="doctor-patient-checkin-review-helper"
          className={cn(
            'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-not-allowed',
            isReviewed
              ? 'bg-[#edf3fb] text-[#124da0]'
              : 'bg-[#124da0] text-white hover:bg-[#0f3f83] disabled:bg-[#8a9aaf] disabled:text-white',
          )}
        >
          {isReviewed ? <CheckCircle aria-hidden="true" size={19} weight="fill" /> : <ShieldCheck aria-hidden="true" size={19} />}
          {isReviewed ? `Lida em ${latestCheckInReview?.reviewedAt}` : 'Registrar leitura da fonte'}
        </button>
      </div>

      <div id="doctor-patient-checkin-review-helper" className="border-t border-[#e7edf5] bg-[#fbfdff] px-5 py-3 text-xs leading-5 text-[#61718a] sm:px-6">
        Registrar leitura confirma apenas que a fonte foi aberta; não aprova conteúdo clínico nem publica orientação.
      </div>
      <p
        aria-live="polite"
        className={cn('min-h-0 px-5 text-xs font-semibold sm:px-6', feedback && 'border-t border-[#e7edf5] py-3', hasError ? 'text-[#9c453f]' : 'text-[#124da0]')}
      >
        {feedback}
      </p>
    </section>
  );
}
