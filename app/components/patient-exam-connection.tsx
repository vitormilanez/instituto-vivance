'use client';

import {
  CheckCircle,
  FileArrowUp,
  FilePdf,
  LinkSimple
} from '@phosphor-icons/react';
import { useMemo,useState } from 'react';
import { CareSubmissionComposer } from './care-submission-composer';
import { examReviewPresentation,selectExamIntake } from './care-workflow';
import { useClinicalIntelligence } from './clinical-intelligence-context';
import { Status } from './shared';

function formatExamDate(value: string) {
  if (!value) return 'Coleta não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function PatientExamConnection({ patientId }: { patientId: string }) {
  const { hydrated, exams, careRelationships, patientContexts } = useClinicalIntelligence();
  const [formOpen, setFormOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { patientExams, latest: latestExam, pendingCount } = useMemo(
    () => selectExamIntake(exams, patientId),
    [exams, patientId],
  );
  const relationship = careRelationships.find((item) => item.patientId === patientId && item.status === 'active');
  const patientContext = patientContexts.find((item) => item.patientId === patientId);
  const doctorName = relationship?.doctorName ?? 'equipe médica';

  if (!hydrated) return null;

  return (
    <section aria-labelledby="patient-exams-title" className="mt-7 overflow-hidden rounded-2xl border border-[#d9e5e0] bg-white">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e8f0fb] text-[#124da0]">
              <FileArrowUp aria-hidden="true" size={22} weight="duotone" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="patient-exams-title" className="text-lg font-semibold text-[#17372f]">Meus exames</h2>
                <Status tone="blue">Conectado com {doctorName}</Status>
                {patientContext ? <Status tone={patientContext.status === 'ready' ? 'green' : patientContext.status === 'review_required' ? 'amber' : 'gray'}>{patientContext.status === 'not_authorized' ? 'IA não autorizada' : patientContext.status === 'paused' ? 'IA pausada' : 'IA autorizada'}</Status> : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-[#60766f]">Compartilhe um documento e acompanhe a revisão feita pela equipe.</p>
            </div>
          </div>
          {!formOpen ? (
            <button
              type="button"
              onClick={() => {
                setFormOpen(true);
                setSuccessMessage('');
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8cde8] bg-white px-4 text-sm font-bold text-[#124da0] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2"
            >
              <FileArrowUp aria-hidden="true" size={18} />
              Enviar novo exame
            </button>
          ) : null}
        </div>

        {latestExam ? (
          <article className="mt-5 grid gap-4 rounded-2xl border border-[#dfe8e3] bg-[#f8fbfa] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <span className="grid size-11 place-items-center rounded-xl bg-white text-[#0b6a5b] shadow-[0_4px_14px_rgba(23,55,47,0.06)]">
              <FilePdf aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#17372f]">{latestExam.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#60766f]">{formatExamDate(latestExam.examDate)} · {latestExam.laboratory}</p>
              <p className="mt-1 text-xs text-[#60766f]">Original preservado · {latestExam.extractionVersion > 0 ? `leitura assistida v${latestExam.extractionVersion}` : 'sem leitura assistida'}</p>
            </div>
            <div className="sm:text-right">
              <Status tone={examReviewPresentation(latestExam).tone}>
                {examReviewPresentation(latestExam).label}
              </Status>
              {latestExam.reviewedBy ? <p className="mt-2 text-[11px] font-semibold text-[#60766f]">por {latestExam.reviewedBy}</p> : null}
            </div>
          </article>
        ) : (
          <p className="mt-5 rounded-xl bg-[#f7faf8] p-4 text-sm text-[#60766f]">Nenhum exame compartilhado ainda.</p>
        )}

        {patientExams.length > 1 ? (
          <details className="mt-3 border-t border-[#e4ece8] pt-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#0b6a5b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68]">
              <LinkSimple aria-hidden="true" size={17} />
              Ver histórico de {patientExams.length} exames
            </summary>
            <ul className="divide-y divide-[#e4ece8] border-y border-[#e4ece8]">
              {patientExams.map((exam) => (
                <li key={exam.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                  <span><strong className="text-[#17372f]">{formatExamDate(exam.examDate)}</strong><span className="ml-2 text-[#60766f]">{exam.fileName}</span></span>
                  <span className="font-bold text-[#526a62]">{examReviewPresentation(exam).label}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {successMessage ? (
          <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-[#e7f4ef] p-4 text-sm font-semibold leading-6 text-[#17624e]">
            <CheckCircle aria-hidden="true" size={19} weight="fill" className="mt-0.5 shrink-0" />
            {successMessage}
          </p>
        ) : null}

        {pendingCount > 0 && !formOpen ? (
          <p className="mt-4 text-xs leading-5 text-[#60766f]">{pendingCount} {pendingCount === 1 ? 'documento aguarda' : 'documentos aguardam'} conferência. A IA não usa campos pendentes como dados confirmados.</p>
        ) : null}
      </div>

      {formOpen ? (
        <div className="border-t border-[#d9e5e0] p-4"><CareSubmissionComposer patientId={patientId} examOnly onDone={() => { setFormOpen(false); setSuccessMessage('Exame recebido no acompanhamento. O original aguarda conferência médica.'); }} /><button type="button" onClick={() => setFormOpen(false)} className="min-h-11 px-4 text-sm font-bold text-[#0b6a5b]">Fechar envio</button></div>
      ) : null}
    </section>
  );
}
