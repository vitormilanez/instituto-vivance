"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PatientGoalsInitializer({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function initialize() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/intake`, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "Não foi possível começar suas metas.");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível começar agora. Confira a internet e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="patient-intake-actions">
      <button type="button" disabled={pending} onClick={() => void initialize()}>
        {pending ? "Preparando…" : "Começar minhas metas"}
      </button>
      {error ? <p className="feedback" role="alert">{error}</p> : null}
    </div>
  );
}
