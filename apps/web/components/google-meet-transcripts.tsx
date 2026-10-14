"use client";

import { useEffect, useState } from "react";
import { FileText, RefreshCw, ShieldCheck } from "lucide-react";
import type { MeetTranscripts } from "@/modules/google-meet/types";
import type { MeetEntry } from "@/modules/google-meet/types";

function stamp(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Horário não informado";
}

function TranscriptText({ entries }: { entries: MeetEntry[] }) {
  const participants = new Map([...new Set(entries.map(entry => entry.speaker))].map((speaker, index) => [speaker, `Participante ${index + 1}`]));
  return <div className="meet-transcript-text" tabIndex={0} role="region" aria-label="Texto original da transcrição">
    <p className="meet-helper">Os números distinguem as falas; não confirmam a identidade dos participantes.</p>
    {entries.map(entry => <p key={entry.name}><span><strong>{participants.get(entry.speaker)}</strong> · {stamp(entry.startTime)}</span>{entry.text}</p>)}
  </div>;
}

export function GoogleMeetTranscripts({ tenantId, appointmentId }: { tenantId: string; appointmentId: string }) {
  // A reused encounter route must never display the previous patient's text.
  return <MeetTranscriptPanel key={`${tenantId}:${appointmentId}`} tenantId={tenantId} appointmentId={appointmentId} />;
}

function MeetTranscriptPanel({ tenantId, appointmentId }: { tenantId: string; appointmentId: string }) {
  const base = `/api/v1/clinics/${tenantId}/google-meet/appointments/${appointmentId}`;
  const [data, setData] = useState<MeetTranscripts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [permissionNote, setPermissionNote] = useState("");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}/transcripts`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar a transcrição.");
        return result as MeetTranscripts;
      })
      .then(setData)
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Não foi possível consultar a transcrição."); });
    return () => controller.abort();
  }, [base]);

  async function act(path: string, body: object) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${base}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(55000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir. Tente novamente.");
      if (path === "sync") {
        setNotice(result.status === "processing" ? "O Google ainda está preparando o texto. Consulte novamente mais tarde." : result.status === "not_available" ? "Nenhuma transcrição disponível. Ela pode não ter sido iniciada no Meet ou não estar liberada para esta conta." : "Transcrição importada. Confira o texto antes de usá-lo no registro.");
      } else if (path === "consent") setNotice("Autorização registrada. Isso não inicia a transcrição no Google Meet.");
      else setNotice("Revisão registrada. Nenhum texto foi publicado ao paciente.");
      const refreshed = await fetch(`${base}/transcripts`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const value = await refreshed.json();
      if (!refreshed.ok) throw new Error(value.error ?? "A ação foi concluída, mas a tela não pôde ser atualizada. Reabra a transcrição.");
      setData(value);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a ação."); }
    finally { setBusy(false); }
  }

  return <section className="meet-transcripts" aria-label="Transcrição desta consulta" aria-busy={busy}>
    <div className="meet-transcript-heading"><FileText size={20} aria-hidden="true" /><h3>Transcrição do Meet</h3></div>
    <p className="meet-helper">Texto original, sem interpretação clínica. A revisão não publica nem preenche o registro automaticamente.</p>
    {!data && !error && <p role="status">Consultando disponibilidade…</p>}
    {error && <p className="feedback" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {data?.status === "not_bound" && <div className="meet-transcript-empty"><h4>Esta sala não foi vinculada pela integração</h4><p>Links adicionados manualmente continuam funcionando para a chamada, mas não permitem esta importação. Nas próximas consultas, use Criar sala automaticamente.</p></div>}
    {data?.room && data.status !== "not_bound" && <>
      {!data.consent ? <form className="meet-consent" onSubmit={e => { e.preventDefault(); if (confirmed) void act("consent", { patientPermissionConfirmed: true, permissionNote }); }}>
        <h4><ShieldCheck size={18} aria-hidden="true" />Antes de importar</h4>
        <p>Obtenha a autorização específica do paciente para transcrever no Google e importar o texto no Vivance. Se ele não concordar, continue com registro manual e sem captura.</p>
        <label className="meet-consent-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />Confirmo que obtive a autorização do paciente para esta consulta.</label>
        <label htmlFor={`meet-permission-${appointmentId}`}>Como e quando a autorização foi obtida</label>
        <input id={`meet-permission-${appointmentId}`} value={permissionNote} onChange={e => setPermissionNote(e.target.value)} minLength={5} maxLength={500} required placeholder="Ex.: autorização verbal no início da consulta" disabled={busy} />
        <button type="submit" disabled={busy || !confirmed || permissionNote.trim().length < 5}>Registrar autorização</button>
      </form> : <div className="meet-import-controls">
        <p><ShieldCheck size={16} aria-hidden="true" />Autorização registrada pelo médico em {new Date(data.consent.confirmedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
        <button type="button" className="secondary" disabled={busy} onClick={() => void act("sync", {})}><RefreshCw size={16} aria-hidden="true" />{busy ? "Consultando Google…" : "Buscar transcrição no Meet"}</button>
        <p className="meet-helper">No Meet, inicie a transcrição após a autorização. Requer conta compatível; o texto pode levar algum tempo para ficar disponível após a chamada.</p>
      </div>}
      {data.imports.map(item => <article key={item.id} className="meet-transcript-document">
        <div className="meet-transcript-document-heading"><h4>Texto importado em {new Date(item.importedAt).toLocaleDateString("pt-BR")}</h4><span className="meet-review-state">{item.review?.decision === "reviewed" ? "Revisada pelo médico" : item.review?.decision === "rejected" ? "Não utilizar no registro" : "Aguardando revisão"}</span></div>
        <details><summary>Leia a transcrição · {item.entries.length} trechos</summary><TranscriptText entries={item.entries} /></details>
        {item.review ? <p className="meet-helper">{item.review.note || "Revisão registrada sem observação."}</p> : <div className="meet-transcript-review">
          <label htmlFor={`meet-review-${item.id}`}>Nota da revisão</label>
          <textarea id={`meet-review-${item.id}`} value={reviewNote[item.id] ?? ""} onChange={e => setReviewNote({ ...reviewNote, [item.id]: e.target.value })} maxLength={1000} disabled={busy} placeholder="Registre problemas ou ressalvas. O texto original será preservado." />
          <div className="meet-actions"><button type="button" disabled={busy || !reviewNote[item.id]?.trim()} onClick={() => void act(`transcripts/${item.id}/review`, { decision: "reviewed", note: reviewNote[item.id] ?? "" })}>Marcar como revisada</button><button className="secondary" type="button" disabled={busy || !reviewNote[item.id]?.trim()} onClick={() => void act(`transcripts/${item.id}/review`, { decision: "rejected", note: reviewNote[item.id] ?? "" })}>Não utilizar</button></div>
        </div>}
      </article>)}
      {!data.imports.length && data.consent && <p className="meet-empty-copy">Nenhum texto importado ainda. A consulta e o registro manual continuam disponíveis.</p>}
    </>}
  </section>;
}
