"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeleconsultationLink } from "./teleconsultation-link";
import { TeleconsultationSettings } from "./teleconsultation-settings";

type LinkAudit = {
  updated_at: string;
  updated_by: string;
  updated_by_name?: string | null;
};

export function TeleconsultationCallAccess({
  tenantId,
  appointmentId,
  patientName,
  agendaHref,
  appointmentLabel,
  initialUrl,
  initialAudit,
  editable,
  unavailable,
}: {
  tenantId: string;
  appointmentId: string;
  patientName: string;
  agendaHref: string;
  appointmentLabel: string;
  initialUrl: string | null;
  initialAudit: LinkAudit | null;
  editable: boolean;
  unavailable: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [audit, setAudit] = useState(initialAudit);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const editor = audit?.updated_by_name?.trim() || (audit ? `profissional ${audit.updated_by.slice(0, 8)}` : "");

  return <div className="teleconsultation-call-access">
    <p className="teleconsultation-appointment">Este atendimento está ligado ao <Link href={agendaHref}>{appointmentLabel}</Link>.</p>
    {unavailable ? (
      <div className="teleconsultation-no-link" role="status">
        <p>Não foi possível carregar o link deste agendamento.</p>
        <button className="secondary" type="button" onClick={() => router.refresh()}>Tentar novamente</button>
      </div>
    ) : url ? (
      <TeleconsultationLink url={url} patientName={patientName} />
    ) : (
      <p className="teleconsultation-no-link">Este agendamento ainda não tem link do Google Meet.</p>
    )}
    {!unavailable && audit && <p className="teleconsultation-link-audit">
      {url ? "Link" : "Modalidade"} alterado em {new Date(audit.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} por {editor}.
    </p>}
    {!unavailable && editable && <button
      type="button"
      className={url ? "secondary" : undefined}
      aria-expanded={editing}
      aria-controls="teleconsultation-link-editor"
      onClick={() => { setEditing((value) => !value); setNotice(""); }}
    >{editing ? "Fechar configuração" : url ? "Corrigir link" : "Configurar link"}</button>}
    {!unavailable && !url && !editable && <p>Este atendimento já não permite configurar o link.</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {editing && <div id="teleconsultation-link-editor">
      <TeleconsultationSettings
        tenantId={tenantId}
        appointmentId={appointmentId}
        patientName={patientName}
        editable={editable}
        videoOnly
        showClose={false}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setUrl(saved.join_url);
          setAudit(saved);
          setEditing(false);
          setNotice("Link salvo para este agendamento. Seu registro continua aberto aqui.");
          router.refresh();
        }}
      />
    </div>}
  </div>;
}
