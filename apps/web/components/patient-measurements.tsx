"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function PatientMeasurements({ tenant, today }: { tenant: string; today: string }) {
  const router = useRouter();
  const requestId = useRef(crypto.randomUUID());
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const numberOrNull = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value ? Number(value) : null;
    };
    try {
      const response = await fetch(`/api/v1/clinics/${tenant}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          weight_kg: numberOrNull("weight_kg"),
          height_cm: numberOrNull("height_cm"),
          waist_cm: numberOrNull("waist_cm"),
          measured_on: form.get("measured_on"),
          client_request_id: requestId.current,
          confirmed: form.get("confirmed") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível registrar as medidas.");
      formElement.reset();
      const measuredOn = formElement.elements.namedItem("measured_on");
      if (measuredOn instanceof HTMLInputElement) measuredOn.value = today;
      requestId.current = crypto.randomUUID();
      setSuccess("Medidas registradas. O histórico foi atualizado para a equipe.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Atualize a página antes de enviar novamente para conferir o registro.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <section id="atualizar-medidas" className="panel patient-measurements" aria-labelledby="patient-measurements-title">
      <div className="section-heading"><div><h2 id="patient-measurements-title">Atualizar medidas</h2><p>Registre uma ou mais medidas para a equipe acompanhar seu histórico.</p></div></div>
      <form onSubmit={submit}>
        {error && <p id="patient-measurements-error" role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
        <p className="patient-measurements-guidance">Preencha pelo menos uma medida. A data vale para todas as medidas deste envio.</p>
        <div className="patient-measurement-fields">
          <label className="field">Peso (kg) · opcional<input name="weight_kg" type="number" min="0.01" max="500" step="0.01" inputMode="decimal" aria-describedby={error ? "patient-measurements-error" : undefined} disabled={pending} /></label>
          <label className="field">Altura (cm) · opcional<input name="height_cm" type="number" min="0.01" max="300" step="0.1" inputMode="decimal" aria-describedby={error ? "patient-measurements-error" : undefined} disabled={pending} /></label>
          <label className="field">Circunferência abdominal (cm) · opcional<input name="waist_cm" type="number" min="0.01" max="400" step="0.1" inputMode="decimal" aria-describedby={error ? "patient-measurements-error" : undefined} disabled={pending} /></label>
          <label className="field">Data da medição<input name="measured_on" type="date" max={today} defaultValue={today} required aria-describedby={error ? "patient-measurements-error" : undefined} disabled={pending} /></label>
        </div>
        <label className="publication-confirm"><input name="confirmed" type="checkbox" required disabled={pending} />Confirmo que estas medidas foram informadas por mim.</label>
        <button disabled={pending}>{pending ? "Registrando…" : "Registrar medidas"}</button>
      </form>
      <p className="module-footnote">As medidas ficam registradas com a data informada e não alteram orientações ou plano de cuidado automaticamente.</p>
    </section>
  );
}
