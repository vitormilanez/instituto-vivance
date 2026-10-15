"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/app/consultation-session.css";
type Consent = { version: string; text: string; decision: "pending" | "granted" | "refused" | "withdrawn"; decidedAt?: string | null };

export function ConsultationConsent({ tenantId, appointmentId, endpoint, demo = false }: { tenantId: string; appointmentId: string; endpoint?: string; demo?: boolean }) {
  const base = endpoint ?? `/api/v1/clinics/${tenantId}/consultation-workflow/appointments/${appointmentId}`;
  const [consent, setConsent] = useState<Consent | null>(null);
  const [choice, setChoice] = useState<"granted" | "refused" | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const pendingDecision = useRef<{ id: string; decision: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(base, { signal: controller.signal, cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Não foi possível abrir esta autorização."); setConsent(data.consent); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [base]);
  async function decide(decision: "granted" | "refused" | "withdrawn") {
    if (!consent || busy) return;
    setBusy(true); setError("");
    try {
      if (pendingDecision.current?.decision !== decision) pendingDecision.current = { id: crypto.randomUUID(), decision };
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "consent_decide", payload: { decisionId: pendingDecision.current.id, consentVersion: consent.version, decision } }), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível registrar sua escolha.");
      setConsent(data.consent); setWithdrawConfirm(false);
      pendingDecision.current = null;
      setNotice(decision === "granted" ? "Sua autorização foi registrada para esta consulta." : "Sua escolha foi registrada. A consulta continua disponível normalmente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  return <section className="consultation-consent" aria-busy={busy}><h1>Sua escolha para esta consulta</h1>{demo && <p className="notice">Prévia do paciente · dados fictícios · autorização restrita à simulação local.</p>}
    <p>O Vivance pode organizar um resumo da conversa para ajudar seu médico a revisar o que foi discutido.</p>
    {consent && <p>{consent.text}</p>}
    {!consent && !error && <p role="status">Consultando sua escolha…</p>}
    {consent && <><p><strong>{consent.decision === "granted" ? "Assistência autorizada" : consent.decision === "refused" ? "Você escolheu seguir sem assistência" : consent.decision === "withdrawn" ? "Autorização retirada" : "Você ainda não fez sua escolha"}</strong></p>
      {consent.decision !== "granted" ? <form onSubmit={event => { event.preventDefault(); if (choice) void decide(choice); }}><fieldset disabled={busy}><legend>Como você prefere seguir?</legend><label><input type="radio" name="consultation-consent" checked={choice === "granted"} onChange={() => setChoice("granted")} />Autorizo o reconhecimento da conversa, armazenamento do texto e geração de resumo por IA para revisão do médico nesta consulta.</label><label><input type="radio" name="consultation-consent" checked={choice === "refused"} onChange={() => setChoice("refused")} />Prefiro realizar a consulta sem essa assistência.</label></fieldset><button disabled={busy || !choice}>{busy ? "Salvando…" : "Confirmar minha escolha"}</button></form> : <div className="cs-consent-actions">{withdrawConfirm ? <><p>Retirar a autorização para novas capturas e resumos nesta consulta?</p><button disabled={busy} onClick={() => void decide("withdrawn")}>Confirmar retirada</button><button className="secondary" disabled={busy} onClick={() => setWithdrawConfirm(false)}>Manter autorização</button></> : <button className="secondary" disabled={busy} onClick={() => setWithdrawConfirm(true)}>Retirar autorização</button>}</div>}
      <p><small>Versão apresentada: {consent.version}</small></p></>}
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="feedback" role="alert">{error}</p>}
    <p><Link href={demo ? "/refinamentos-preview?tela=teleconsulta-integrada" : `/clinicas/${tenantId}/meu-cuidado/consultas`}>{demo ? "Voltar à simulação médica" : "Voltar às minhas consultas"}</Link></p>
  </section>;
}
