"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export type LastWeight = { value: number; reportedOn: string } | null;

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function dayMonth(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

// Registrar o peso é a tarefa do dia a dia: um campo, um botão. Altura,
// cintura e outra data ficam a um toque, sem pesar a primeira vista. Quem
// envia é a própria pessoa logada; a autoria vem da sessão, não de uma caixa
// de confirmação.
export function PatientMeasurements({
  tenant,
  today,
  last = null,
}: {
  tenant: string;
  today: string;
  last?: LastWeight;
}) {
  const router = useRouter();
  const requestId = useRef(crypto.randomUUID());
  const busy = useRef(false);
  const weightInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Quem chega pelo atalho "Peso e medidas" já encontra o campo pronto.
  useEffect(() => {
    if (window.location.hash === "#atualizar-medidas")
      weightInput.current?.focus({ preventScroll: true });
  }, []);

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
      const value = String(form.get(name) ?? "").trim().replace(",", ".");
      return value ? Number(value) : null;
    };
    const weight = numberOrNull("weight_kg");
    const height = numberOrNull("height_cm");
    const waist = numberOrNull("waist_cm");
    if (weight === null && height === null && waist === null) {
      setError("Informe o peso ou outra medida.");
      busy.current = false;
      setPending(false);
      weightInput.current?.focus();
      return;
    }
    try {
      const response = await fetch(`/api/v1/clinics/${tenant}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          weight_kg: weight,
          height_cm: height,
          waist_cm: waist,
          measured_on: form.get("measured_on") || today,
          client_request_id: requestId.current,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível registrar agora.");
      formElement.reset();
      const measuredOn = formElement.elements.namedItem("measured_on");
      if (measuredOn instanceof HTMLInputElement) measuredOn.value = today;
      requestId.current = crypto.randomUUID();
      setSuccess(
        weight !== null && height === null && waist === null
          ? `✓ Peso registrado: ${decimal.format(weight)} kg. Sua equipe já vê no histórico.`
          : "✓ Medidas registradas. Sua equipe já vê no histórico.",
      );
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Atualize a página antes de enviar de novo, para conferir se já foi registrado.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const describedBy = error ? "patient-measurements-error" : undefined;

  return (
    <section id="atualizar-medidas" className="panel patient-measurements" aria-labelledby="patient-measurements-title">
      <div className="section-heading">
        <div>
          <h2 id="patient-measurements-title">Registrar peso</h2>
          <p>
            {last
              ? `Último registro: ${decimal.format(last.value)} kg em ${dayMonth(last.reportedOn)}.`
              : "Anote o peso de hoje. Leva poucos segundos."}
          </p>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        {error && <p id="patient-measurements-error" role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
        <div className="weight-entry">
          <label className="field weight-field">
            Peso de hoje
            <span className="weight-input">
              <input
                ref={weightInput}
                name="weight_kg"
                type="number"
                min="0.01"
                max="500"
                step="0.1"
                inputMode="decimal"
                autoComplete="off"
                placeholder={last ? decimal.format(last.value) : "0,0"}
                aria-describedby={describedBy}
                disabled={pending}
              />
              <span aria-hidden="true">kg</span>
            </span>
          </label>
          <button disabled={pending}>{pending ? "Registrando…" : "Registrar"}</button>
        </div>
        <details className="more-measurements">
          <summary>Outras medidas ou outra data</summary>
          <div className="patient-measurement-fields">
            <label className="field">Altura (cm)<input name="height_cm" type="number" min="0.01" max="300" step="0.1" inputMode="decimal" aria-describedby={describedBy} disabled={pending} /></label>
            <label className="field">Circunferência abdominal (cm)<input name="waist_cm" type="number" min="0.01" max="400" step="0.1" inputMode="decimal" aria-describedby={describedBy} disabled={pending} /></label>
            <label className="field">Data da medição<input name="measured_on" type="date" max={today} defaultValue={today} aria-describedby={describedBy} disabled={pending} /></label>
          </div>
        </details>
      </form>
      <p className="module-footnote">O registro fica no seu histórico com a data informada e não muda seu plano de cuidado automaticamente.</p>
    </section>
  );
}
