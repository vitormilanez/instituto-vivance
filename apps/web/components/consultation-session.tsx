"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, FileText, LoaderCircle, Pause, Play, RotateCcw, Square, Video } from "lucide-react";
import { BrowserRecognitionCapture, browserAudio, supportsTabAudio, type CaptureMode, type CapturedSegment, type CaptureState, type RecognitionFactory } from "@/modules/teleconsultations/browser-recognition";
import type { ConsultationWorkflowView } from "@/modules/consultation-workflow/types";
import type { ConsultationSummary, ConsultationSummaryCategory } from "@/modules/consultation-workflow/summary-types";
import { consultationSummaryCategories } from "@/modules/consultation-workflow/summary-types";
import "@/app/consultation-session.css";

const titles: Record<string, string> = {
  discussed: "O que foi discutido", patient_goals: "O que o paciente busca", difficulties: "Dificuldades e rotina",
  conditions_and_history: "Condições e antecedentes", medications_and_supplements: "Medicamentos e suplementos", goals: "Metas combinadas",
  actions_and_followup: "Ações e acompanhamento", uncertainties: "Pontos para conferir",
};
const assertions: Record<string, string> = { patient_report: "Relato do paciente", doctor_statement: "Fala do médico", agreed_action: "Combinado na consulta", hypothesis: "Hipótese mencionada", uncertainty: "Conferir" };
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function ConsultationSession({ tenantId, appointmentId, patientName, joinUrl, encounterId, appointmentVersion, endpoint, demo = false }: {
  tenantId: string; appointmentId: string; patientName: string; joinUrl?: string | null; encounterId?: string | null; appointmentVersion?: number;
  endpoint?: string; demo?: boolean;
}) {
  const base = endpoint ?? `/api/v1/clinics/${tenantId}/consultation-workflow/appointments/${appointmentId}`;
  const router = useRouter();
  const [view, setView] = useState<ConsultationWorkflowView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [mode, setMode] = useState<CaptureMode>("microphone");
  const [supported, setSupported] = useState(false);
  const [remoteSupported, setRemoteSupported] = useState(false);
  const [acceptedCare, setAcceptedCare] = useState(Boolean(encounterId));
  const [recordId, setRecordId] = useState(encounterId ?? null);
  const [interim, setInterim] = useState("");
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [reviewNote, setReviewNote] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [corrected, setCorrected] = useState<ConsultationSummary | null>(null);
  const controller = useRef<BrowserRecognitionCapture | null>(null);
  const capture = useRef<{ id: string; startedAt: string; next: number } | null>(null);
  const queue = useRef<Array<{ captureId: string; chunkIndex: number; clientChunkId: string; text: string; capturedAt: string; startSeconds: number; endSeconds: number; speaker: "unknown" }>>([]);
  const drainPromise = useRef<Promise<void> | null>(null);
  const stopWaiter = useRef<(() => void) | null>(null);
  const sourceEnd = useRef(0);
  const cancelled = useRef(false);
  const requestedCaptureId = useRef<string | null>(null);

  async function read() {
    const response = await fetch(base, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível abrir esta consulta.");
    const state = result as ConsultationWorkflowView;
    setView(state);
    if (state.capture.id && state.capture.startedAt) {
      capture.current = { id: state.capture.id, startedAt: state.capture.startedAt, next: state.capture.nextChunkIndex };
      sourceEnd.current = state.capture.segments.at(-1)?.endSeconds ?? 0;
    }
    return state;
  }
  async function action(name: string, payload: object = {}) {
    const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, payload }), signal: AbortSignal.timeout(name === "end" || name === "process_summary" || name === "simulate" ? 90000 : 20000) });
    const result = await response.json();
    if (!response.ok) {
      if ([401, 403, 409].includes(response.status)) controller.current?.stop();
      throw new Error(result.error ?? "Não foi possível concluir esta etapa.");
    }
    setView(result as ConsultationWorkflowView);
    return result as ConsultationWorkflowView;
  }
  useEffect(() => {
    const browser = window as Window & { SpeechRecognition?: RecognitionFactory; webkitSpeechRecognition?: RecognitionFactory };
    const hasRemote = supportsTabAudio(navigator.userAgent) && Boolean(navigator.mediaDevices?.getDisplayMedia);
    queueMicrotask(() => {
      if (cancelled.current) return;
      setSupported(Boolean((browser.SpeechRecognition ?? browser.webkitSpeechRecognition) && window.isSecureContext));
      setRemoteSupported(hasRemote);
      setMode(hasRemote ? "tab_and_microphone" : "microphone");
      void read().catch(cause => setError(cause instanceof Error ? cause.message : "Consulta indisponível.")).finally(() => setLoading(false));
    });
    cancelled.current = false;
    return () => { cancelled.current = true; controller.current?.destroy(); stopWaiter.current?.(); };
    // A new appointment remounts this component; no capture restarts on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);
  const active = ["starting", "listening", "stopping"].includes(captureState);
  useEffect(() => {
    if (!active && !unsavedCount) return;
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const preventNavigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      if (!window.confirm("A consulta está em andamento ou há trechos aguardando salvamento. Sair interrompe a captura. Deseja sair?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", before); document.addEventListener("click", preventNavigation, true);
    return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("click", preventNavigation, true); };
  }, [active, unsavedCount]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => { void fetch(base, { cache: "no-store" }).then(async response => {
      if (!response.ok) { controller.current?.stop(); setError("Acesso à consulta interrompido. A captura foi parada."); return; }
      const state = await response.json() as ConsultationWorkflowView;
      if (state.consent.decision !== "granted") { controller.current?.stop(); setView(state); setNotice("A autorização foi retirada. A captura foi interrompida."); }
    }).catch(() => { controller.current?.stop(); setError("Sem conexão para conferir a autorização. A captura foi pausada."); }); }, 10000);
    return () => window.clearInterval(timer);
  }, [active, base]);

  function drain() {
    if (drainPromise.current) return drainPromise.current;
    const run = async () => {
      while (queue.current.length) {
        const chunk = queue.current[0];
        await action("append_chunk", chunk);
        queue.current.shift(); setUnsavedCount(queue.current.length);
      }
    };
    drainPromise.current = run().finally(() => { drainPromise.current = null; });
    return drainPromise.current;
  }
  function remember(segment: CapturedSegment) {
    const current = capture.current;
    if (!current) return;
    const elapsed = Math.max(0, (Date.parse(segment.capturedAt) - Date.parse(current.startedAt)) / 1000);
    if (current.next >= 360 || elapsed > 14400 || segment.text.length > 2000) {
      controller.current?.stop(); setError("Limite de captura alcançado. Encerre e revise os trechos já salvos."); return;
    }
    queue.current.push({ captureId: current.id, chunkIndex: current.next++, clientChunkId: crypto.randomUUID(), text: segment.text, capturedAt: segment.capturedAt, startSeconds: Math.min(sourceEnd.current, elapsed), endSeconds: elapsed, speaker: "unknown" });
    sourceEnd.current = elapsed; setUnsavedCount(queue.current.length);
    void drain().catch(cause => setError(`${cause instanceof Error ? cause.message : "Sem conexão."} Os trechos pendentes continuam nesta tela; tente salvar novamente.`));
  }
  async function openRecord() {
    if (recordId || demo) return recordId;
    const response = await fetch(`/api/v1/clinics/${tenantId}/encounters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_id: appointmentId, appointment_version: appointmentVersion, accept_care: acceptedCare }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível abrir o registro do atendimento.");
    setRecordId(result.id); return result.id as string;
  }
  function start() {
    if (busy || active || !acceptedCare || view?.consent.decision !== "granted") return;
    const browser = window as Window & { SpeechRecognition?: RecognitionFactory; webkitSpeechRecognition?: RecognitionFactory };
    const factory = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!factory) return;
    setError(""); setNotice("");
    controller.current?.destroy();
    controller.current = new BrowserRecognitionCapture(factory, async (inputMode, signal) => {
      // Request audio from the initiating gesture, before server round trips.
      const input = await browserAudio(inputMode, signal);
      try {
        requestedCaptureId.current ??= capture.current?.id ?? crypto.randomUUID();
        const state = await action("begin", { captureId: requestedCaptureId.current });
        if (signal.aborted || cancelled.current) throw new Error("Início cancelado.");
        if (!state.capture.id || !state.capture.startedAt) throw new Error("A consulta não confirmou o início. Tente novamente.");
        capture.current = { id: state.capture.id, startedAt: state.capture.startedAt, next: Math.max(state.capture.nextChunkIndex, capture.current?.next ?? 0) };
        await openRecord();
        return input;
      } catch (cause) { input.release(); throw cause; }
    }, {
      state: value => { setCaptureState(value); if (value === "paused") { stopWaiter.current?.(); stopWaiter.current = null; } },
      segment: remember, interim: setInterim, notice: setNotice,
    });
    void controller.current.start(mode, capture.current ? Date.parse(capture.current.startedAt) + 14400000 - 5000 : undefined);
  }
  async function stopCapture() {
    if (!controller.current || !active) return;
    const stopped = new Promise<void>(resolve => { stopWaiter.current = resolve; });
    controller.current.stop();
    await stopped;
  }
  async function pause() {
    setBusy(true); setError("");
    try { await stopCapture(); await drain(); await action("pause", { captureId: capture.current?.id }); setNotice("Consulta pausada. Os trechos captados foram salvos."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível pausar."); }
    finally { setBusy(false); }
  }
  async function end() {
    setBusy(true); setError("");
    try { await stopCapture(); await drain(); await action("end", { captureId: capture.current?.id }); setNotice("Conversa encerrada. Confira o resumo antes de utilizar no registro."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível encerrar. Os trechos salvos foram preservados."); }
    finally { setBusy(false); }
  }
  async function review(decision: "accepted" | "rejected") {
    const draft = view?.summary.draft;
    if (!draft) return;
    setBusy(true); setError("");
    try { await action("review_summary", { summaryId: draft.id, expectedVersion: draft.version, decision, note: reviewNote, ...(decision === "accepted" && editingSummary && corrected ? { correctedSummary: corrected } : {}) }); setEditingSummary(false); setNotice(decision === "accepted" ? "Revisão registrada. O resumo permanece interno ao médico." : "Resumo marcado como não utilizar. O texto original foi preservado."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a revisão."); }
    finally { setBusy(false); }
  }
  const summary = editingSummary && corrected ? corrected : view?.summary.draft?.summary;
  const finalized = view?.capture.status === "finalized";
  const consentLabel = view?.consent.decision === "granted" ? "Autorizado pelo paciente" : view?.consent.decision === "refused" ? "Paciente preferiu seguir sem assistência" : view?.consent.decision === "withdrawn" ? "Autorização retirada" : "Aguardando autorização do paciente";
  return <section className="consultation-session" aria-label="Conduzir consulta" aria-busy={busy || loading}>
    <div className="cs-session-heading"><div><h2>{finalized ? "Resumo da consulta" : "Consulta com " + patientName}</h2><p>{finalized ? "Confira os fatos, as fontes e os combinados da conversa." : "Converse com o paciente. As informações ficam organizadas para sua revisão."}</p></div><span className="cs-session-state">{active ? "Em andamento" : finalized ? "Conversa encerrada" : "Pronta para iniciar"}</span></div>
    {demo && <p className="cs-demo-note">Simulação local · conversa fictícia de 15 minutos · falantes identificados manualmente na amostra · nenhum áudio real. Não comprova a identificação das vozes na captura do navegador.</p>}
    {loading ? <p role="status">Abrindo consulta…</p> : <>
      <div className="cs-readiness"><span>{consentLabel}</span>{!finalized && (demo ? <Link href="/refinamentos-preview?tela=consentimento-consulta">Ver autorização do paciente fictício</Link> : <button type="button" className="secondary quiet" onClick={() => void navigator.clipboard.writeText(new URL(`/clinicas/${tenantId}/meu-cuidado/consultas/${appointmentId}`, window.location.origin).href).then(() => setNotice("Link copiado. O paciente pode autorizar ao entrar em sua própria conta.")).catch(() => setError("Não foi possível copiar. A autorização também está em Minhas consultas, no app do paciente."))}>Copiar link de autorização</button>)}{view?.patientId && <Link href={demo ? "/refinamentos-preview?tela=ficha-consultas" : `/clinicas/${tenantId}/pacientes/${view.patientId}#historico-consultas`}>Ver na ficha do paciente</Link>}{recordId && <Link href={`/clinicas/${tenantId}/atendimentos/${recordId}?etapa=consulta`}>Abrir registro clínico</Link>}</div>
      {!finalized && <>
        {!acceptedCare && <label className="cs-care-check"><input type="checkbox" checked={acceptedCare} onChange={event => setAcceptedCare(event.target.checked)} />Confirmo que sou responsável por este atendimento.</label>}
        <div className="cs-call-actions">
          {demo ? <button type="button" disabled={busy || view?.consent.decision !== "granted"} onClick={async () => { setBusy(true); setError(""); try { await action("simulate"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível simular."); } finally { setBusy(false); } }}><Play size={17} aria-hidden="true" />Simular consulta de 15 minutos</button> : <button type="button" disabled={busy || active || !supported || !acceptedCare || view?.consent.decision !== "granted" || unsavedCount > 0} onClick={start}><Play size={17} aria-hidden="true" />{view?.capture.id ? "Retomar consulta" : "Iniciar consulta"}</button>}
          {active && <button type="button" className="secondary" disabled={busy} onClick={() => void pause()}><Pause size={17} aria-hidden="true" />Pausar</button>}
          {view?.capture.id && view.capture.status !== "cancelled" && <button type="button" className="secondary" disabled={busy} onClick={() => void end()}><Square size={17} aria-hidden="true" />Encerrar e revisar resumo</button>}
          {joinUrl && <a className="button secondary" href={joinUrl} target="_blank" rel="noopener noreferrer"><Video size={17} aria-hidden="true" />Entrar no Meet<ExternalLink size={14} aria-hidden="true" /></a>}
        </div>
        {!demo && !active && view?.consent.decision === "granted" && <details className="cs-options"><summary>Opções de áudio</summary><label htmlFor={`cs-audio-${appointmentId}`}>Como você vai conversar?</label><select id={`cs-audio-${appointmentId}`} value={mode} onChange={event => setMode(event.target.value as CaptureMode)} disabled={busy || Boolean(view?.capture.id)}>{remoteSupported && <option value="tab_and_microphone">Meet e meu microfone</option>}<option value="microphone">Conversa presencial pelo microfone</option></select><p>{mode === "tab_and_microphone" ? "Ao iniciar, selecione a aba do Meet e compartilhe o áudio da aba." : "Capta somente o áudio que chega ao microfone. A fala remota com fones pode faltar."}</p></details>}
        {!demo && !supported && <p className="cs-notice">Este navegador não oferece a captura necessária. O registro manual continua disponível.</p>}
        {view?.consent.decision !== "granted" && <p className="cs-notice">A conversa pode continuar normalmente. O resumo assistido depende da autorização do paciente.</p>}
        {!demo && <button type="button" className="secondary quiet" disabled={busy || active || !acceptedCare} onClick={async () => { setBusy(true); setError(""); try { const id = await openRecord(); if (id) router.push(`/clinicas/${tenantId}/atendimentos/${id}?etapa=consulta`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir."); } finally { setBusy(false); } }}>Continuar com registro manual</button>}
      </>}
      {busy && <p className="cs-progress" role="status"><LoaderCircle size={16} aria-hidden="true" />{finalized ? "Organizando o resumo da conversa…" : "Salvando esta etapa…"}</p>}
      {active && <p role="status" className="cs-capture-status">{captureState === "listening" ? "Captando a conversa" : "Preparando áudio…"} · {unsavedCount ? `${unsavedCount} trecho(s) aguardando salvamento` : "Trechos recebidos salvos"}</p>}
      {interim && <p className="cs-interim">{interim}</p>}
      {unsavedCount > 0 && !active && <button type="button" className="secondary" disabled={busy} onClick={() => void drain().then(() => setError("")).catch(cause => setError(cause.message))}><RotateCcw size={16} aria-hidden="true" />Salvar trechos pendentes</button>}
      {view?.capture.status === "capturing" && !active && !demo && <p className="cs-notice">A captura está parada neste navegador. Clique em Retomar para continuar a conversa com assistência.</p>}
      {finalized && !summary && <div className="cs-empty-summary"><h3>{view.summary.status === "cancelled" ? "Resumo não autorizado" : "Resumo aguardando processamento"}</h3><p>O texto salvo foi preservado. A abertura desta tela não gera uma nova versão automaticamente.</p>{!["cancelled", "unavailable"].includes(view.summary.status) && <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await action("process_summary"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Resumo indisponível."); } finally { setBusy(false); } }}>Retomar geração do resumo</button>}</div>}
      {summary && <div className="cs-summary">
        <div className="cs-summary-heading"><span>{view?.summary.review?.decision === "accepted" ? "Revisado pelo médico" : view?.summary.review?.decision === "rejected" ? "Não utilizar" : "Rascunho · revisão médica necessária"}</span><small>{summary.mode === "model_generated" ? "Organizado por IA a partir da conversa" : "Trechos organizados sem síntese de IA"}</small></div>
        {summary.incomplete && <p className="cs-notice">Fonte incompleta ou com pontos que precisam de conferência.</p>}
        {consultationSummaryCategories.map(category => [category, summary.categories[category]] as const).map(([category, items]) => items.length > 0 && <section className="cs-summary-section" key={category}><h3>{titles[category] ?? category}</h3><ul>{items.map((item, index) => <li key={`${category}-${index}`}><span className="cs-assertion">{assertions[item.assertion] ?? "Para conferir"}</span>{editingSummary ? <textarea aria-label={`Corrigir ${titles[category]}, item ${index + 1}`} value={item.text} maxLength={2000} onChange={event => setCorrected(previous => { if (!previous) return previous; const next = structuredClone(previous); next.categories[category as ConsultationSummaryCategory][index].text = event.target.value; return next; })} /> : <p>{item.text}</p>}{editingSummary && <div className="cs-edit-item"><label>Seção<select aria-label={`Seção do item ${index + 1} em ${titles[category]}`} value={category} onChange={event => setCorrected(previous => { if (!previous) return previous; const next = structuredClone(previous); const [moved] = next.categories[category as ConsultationSummaryCategory].splice(index, 1); next.categories[event.target.value as ConsultationSummaryCategory].push(moved); return next; })}>{Object.entries(titles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><button type="button" className="secondary" onClick={() => setCorrected(previous => { if (!previous) return previous; const next = structuredClone(previous); next.categories[category as ConsultationSummaryCategory].splice(index, 1); return next; })}>Remover item do resumo</button></div>}<details className="cs-evidence"><summary><FileText size={14} aria-hidden="true" />Conferir na conversa<ChevronDown size={14} aria-hidden="true" /></summary>{item.evidence.map((evidence, evidenceIndex) => { const source = view?.capture.segments.find(segment => segment.id === evidence.sourceId); return <blockquote key={evidenceIndex}><cite>{source ? `${clock(source.startSeconds)}–${clock(source.endSeconds)}` : evidence.sourceId}</cite><p>{evidence.quote}</p></blockquote>; })}</details></li>)}</ul></section>)}
        {summary.limitations.length > 0 && <details className="cs-options"><summary>Limitações e informações para conferir</summary><ul>{summary.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details>}
        <div className="cs-review"><h3>Revisão do médico</h3><label htmlFor={`cs-review-${appointmentId}`}>Nota de revisão</label><textarea id={`cs-review-${appointmentId}`} value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={2000} placeholder="Registre conferência, correções ou o motivo de não utilizar." /><div className="cs-call-actions"><button type="button" disabled={busy || !reviewNote.trim()} onClick={() => void review("accepted")}><Check size={17} aria-hidden="true" />{editingSummary ? "Salvar correções e revisão" : "Confirmar revisão"}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setCorrected(structuredClone(view!.summary.draft!.summary)); setEditingSummary(value => !value); }}>{editingSummary ? "Cancelar edição" : "Corrigir resumo"}</button><button type="button" className="secondary" disabled={busy || !reviewNote.trim()} onClick={() => void review("rejected")}>Não utilizar</button></div>{view?.summary.review && <p className="cs-review-receipt">Última revisão: {view.summary.review.note}</p>}</div>
      </div>}
      {view && view.capture.segments.length > 0 && <details className="cs-original"><summary>Detalhes da consulta · texto original ({view.capture.segments.length} trechos)</summary><div>{view.capture.segments.map(segment => <p key={segment.id}><time>{clock(segment.startSeconds)}</time><span>{segment.text}</span></p>)}</div></details>}
    </>}
    {notice && <p className="cs-notice" role="status">{notice}</p>}{error && <p className="cs-error" role="alert">{error}</p>}
    {!loading && <button type="button" className="secondary quiet" disabled={busy || active || unsavedCount > 0} onClick={() => { setError(""); void read().catch(cause => setError(cause.message)); }}>Atualizar estado da consulta</button>}
  </section>;
}
