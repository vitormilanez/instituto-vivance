"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { noCareLinkAction } from "@/modules/workspace/home-day";

// Aceitar o vínculo é um ato consciente do profissional, então a Home não
// aceita num clique: abre a mesma confirmação explícita das outras telas e usa
// o mesmo endpoint da Equipe de cuidado. Não abre atendimento — aceitar às 9h
// uma consulta das 15h não pode marcar a consulta como iniciada.
export function CareLinkAccept({
  tenantId,
  relationshipId,
  version,
  patientName,
}: {
  tenantId: string;
  relationshipId: string;
  version: number;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checkbox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) checkbox.current?.focus();
  }, [open]);

  async function confirm() {
    if (busy || !accepted) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/team/relationships/${relationshipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version, action: "accept" }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível aceitar o vínculo.");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível aceitar o vínculo.",
      );
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {noCareLinkAction}
      </button>
    );
  return (
    <div
      className="inline-confirm home-accept"
      role="group"
      aria-label="Aceite do vínculo de cuidado"
    >
      <label className="care-accept">
        <input
          ref={checkbox}
          type="checkbox"
          checked={accepted}
          disabled={busy}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        Confirmo que sou responsável pelo cuidado de {patientName}.
      </label>
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          disabled={busy || !accepted}
          onClick={confirm}
        >
          {busy ? "Confirmando…" : "Confirmar aceite"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setAccepted(false);
            setError("");
          }}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
