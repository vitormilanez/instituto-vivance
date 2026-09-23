"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";

// Abre (ou retoma) a pré-consulta obrigatória e leva a pessoa até ela.
export function StartPreparationButton({
  base,
  tenantId,
  label,
}: {
  base: string;
  tenantId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/return-preparations/required`, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id)
        throw new Error(result.error ?? "Não foi possível abrir sua pré-consulta.");
      router.push(`${base}/hoje?preparo=${result.id}#preparo-${result.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Tente de novo em instantes.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="pv-button" onClick={start} disabled={pending}>
        {pending ? "Abrindo…" : label}
        <Icon name="arrow" size={22} />
      </button>
      {error && <p className="pv-form-error" role="alert">{error}</p>}
    </>
  );
}
