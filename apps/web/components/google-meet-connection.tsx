"use client";

import { useEffect, useState } from "react";
import { Check, Link2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";

export type MeetConnectionState = {
  configured: boolean;
  available: boolean;
  connected: boolean;
  accountEmail?: string | null;
  reason?: string | null;
};

export function GoogleMeetConnection({ tenantId, onChange }: {
  tenantId: string;
  onChange?: (status: MeetConnectionState) => void;
}) {
  const [status, setStatus] = useState<MeetConnectionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const base = `/api/v1/clinics/${tenantId}/google-meet`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}/status`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Não foi possível verificar sua conexão Google.");
        return response.json() as Promise<MeetConnectionState>;
      })
      .then(value => { setStatus(value); onChange?.(value); })
      .catch(() => { if (!controller.signal.aborted) setError("Não foi possível verificar a conexão. Recarregue esta página."); });
    return () => controller.abort();
  }, [base, onChange]);

  async function changeConnection(action: "connect" | "disconnect") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${base}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar sua conexão.");
      if (action === "connect") {
        const destination = new URL(result.authorizationUrl);
        if (destination.origin !== "https://accounts.google.com") throw new Error("Endereço de autorização inválido.");
        window.location.assign(destination.href);
      } else {
        const next = { configured: true, available: true, connected: false };
        setStatus(next); onChange?.(next); setConfirmDisconnect(false);
        setNotice(result.googleRevocationConfirmed === false ? "Conexão desativada no Vivance. O Google não confirmou a revogação; remova também o acesso nas configurações de segurança da sua conta Google." : "Conta desconectada. Os registros já importados foram preservados.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar sua conexão."); }
    finally { setBusy(false); }
  }

  return <section className="meet-connection" aria-labelledby="meet-connection-title" aria-busy={busy}>
    <div className="meet-connection-intro">
      <span className="meet-connection-icon" aria-hidden="true">{status?.connected ? <Check size={20} /> : <Link2 size={20} />}</span>
      <div>
        <h2 id="meet-connection-title">{status?.connected ? "Google conectado" : "Sua conta Google Meet"}</h2>
        <p>{status?.connected ? status.accountEmail ?? "Conexão individual do médico" : "Integração preparada para salas vinculadas à sua conta."}</p>
      </div>
    </div>
    <div className="meet-connection-action">
      {!status && !error ? <span role="status">Verificando conexão…</span> : status?.connected ?
        <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmDisconnect(true)}><Unplug size={16} aria-hidden="true" />Desconectar</button> :
        <button type="button" disabled={busy || !status?.configured || !status?.available} onClick={() => void changeConnection("connect")}><Link2 size={17} aria-hidden="true" />{busy ? "Conectando…" : "Conectar Google"}</button>}
    </div>
    {status && (!status.configured || !status.available) && <p className="meet-connection-note" role="status">Integração aguardando configuração técnica. Você pode continuar usando uma sala criada no Meet.</p>}
    <p className="meet-connection-note"><ShieldCheck size={16} aria-hidden="true" />Transcrição nativa do Meet desativada. A opção gratuita pelo navegador está disponível na consulta, com início manual.</p>
    {confirmDisconnect && <div className="meet-inline-confirm">
      <p>Desconectar interrompe novas importações. Os registros já importados continuam sujeitos às regras de acesso e retenção do Vivance.</p>
      <div className="meet-actions"><button type="button" disabled={busy} onClick={() => void changeConnection("disconnect")}>Confirmar desconexão</button><button type="button" className="secondary" disabled={busy} onClick={() => setConfirmDisconnect(false)}>Manter conexão</button></div>
    </div>}
    {error && <p role="alert" className="feedback"><RefreshCw size={16} aria-hidden="true" />{error}</p>}
    {notice && <p role="status" className="meet-connection-note">{notice}</p>}
  </section>;
}
