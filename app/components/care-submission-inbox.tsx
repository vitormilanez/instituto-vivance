'use client';
import { useState } from 'react';
import { cycleKey, type CareSubmission } from '../lib/care-cycle-contract';
import { useSharedCare } from './shared-care-context';
import { Status } from './shared';

const when = (value: string) => new Date(value).toLocaleString('pt-BR');
const labels = { received: 'Recebido · aguardando revisão', reviewed: 'Revisado pela equipe', published: 'Retorno publicado' };
function OriginalSubmission({ item }: { item: CareSubmission }) {
  return <div className="mt-4 rounded-xl border border-[#dbe4f0] bg-[#f7faff] p-4 text-sm">
    <p className="text-xs font-bold text-[#61718a]">Original preservado · enviado por {item.receivedBy}</p>
    <p className="mt-2 whitespace-pre-wrap break-words text-[#405675]">{item.originalText || 'Envio sem observação adicional.'}</p>
    {item.attachment ? <a href={`/api/care-files/${encodeURIComponent(item.attachment.id)}`} className="mt-3 inline-flex min-h-11 items-center break-all font-bold text-[#124da0] underline">Baixar original: {item.attachment.name}</a> : null}
  </div>;
}
function MedicalReview({ item }: { item: CareSubmission }) {
  const { mutate } = useSharedCare();
  const [review, setReview] = useState(item.reviewText ?? '');
  const [feedback, setFeedback] = useState(item.feedbackDraft ?? '');
  const [baseline, setBaseline] = useState(item.reviewVersion);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const changedElsewhere = baseline !== item.reviewVersion;
  const dirty = review !== (item.reviewText ?? '') || feedback !== (item.feedbackDraft ?? '');
  const run = async (publish: boolean) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const saved = await mutate<CareSubmission>(item.patientId, item.encounterId, publish ? 'publishFeedback' : 'reviewInformation', [{ id: item.id, reviewVersion: baseline, reviewText: review, feedbackDraft: feedback }]);
      setBaseline(saved.reviewVersion); setReview(saved.reviewText ?? ''); setFeedback(saved.feedbackDraft ?? '');
      setMessage(publish ? 'Retorno publicado para a paciente.' : 'Revisão salva. O rascunho do retorno continua privado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar. O texto foi mantido.'); }
    finally { setBusy(false); }
  };
  if (item.status === 'published') return <div className="mt-4 rounded-xl bg-[#e7f4ef] p-4 text-sm"><p className="font-bold">Retorno publicado em {when(item.publishedAt!)}</p><p className="mt-2 whitespace-pre-wrap break-words">{item.publishedFeedback}</p><details className="mt-3"><summary className="min-h-11 cursor-pointer font-semibold">Ver revisão interna preservada · v{item.reviewVersion}</summary><p className="whitespace-pre-wrap">{item.reviewText}</p></details></div>;
  return <div className="mt-4">
    {changedElsewhere ? <p role="alert" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Há uma revisão mais recente. Copie o que deseja manter e <button type="button" className="min-h-11 font-bold underline" onClick={() => { setBaseline(item.reviewVersion); setReview(item.reviewText ?? ''); setFeedback(item.feedbackDraft ?? ''); }}>carregue a revisão salva</button>. Seu rascunho não foi substituído.</p> : null}
    <fieldset disabled={busy || changedElsewhere} className="min-w-0 space-y-4">
      <label className="block text-sm font-bold">Revisão interna do médico<textarea value={review} onChange={(event) => setReview(event.target.value)} maxLength={8000} placeholder="O que mudou, quais fontes foram conferidas e o que ainda precisa ser esclarecido." className="mt-2 min-h-28 w-full rounded-xl border border-[#cbd8e9] p-3 font-normal" /></label>
      <label className="block text-sm font-bold">Rascunho de retorno à paciente<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={8000} placeholder="Escreva somente o que deseja publicar após a revisão." className="mt-2 min-h-24 w-full rounded-xl border border-[#cbd8e9] p-3 font-normal" /></label>
      <p className="text-xs leading-5 text-[#61718a]">A organização automática deste envio ainda não foi executada. A revisão é manual, com original e lacunas visíveis; não há diagnóstico ou prescrição automática.</p>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={review.trim().length < 3 || busy} onClick={() => void run(false)} className="min-h-11 rounded-xl border border-[#cbd8e9] px-4 text-sm font-bold text-[#124da0] disabled:opacity-50">Salvar revisão privada</button><button type="button" disabled={busy || dirty || item.status !== 'reviewed' || !feedback.trim()} onClick={() => void run(true)} className="min-h-11 rounded-xl bg-[#124da0] px-4 text-sm font-bold text-white disabled:opacity-40">Publicar retorno à paciente</button></div>
    </fieldset>
    <p role="status" className="mt-3 text-sm text-[#405675]">{busy ? 'Salvando no acompanhamento…' : message}</p>
  </div>;
}
export function CareSubmissionInbox({ patientId, encounterId, doctor = false }: { patientId: string; encounterId: string; doctor?: boolean }) {
  const { cycles, loaded } = useSharedCare();
  const items = cycles[cycleKey(patientId, encounterId)]?.submissions ?? [];
  const pending = items.filter((item) => item.status === 'received').length;
  return <section className="mt-6 rounded-2xl border border-[#dbe4f0] bg-white p-5 text-[#071a3a] sm:p-6" aria-label={doctor ? 'Envios para revisão' : 'Meus envios e retornos'}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{doctor ? 'Envios para revisão' : 'Meus envios e retornos'}</h2><Status tone={pending ? 'amber' : 'gray'}>{pending} {pending === 1 ? 'pendente' : 'pendentes'}</Status></div>
    <p className="mt-2 text-sm leading-6 text-[#61718a]">{doctor ? 'Original → revisão privada → publicação. A paciente nunca recebe um rascunho não publicado.' : 'Veja o que chegou à equipe e os retornos que o médico publicou para você.'}</p>
    {!items.length ? <p className="mt-4 text-sm text-[#61718a]">{loaded ? 'Nenhum novo envio neste acompanhamento.' : 'Carregando envios…'}</p> : null}
    <div className="mt-4 space-y-4">{[...items].reverse().map((item) => <details key={item.id} className="rounded-xl border border-[#dbe4f0] p-4">
      <summary className="min-h-12 cursor-pointer"><span className="font-bold">{item.title}</span><span className="mt-1 block text-xs text-[#61718a]">{labels[item.status]} · {when(item.receivedAt)}</span></summary>
      <OriginalSubmission item={item} />
      {item.reviewedAt ? <p className="mt-3 text-xs text-[#61718a]">Conferido por {item.reviewedBy} em {when(item.reviewedAt)} · revisão {item.reviewVersion}</p> : null}
      {doctor ? <MedicalReview item={item} /> : item.publishedFeedback ? <div className="mt-4 rounded-xl bg-[#e7f4ef] p-4 text-sm"><p className="font-bold">Retorno da equipe · {when(item.publishedAt!)}</p><p className="mt-2 whitespace-pre-wrap break-words">{item.publishedFeedback}</p></div> : <p className="mt-3 text-sm text-[#61718a]">{item.status === 'received' ? 'Seu envio aguarda conferência.' : 'O médico conferiu seu envio. Ainda não há retorno publicado.'}</p>}
    </details>)}</div>
  </section>;
}
