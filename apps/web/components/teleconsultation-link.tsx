"use client";

import { useState } from "react";
import { Copy, ExternalLink, MessageCircle, Video } from "lucide-react";
import { whatsappShareUrl } from "@/modules/teleconsultations/share";

/** The external provider owns the call. Opening a link never changes clinical state. */
export function TeleconsultationLink({
  url,
  compact = false,
  patientName,
}: {
  url: string;
  compact?: boolean;
  /** Presente só na visão da equipe: habilita "Enviar pelo WhatsApp". */
  patientName?: string | null;
}) {
  const [notice, setNotice] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copiado.");
    } catch {
      setNotice(
        "Não foi possível copiar. Selecione o link abaixo para copiar manualmente.",
      );
    }
  }
  return (
    <div
      className={
        compact ? "teleconsultation-link compact" : "teleconsultation-link"
      }
    >
      <div className="teleconsultation-link-actions">
        <a
          className="button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-external-call
        >
          <Video size={18} aria-hidden="true" />{" "}
          {compact ? "Entrar na teleconsulta" : "Abrir Google Meet"}
          <ExternalLink size={15} aria-hidden="true" />
        </a>
        {!compact && (
          <button
            type="button"
            className="secondary"
            onClick={() => void copy()}
          >
            <Copy size={16} aria-hidden="true" /> Copiar link
          </button>
        )}
        {!compact && patientName !== undefined && (
          <a
            className="button secondary"
            href={whatsappShareUrl(url, patientName)}
            target="_blank"
            rel="noopener noreferrer"
            data-external-call
          >
            <MessageCircle size={16} aria-hidden="true" /> Enviar pelo WhatsApp
          </a>
        )}
      </div>
      {!compact && <p className="teleconsultation-url">{url}</p>}
      <small>A chamada abre em outra aba ou janela.</small>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
