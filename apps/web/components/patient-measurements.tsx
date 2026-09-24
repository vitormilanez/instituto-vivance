"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./patient/icons";
import { sendOrQueue } from "./patient/outbox";
import { heightInCentimeters } from "@/modules/measurements/height";

export type LastWeight = { value: number; reportedOn: string } | null;

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function dayMonth(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function parse(value: string) {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : Number.NaN;
}

// Registrar peso: um campo grande, − e + de 0,1 kg e um botão. Cintura,
// altura e outra data ficam a um toque. Quem envia é a própria pessoa logada;
// a autoria vem da sessão, não de uma caixa de confirmação.
export function PatientMeasurements({
  tenant,
  today,
  base,
  last = null,
}: {
  tenant: string;
  today: string;
  base: string;
  last?: LastWeight;
}) {
  const router = useRouter();
  const requestId = useRef(crypto.randomUUID());
  const busy = useRef(false);
  const weightInput = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState(last ? decimal.format(last.value) : "");
  const [height, setHeight] = useState("");
  const [waist, setWaist] = useState("");
  const [measuredOn, setMeasuredOn] = useState(today);
  const [pending, setPending] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    weightInput.current?.focus({ preventScroll: true });
    weightInput.current?.select();
  }, []);

  const heightValue = parse(height);
  const heightNote = heightInCentimeters(heightValue);

  function step(delta: number) {
    const current = parse(weight);
    const base = current && Number.isFinite(current) ? current : last?.value ?? 0;
    const next = Math.max(0, Math.round((base + delta) * 10) / 10);
    setWeight(decimal.format(next));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const weightKg = parse(weight);
    const waistCm = parse(waist);
    const heightCm = heightNote.value;
    if (weightKg === null && waistCm === null && heightCm === null) {
      setError("Informe o peso ou outra medida.");
      weightInput.current?.focus();
      return;
    }
    if (heightCm !== null && Number.isNaN(heightCm)) {
      setError(heightNote.note ?? "Confira a altura.");
      return;
    }
    if ([weightKg, waistCm, heightCm].some((value) => value !== null && !(value > 0))) {
      setError("Confira os números: use só algarismos e vírgula, como 76,4.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const sent = await sendOrQueue(
        `/api/v1/clinics/${tenant}/measurements`,
        {
          weight_kg: weightKg,
          height_cm: heightCm,
          waist_cm: waistCm,
          measured_on: measuredOn || today,
          client_request_id: requestId.current,
        },
        weightKg !== null && waistCm === null && heightCm === null ? "Peso" : "Medidas",
      );
      if (sent.queued) {
        requestId.current = crypto.randomUUID();
        setQueued(true);
        busy.current = false;
        setPending(false);
        return;
      }
      const data = await sent.response.json();
      if (!sent.response.ok) throw new Error(data.error ?? "Não foi possível registrar agora.");
      requestId.current = crypto.randomUUID();
      router.push(`${base}/hoje?enviado=${weightKg !== null && waistCm === null && heightCm === null ? "peso" : "medidas"}`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Confira em Evolução se já foi registrado antes de enviar de novo.",
      );
      busy.current = false;
      setPending(false);
    }
  }

  if (queued)
    return (
      <div className="pv-stack pv-done" role="status">
        <span className="pv-done-icon" aria-hidden="true"><Icon name="wifiOff" size={32} /></span>
        <h2 className="pv-big">Salvo no seu celular</h2>
        <p className="pv-lead">Sem internet agora. Enviamos sozinhos assim que a conexão voltar — não precisa fazer nada.</p>
        <p className="pv-sent-when"><Icon name="wifiOff" size={16} /> Aguardando conexão</p>
        <Link className="pv-button" href={`${base}/hoje`}>Voltar para o início<Icon name="arrow" /></Link>
      </div>
    );

  return (
    <form className="pv-stack" onSubmit={submit} noValidate aria-labelledby="pv-weight-title">
      <div className="pv-stack pv-tight">
        <h2 id="pv-weight-title" className="pv-big">Quanto você está pesando hoje?</h2>
        <p className="pv-lead">
          {last
            ? `Último registro: ${decimal.format(last.value)} kg em ${dayMonth(last.reportedOn)}.`
            : "Seu primeiro registro. Leva poucos segundos."}
        </p>
      </div>
      {error && <p className="pv-form-error" role="alert" id="pv-weight-error">{error}</p>}
      <div className="pv-weight">
        <button type="button" className="pv-step" onClick={() => step(-0.1)} aria-label="Diminuir 0,1 kg" disabled={pending}>−</button>
        <label className="pv-weight-input">
          <span className="pv-visually-hidden">Peso em quilos</span>
          <input
            ref={weightInput}
            name="weight_kg"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,0"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            aria-describedby={error ? "pv-weight-error" : undefined}
            disabled={pending}
          />
          <span aria-hidden="true">kg</span>
        </label>
        <button type="button" className="pv-step" onClick={() => step(0.1)} aria-label="Aumentar 0,1 kg" disabled={pending}>+</button>
      </div>
      <p className="pv-muted pv-center">
        {measuredOn === today ? "Hoje, agora" : `Medido em ${dayMonth(measuredOn)}`}
      </p>
      <details className="pv-more">
        <summary>Cintura, altura ou outra data</summary>
        <div className="pv-more-body">
          <label className="pv-field">
            Cintura (cm) · na altura do umbigo
            <input inputMode="decimal" value={waist} onChange={(event) => setWaist(event.target.value)} disabled={pending} />
          </label>
          <label className="pv-field">
            Altura (cm)
            <input inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} disabled={pending} aria-describedby="pv-height-note" />
            {heightNote.note && <small id="pv-height-note" className="pv-hint-warn">{heightNote.note}</small>}
          </label>
          <label className="pv-field">
            Data da medição
            <input type="date" max={today} value={measuredOn} onChange={(event) => setMeasuredOn(event.target.value)} disabled={pending} />
          </label>
        </div>
      </details>
      <button className="pv-button is-center" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
      <p className="pv-muted">
        Fica no seu histórico com a data informada e não muda seu plano de cuidado automaticamente.
      </p>
    </form>
  );
}

