'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { getDefaultEncounterId } from './demo-routes';
import { useSharedCare } from './shared-care-context';
import { cycleKey, type CareFile, type CareSubmission } from '../lib/care-cycle-contract';

const field = 'mt-2 min-h-12 w-full rounded-xl border border-[#bfd4cd] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0b7b68]';
const button = 'min-h-12 rounded-xl bg-[#0b7b68] px-5 text-sm font-bold text-white disabled:opacity-50';
export function CareSubmissionComposer({ patientId, examOnly = false, onDone }: { patientId: string; examOnly?: boolean; onDone?: () => void }) {
  const shared = useSharedCare();
  const encounterId = getDefaultEncounterId(patientId);
  const connected = Boolean(shared.cycles[cycleKey(patientId, encounterId)]);
  const id = useId();
  const [kind, setKind] = useState<CareSubmission['kind']>(examOnly ? 'pdf' : 'text');
  const [title, setTitle] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [examDate, setExamDate] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const uploaded = useRef<CareFile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!originalText && !file) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [originalText, file]);
  const submit = async () => {
    if (busy || !confirmed || !connected) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (file && !uploaded.current) {
        const form = new FormData(); form.set('file', file);
        const response = await fetch(`/api/care-files?${new URLSearchParams({ patientId, encounterId })}`, { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) });
        const data = await response.json() as { file?: CareFile; error?: string };
        if (!response.ok || !data.file) throw new Error(data.error ?? 'Não foi possível guardar o arquivo.');
        uploaded.current = data.file;
      }
      const saved = await shared.mutate<CareSubmission>(patientId, encounterId, 'submitInformation', [{
        kind, category: examOnly ? 'exam' : 'record', title: title.trim(), originalText: originalText.trim(),
        attachmentId: uploaded.current?.id ?? null, examDate: examDate || null, confirmed: true,
      }]);
      setMessage(`Recebido em ${new Date(saved.receivedAt).toLocaleString('pt-BR')}. A equipe pode conferir seu envio.`);
      setTitle(''); setOriginalText(''); setFile(null); setReviewing(false); setConfirmed(false); uploaded.current = null;
      if (fileInput.current) fileInput.current.value = '';
      onDone?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível enviar. O conteúdo foi mantido.'); }
    finally { setBusy(false); }
  };
  const ready = title.trim().length >= 3 && (kind === 'text' ? originalText.trim().length >= 3 : Boolean(file));
  return <section aria-labelledby={`${id}-heading`} className="rounded-2xl border border-[#d9e5e0] bg-white p-5 text-[#17372f] sm:p-6">
    <h2 id={`${id}-heading`} className="text-lg font-semibold">{examOnly ? 'Enviar exame para conferência' : 'Compartilhar com a equipe'}</h2>
    <p className="mt-2 text-sm leading-6 text-[#60766f]">{examOnly ? 'O arquivo original chega ao médico, sem inventar resultados ou preencher valores ausentes.' : 'Conte como está ou anexe um áudio, uma foto ou um documento.'} Neste ambiente, use apenas dados fictícios.</p>
    {!connected ? <p className="mt-3 text-sm text-amber-800">{shared.loaded ? 'Este cenário ainda não tem um vínculo salvo para envio.' : 'Recuperando acompanhamento…'}</p> : null}
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {message ? <p role="status" className="mt-4 rounded-xl bg-[#e7f4ef] p-3 text-sm">{message}</p> : null}
    <fieldset disabled={busy || !connected} className="mt-4 min-w-0 space-y-4 disabled:opacity-70">
      {!reviewing ? <>
        <label className="block text-sm font-semibold">Formato
          <select className={field} value={kind} onChange={(event) => { setKind(event.target.value as CareSubmission['kind']); setFile(null); uploaded.current = null; }}>
            {!examOnly ? <option value="text">Texto</option> : null}
            {!examOnly ? <option value="audio">Áudio gravado</option> : null}
            <option value="photo">Foto (JPG ou PNG)</option><option value="pdf">Documento PDF</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Título do envio<input className={field} value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} placeholder={examOnly ? 'Exame solicitado no último retorno' : 'Como foi minha semana'} /></label>
        {kind !== 'text' ? <label className="block text-sm font-semibold">Arquivo de até 8 MB
          <input key={kind} ref={fileInput} type="file" accept={kind === 'photo' ? '.jpg,.jpeg,.png' : kind === 'pdf' ? '.pdf' : '.mp3,.wav,.webm,.m4a'} className={field} onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            if (selected && selected.size > 8 * 1024 * 1024) { setError('O limite é de 8 MB.'); event.target.value = ''; setFile(null); return; }
            setFile(selected); uploaded.current = null; setError('');
          }} />
        </label> : null}
        {examOnly ? <label className="block text-sm font-semibold">Data da coleta, se souber<input type="date" className={field} value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label> : null}
        <label className="block text-sm font-semibold">{kind === 'text' ? 'Seu relato' : 'Observação para a equipe (opcional)'}<textarea className={`${field} min-h-28`} value={originalText} maxLength={8000} onChange={(event) => setOriginalText(event.target.value)} /></label>
        <p className="text-xs leading-5 text-[#60766f]">Não há transcrição, leitura de imagem ou interpretação automática neste envio. A conferência é médica.</p>
        <button type="button" className={button} disabled={!ready} onClick={() => { setReviewing(true); setConfirmed(false); setError(''); }}>Conferir antes de enviar</button>
      </> : <>
        <div className="rounded-xl bg-[#f7faf8] p-4 text-sm"><p className="font-bold">{title}</p>{file ? <p className="mt-2 break-words">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p> : null}<p className="mt-3 whitespace-pre-wrap break-words">{originalText || 'Sem observação adicional.'}</p><p className="mt-3 text-xs">O médico receberá o original acima. Nenhuma orientação será publicada automaticamente.</p></div>
        <label className="flex min-h-12 items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-5 shrink-0" />Conferi o conteúdo fictício e quero compartilhá-lo com minha equipe de acompanhamento.</label>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setReviewing(false)} className="min-h-12 rounded-xl border border-[#bfd4cd] px-4 text-sm font-bold">Voltar e editar</button><button type="button" className={button} disabled={!confirmed || busy} onClick={() => void submit()}>{busy ? 'Confirmando recebimento…' : 'Confirmar envio'}</button></div>
      </>}
    </fieldset>
    <p className="mt-4 text-xs leading-5 text-[#60766f]">Este canal não é acompanhado continuamente e não substitui atendimento de urgência.</p>
  </section>;
}
