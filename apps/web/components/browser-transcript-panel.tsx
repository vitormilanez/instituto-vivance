"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FileText, Mic, Square } from "lucide-react";
import { BrowserRecognitionCapture, browserAudio, supportsTabAudio, type CapturedSegment, type CaptureMode, type CaptureState, type RecognitionFactory } from "@/modules/teleconsultations/browser-recognition";
import type { BrowserTranscript, BrowserTranscriptSave } from "@/modules/browser-transcripts/types";

const subscribe = () => () => {};
function supportSnapshot() {
  const browser = window as Window & { SpeechRecognition?: RecognitionFactory; webkitSpeechRecognition?: RecognitionFactory };
  const available = !!(browser.SpeechRecognition ?? browser.webkitSpeechRecognition) && window.isSecureContext;
  return 4 | (available ? 1 : 0) | (available && supportsTabAudio(navigator.userAgent) && !!navigator.mediaDevices?.getDisplayMedia ? 2 : 0);
}

export function BrowserTranscriptPanel(props: { tenantId: string; appointmentId: string; readOnly?: boolean }) {
  return <TranscriptPanel key={`${props.tenantId}:${props.appointmentId}`} {...props} />;
}

function TranscriptPanel({ tenantId, appointmentId, readOnly = false }: { tenantId: string; appointmentId: string; readOnly?: boolean }) {
  const base = `/api/v1/clinics/${tenantId}/browser-transcripts/appointments/${appointmentId}`;
  const controller = useRef<BrowserRecognitionCapture | null>(null);
  const draft = useRef({ id: "", startedAt: "", endedAt: "", segments: [] as CapturedSegment[] });
  const pendingSave = useRef<BrowserTranscriptSave | null>(null);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const supportCode = useSyncExternalStore(subscribe, supportSnapshot, () => 0);
  const support = { available: !!(supportCode & 1), tab: !!(supportCode & 2), checked: !!(supportCode & 4) };
  const [draftLocked, setDraftLocked] = useState(false);
  const [mode, setMode] = useState<CaptureMode>("microphone");
  const [state, setState] = useState<CaptureState>("idle");
  const [segments, setSegments] = useState<CapturedSegment[]>([]);
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [permissionNote, setPermissionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState<BrowserTranscript[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const active = state === "starting" || state === "listening" || state === "stopping";

  useEffect(() => {
    const abort = new AbortController();
    fetch(base, { cache: "no-store", signal: abort.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar textos salvos."); return data; }).then(data => { setImports(data.imports); setLoaded(true); }).catch(e => { if (!abort.signal.aborted) { setError(e instanceof Error ? e.message : "Não foi possível consultar textos salvos."); setLoaded(true); } });
    return () => { abort.abort(); controller.current?.destroy(); controller.current = null; };
  }, [base]);

  useEffect(() => {
    if (!active && (!segments.length || saved)) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protectDraft = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href], [data-transcript-toggle]") : null;
      if (target instanceof HTMLAnchorElement && (target.target === "_blank" || target.hasAttribute("download"))) return;
      if (target && !window.confirm("Há uma captura ou texto não salvo nesta consulta. Sair interrompe a captura e descarta o rascunho. Deseja sair?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", prevent);
    document.addEventListener("click", protectDraft, true);
    return () => { window.removeEventListener("beforeunload", prevent); document.removeEventListener("click", protectDraft, true); };
  }, [active, segments.length, saved]);

  function start() {
    if (active || busy || saved || saveAttempted || !allowed || permissionNote.trim().length < 5) return;
    const browser = window as Window & { SpeechRecognition?: RecognitionFactory; webkitSpeechRecognition?: RecognitionFactory };
    const factory = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!factory) return;
    if (!draft.current.id) draft.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), endedAt: "", segments: [] };
    setDraftLocked(true);
    if (Date.now() - Date.parse(draft.current.startedAt) >= 4 * 60 * 60 * 1000) { setNotice("Limite de duração alcançado. Salve este texto antes de iniciar outro."); return; }
    controller.current?.destroy();
    controller.current = new BrowserRecognitionCapture(factory, browserAudio, {
      state: value => { setState(value); if (value === "paused") draft.current.endedAt = new Date(Math.min(Date.now(), Date.parse(draft.current.startedAt) + 4 * 60 * 60 * 1000)).toISOString(); },
      notice: setNotice, interim: setInterim,
      segment: value => {
        if (Date.parse(value.capturedAt) > Date.parse(draft.current.startedAt) + 4 * 60 * 60 * 1000) return;
        const count = draft.current.segments.reduce((sum, item) => sum + Array.from(item.text).length, 0) + draft.current.segments.length + Array.from(value.text).length;
        if (draft.current.segments.length >= 1000 || count > 100000) { controller.current?.stop(); setNotice("Limite de texto alcançado. Confira e salve os trechos captados."); return; }
        draft.current.segments.push(value); setSegments([...draft.current.segments]);
      },
    });
    setError(""); void controller.current.start(mode, Date.parse(draft.current.startedAt) + 4 * 60 * 60 * 1000 - 5000);
  }

  async function post(path: string, body: object) {
    if (busy || active) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar. Seu texto continua nesta tela.");
      setImports(data.imports);
      if (path === base) { setSaved(true); setNotice("Texto original salvo na consulta. Agora registre sua revisão."); }
      else setNotice("Revisão salva. Nenhum texto foi publicado ao paciente.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }

  function saveOriginal() {
    if (!pendingSave.current) {
      pendingSave.current = { idempotencyKey: draft.current.id, source: "browser_speech_recognition", captureMode: mode, startedAt: draft.current.startedAt, endedAt: draft.current.endedAt, patientPermissionConfirmed: true, permissionNote, segments: [...draft.current.segments] };
      setSaveAttempted(true);
    }
    void post(base, pendingSave.current);
  }

  function discard() { controller.current?.destroy(); controller.current = null; draft.current = { id: "", startedAt: "", endedAt: "", segments: [] }; pendingSave.current = null; setSaveAttempted(false); setSegments([]); setInterim(""); setState("idle"); setDraftLocked(false); setSaved(false); setNotice(""); setAllowed(false); setPermissionNote(""); setConfirmDiscard(false); }

  return <section className="meet-transcripts browser-transcript" aria-label="Transcrição gratuita pelo navegador" aria-busy={busy}>
    <div className="meet-transcript-heading"><Mic size={20} aria-hidden="true" /><h3>{readOnly ? "Texto original de registros anteriores" : "Transcrição gratuita"}</h3>{!readOnly && <span className="meet-review-state">Pelo navegador</span>}</div>
    {!readOnly && <><p className="meet-helper">Inicie e pare quando precisar. O navegador pode enviar áudio ao seu fornecedor para reconhecimento; no Chrome, esse processamento é do Google. O Vivance salva apenas o texto quando você solicitar.</p>
    {support.checked && !support.available ? <p className="notice">Este navegador não oferece reconhecimento de fala. Use Chrome/Edge ou Safari compatível, em HTTPS. O registro manual continua disponível.</p> : <>
      <label htmlFor={`capture-source-${appointmentId}`}>Áudio para transcrever</label>
      <select id={`capture-source-${appointmentId}`} value={mode} disabled={active || busy || draftLocked || saved} onChange={e => setMode(e.target.value as CaptureMode)}><option value="microphone">Meu microfone</option>{support.tab && <option value="tab_and_microphone">Aba do Meet + meu microfone</option>}</select>
      <p className="meet-helper">{mode === "microphone" ? "Captura o que chega ao seu microfone. Com fones, a fala do paciente no Meet não será captada. No mobile, esta é a opção disponível." : "Escolha a aba do Meet e marque Compartilhar áudio da aba. As falas são combinadas, sem identificar quem falou. Requer Chrome/Edge 135+ no computador."}</p>
      {!saved && <div className="meet-consent">
        <label className="meet-consent-check"><input type="checkbox" checked={allowed} disabled={active || busy || draftLocked} onChange={e => setAllowed(e.target.checked)} />Confirmo autorização do paciente para reconhecimento de áudio pelo navegador e armazenamento do texto nesta consulta.</label>
        <label htmlFor={`browser-permission-${appointmentId}`}>Como e quando a autorização foi obtida</label><input id={`browser-permission-${appointmentId}`} value={permissionNote} onChange={e => setPermissionNote(e.target.value)} minLength={5} maxLength={500} disabled={active || busy || draftLocked} placeholder="Ex.: autorização verbal no início da consulta" />
      </div>}
      <div className="meet-actions browser-capture-actions">
        {active ? <button type="button" className="secondary" disabled={state === "stopping"} onClick={() => controller.current?.stop()}><Square size={16} aria-hidden="true" />{state === "stopping" ? "Parando…" : "Parar captura"}</button> : !saved && <button type="button" disabled={!support.available || !allowed || permissionNote.trim().length < 5 || busy || saveAttempted} onClick={start}><Mic size={16} aria-hidden="true" />{segments.length ? "Retomar captura" : "Iniciar transcrição"}</button>}
        <span role="status" className="browser-capture-status">{state === "listening" ? "Captando áudio agora" : state === "starting" ? "Aguardando permissão e início" : state === "stopping" ? "Finalizando trechos" : "Captura parada"}</span>
        {!active && draftLocked && !segments.length && <button type="button" className="secondary" disabled={busy} onClick={discard}>Cancelar preparo</button>}
      </div>
    </>}</>}
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="feedback" role="alert">{error}</p>}
    {(segments.length > 0 || interim) && !saved && <div className="browser-transcript-draft">
      <h4>Texto captado · ainda não salvo</h4><div className="meet-transcript-text" tabIndex={0} role="region" aria-label="Trechos captados">{segments.map((segment, index) => <p key={index}><span>{new Date(segment.capturedAt).toLocaleTimeString("pt-BR")}</span>{segment.text}</p>)}{interim && <p className="meet-helper">{interim} <span>· trecho provisório</span></p>}</div>
      <p className="meet-helper">Pode conter falhas e trechos ausentes. Salve o original e registre ressalvas na revisão; nada preenche o prontuário automaticamente.</p>
      {saveAttempted && <p className="meet-helper">Texto congelado para confirmar o salvamento. Se a resposta falhou, tente salvar novamente; a repetição não cria outro registro.</p>}
      <div className="meet-actions"><button type="button" disabled={active || busy || !segments.length} onClick={saveOriginal}><FileText size={16} aria-hidden="true" />{busy ? "Salvando…" : saveAttempted ? "Confirmar salvamento novamente" : "Salvar texto na consulta"}</button><button type="button" className="secondary" disabled={active || busy || saveAttempted} onClick={() => setConfirmDiscard(true)}>Descartar rascunho</button></div>
    </div>}
    {saved && <button type="button" className="secondary" disabled={busy} onClick={discard}>Iniciar outro texto</button>}
    {confirmDiscard && <div className="meet-inline-confirm"><p>Descartar remove somente o rascunho não salvo desta tela.</p><div className="meet-actions"><button type="button" onClick={discard}>Confirmar descarte</button><button type="button" className="secondary" onClick={() => setConfirmDiscard(false)}>Manter texto</button></div></div>}
    {!loaded && <p role="status">Consultando textos salvos…</p>}
    {loaded && readOnly && !imports.length && !error && <p>Nenhum texto anterior salvo nesta consulta.</p>}
    {imports.map(item => <article key={item.id} className="meet-transcript-document">
      <div className="meet-transcript-document-heading"><h4>Texto do navegador · {new Date(item.importedAt).toLocaleDateString("pt-BR")}</h4><span className="meet-review-state">{item.review?.decision === "reviewed" ? "Conferido pelo médico" : item.review?.decision === "rejected" ? "Não utilizar" : "Aguardando revisão"}</span></div>
      <p className="meet-helper">{item.captureMode === "microphone" ? "Fonte: microfone; a fala remota pode estar ausente." : "Fonte: áudio combinado da aba e microfone; falantes não identificados."}</p>
      <details><summary>Ler texto original · {item.segments.length} {item.segments.length === 1 ? "trecho" : "trechos"}</summary><div className="meet-transcript-text" tabIndex={0} role="region" aria-label="Original salvo"><p>{item.originalText}</p></div></details>
      {item.review ? <p className="meet-helper">{item.review.note}</p> : !readOnly && <div className="meet-transcript-review"><label htmlFor={`browser-review-${item.id}`}>Nota da revisão</label><textarea id={`browser-review-${item.id}`} maxLength={2000} value={notes[item.id] ?? ""} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} disabled={busy || active} placeholder="Registre conferência, erros e trechos ausentes." /><div className="meet-actions"><button type="button" disabled={busy || active || !notes[item.id]?.trim()} onClick={() => void post(`${base}/${item.id}/review`, { decision: "reviewed", note: notes[item.id] })}>Marcar como conferido</button><button type="button" className="secondary" disabled={busy || active || !notes[item.id]?.trim()} onClick={() => void post(`${base}/${item.id}/review`, { decision: "rejected", note: notes[item.id] })}>Não utilizar</button></div></div>}
    </article>)}
  </section>;
}
