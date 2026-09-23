"use client";

import { useRef, useState } from "react";
import {
  careRequestActionLabel,
  careRequestPendingLabel,
  type CareRequestKind,
} from "@/modules/workspace/patient-context-cards";

// Pedir é uma mutação com efeito auditável e mensagem para o paciente, então o
// desenho é conservador de propósito: um clique envia a frase do tipo, o
// bilhete fica atrás de "Adicionar uma mensagem", e a chave idempotente nasce
// com o componente e sobrevive a uma falha de rede — tentar de novo confirma a
// MESMA solicitação em vez de criar outra. Incerteza nunca vira "Solicitado".
export function CareRequestAction({
  tenantId,
  patientId,
  kind,
  requestedAt,
}: {
  tenantId: string;
  patientId: string;
  kind: CareRequestKind;
  requestedAt: string | null;
}) {
  const [pendingSince, setPendingSince] = useState(requestedAt);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const requestKey = useRef<string | null>(null);
  if (requestKey.current === null) requestKey.current = crypto.randomUUID();

  async function ask(replace: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/patients/${patientId}/care-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            kind,
            note,
            request_key: requestKey.current,
            replace_pending: replace,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setUncertain(false);
        setError(body.error ?? "Não foi possível registrar a solicitação.");
        return;
      }
      setPendingSince(new Date().toISOString());
      setUncertain(false);
      setNote("");
      setNoteOpen(false);
    } catch {
      // Sem resposta não se sabe se gravou. A mesma chave decide isso.
      setUncertain(true);
    } finally {
      setBusy(false);
    }
  }

  if (pendingSince)
    return (
      <div className="context-request">
        <p className="context-request-state">
          {careRequestPendingLabel(pendingSince)}
        </p>
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={() => void ask(true)}
        >
          {busy ? "Reenviando…" : "Reenviar solicitação"}
        </button>
        {error ? (
          <p className="feedback" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );

  return (
    <div className="context-request">
      {noteOpen ? (
        <label className="field">
          Mensagem para o paciente (opcional)
          <input
            type="text"
            maxLength={500}
            value={note}
            disabled={busy}
            placeholder="Ex.: traga os exames do último mês."
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      ) : (
        <button
          className="context-request-note"
          type="button"
          disabled={busy}
          onClick={() => setNoteOpen(true)}
        >
          Adicionar uma mensagem
        </button>
      )}
      <button
        className="secondary"
        type="button"
        disabled={busy}
        onClick={() => void ask(false)}
      >
        {busy ? "Solicitando…" : careRequestActionLabel(kind)}
      </button>
      {uncertain ? (
        <p className="feedback" role="alert">
          A conexão caiu antes da confirmação. Tentar de novo confirma a mesma
          solicitação — ela não será duplicada.
        </p>
      ) : null}
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
