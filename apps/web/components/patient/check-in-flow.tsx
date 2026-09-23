"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  adherenceLabels,
  checkInSteps,
  checkInSummary,
  effectKeys,
  effectLabels,
  feelingLabels,
  hasStrongEffect,
  intensities,
  intensityLabels,
  reasonLabels,
  sideLabels,
  siteLabels,
  type CheckInAnswers,
  type EffectKey,
  type Intensity,
} from "@/modules/daily-check-ins/model";
import { Icon, type IconName } from "./icons";

const titles: Record<string, [string, string]> = {
  weight: ["Quanto você está pesando hoje?", "Se não se pesou hoje, pode pular."],
  feeling: ["Como você está se sentindo hoje?", "Escolha o que mais combina com o seu dia."],
  effects: ["Sentiu algum desses efeitos?", "Toque em todos que sentiu e diga a intensidade."],
  hunger: ["Como estão a fome e a saciedade?", "De 1 a 5."],
  energy: ["E a energia e o sono?", "De 1 a 5."],
  water: ["Quantos copos de água você bebeu hoje?", "1 copo = 250 ml"],
  adherence: ["Seguiu o tratamento como combinado?", "Sem problema se não deu — é importante saber."],
  application: ["Registre sua aplicação", "Pedido pelo seu médico."],
  note: ["Quer contar mais alguma coisa ao seu médico?", "Opcional."],
};

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const parseWeight = (text: string) => {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() && Number.isFinite(value) && value > 0 ? value : null;
};
const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function Scale({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <fieldset className="pv-fieldset">
      <legend className="pv-scale-label">{label}</legend>
      <div className="pv-scale">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${n} de 5`}
            onClick={() => onChange(value === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="pv-scale-ends" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

// O check-in: uma pergunta por tela, respondida com toques. Texto sempre
// opcional e "Pular" em todas. A conclusão repete exatamente o que foi
// enviado — sem interpretar.
export function CheckInFlow({
  tenantId,
  base,
  today,
  doctorName,
  lastWeight,
  applicationEnabled,
  nextLabel,
}: {
  tenantId: string;
  base: string;
  today: string;
  doctorName: string | null;
  lastWeight: number | null;
  applicationEnabled: boolean;
  nextLabel: string;
}) {
  const steps = checkInSteps(applicationEnabled);
  const requestKey = useRef(crypto.randomUUID());
  const busy = useRef(false);
  const [index, setIndex] = useState(0);
  const [weight, setWeight] = useState(lastWeight ? decimal.format(lastWeight) : "");
  const [answers, setAnswers] = useState<CheckInAnswers>({ water_glasses: 0 });
  const [waterTouched, setWaterTouched] = useState(false);
  const [applicationDay, setApplicationDay] = useState<"today" | "yesterday" | "other">("today");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ at: string; rows: { label: string; value: string }[] } | null>(null);

  const step = steps[index];
  const last = index === steps.length - 1;
  const set = (patch: Partial<CheckInAnswers>) => setAnswers((current) => ({ ...current, ...patch }));
  const doctor = doctorName ?? "seu médico";

  function payload(): CheckInAnswers {
    const result: CheckInAnswers = { ...answers };
    const weightValue = parseWeight(weight);
    if (weightValue) result.weight_kg = weightValue;
    else delete result.weight_kg;
    if (!waterTouched) delete result.water_glasses;
    if (!applicationEnabled) {
      delete result.application_on;
      delete result.application_time;
      delete result.application_site;
      delete result.application_side;
    } else if (result.application_site || result.application_time) {
      result.application_on =
        applicationDay === "today" ? today : applicationDay === "yesterday" ? addDays(today, -1) : result.application_on;
    }
    if (result.adherence === "yes") delete result.adherence_reason;
    if (!result.note?.trim()) delete result.note;
    return result;
  }

  async function send() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const body = payload();
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/daily-check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ request_key: requestKey.current, answers: body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não conseguimos enviar agora.");
      setDone({
        at: new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
        rows: checkInSummary(body),
      });
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? `${reason.message} Suas respostas estão guardadas nesta tela; tente de novo.`
          : "A conexão demorou. Suas respostas estão guardadas nesta tela; tente de novo em instantes.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (done)
    return (
      <div className="pv-stack pv-done">
        <span className="pv-done-icon" aria-hidden="true"><Icon name="check" size={32} /></span>
        <h2 className="pv-big" tabIndex={-1} ref={(node) => node?.focus()}>Pronto, obrigado!</h2>
        <p className="pv-lead">Tudo registrado para {doctor}.</p>
        <p className="pv-sent-when"><Icon name="check" size={16} /> Enviado {done.at.replace(",", ",")}</p>
        {done.rows.length > 0 && (
          <section className="pv-card" aria-labelledby="pv-done-rows">
            <h3 id="pv-done-rows" className="pv-eyebrow">O que você enviou</h3>
            <dl className="pv-summary">
              {done.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <p className="pv-muted">Próximo check-in: {nextLabel === "hoje" ? "amanhã" : nextLabel}. A gente lembra você.</p>
        <Link className="pv-button is-center" href={`${base}/hoje`}>Voltar para o início</Link>
      </div>
    );

  const [title, subtitle] = titles[step];
  const faces: IconName[] = ["f1", "f2", "f3", "f4", "f5"];

  return (
    <div className="pv-checkin">
      <div className="pv-progress" aria-hidden="true">
        {steps.map((item, position) => (
          <span key={item} className={position <= index ? "is-done" : undefined} />
        ))}
      </div>
      <p className="pv-muted pv-progress-label">
        {index + 1} de {steps.length}
      </p>
      <div className="pv-stack pv-tight">
        <h2 className="pv-big" id="pv-checkin-title">{title}</h2>
        <p className="pv-lead">{step === "application" ? `Pedido por ${doctor}.` : subtitle}</p>
      </div>

      <div className="pv-checkin-body" aria-labelledby="pv-checkin-title" role="group">
        {step === "weight" && (
          <>
            <div className="pv-weight">
              <button type="button" className="pv-step" aria-label="Diminuir 0,1 kg" onClick={() => {
                const current = parseWeight(weight) ?? lastWeight ?? 0;
                setWeight(decimal.format(Math.max(0, Math.round((current - 0.1) * 10) / 10)));
              }}>−</button>
              <label className="pv-weight-input">
                <span className="pv-visually-hidden">Peso em quilos</span>
                <input inputMode="decimal" autoComplete="off" placeholder="0,0" value={weight} onChange={(event) => setWeight(event.target.value)} />
                <span aria-hidden="true">kg</span>
              </label>
              <button type="button" className="pv-step" aria-label="Aumentar 0,1 kg" onClick={() => {
                const current = parseWeight(weight) ?? lastWeight ?? 0;
                setWeight(decimal.format(Math.round((current + 0.1) * 10) / 10));
              }}>+</button>
            </div>
            {lastWeight && <p className="pv-muted pv-center">Último registro: {decimal.format(lastWeight)} kg</p>}
          </>
        )}

        {step === "feeling" && (
          <div className="pv-options">
            {[5, 4, 3, 2, 1].map((n) => (
              <button key={n} type="button" className="pv-option" aria-pressed={answers.feeling === n} onClick={() => set({ feeling: answers.feeling === n ? undefined : n })}>
                <Icon name={faces[n - 1]} size={28} />
                <span>{feelingLabels[n - 1]}</span>
                {answers.feeling === n && <Icon name="check" size={20} />}
              </button>
            ))}
          </div>
        )}

        {step === "effects" && (
          <div className="pv-stack">
            <div className="pv-chips">
              {effectKeys.map((key) => {
                const selected = Boolean(answers.effects?.[key]);
                return (
                  <button key={key} type="button" className="pv-chip" aria-pressed={selected} onClick={() => {
                    const effects = { ...(answers.effects ?? {}) };
                    if (effects[key]) delete effects[key];
                    else effects[key] = "mild";
                    set({ effects, no_effects: false });
                  }}>
                    {selected && <Icon name="check" size={16} />} {effectLabels[key]}
                  </button>
                );
              })}
              <button type="button" className="pv-chip" aria-pressed={Boolean(answers.no_effects)} onClick={() => set({ no_effects: !answers.no_effects, effects: {} })}>
                {answers.no_effects && <Icon name="check" size={16} />} Nenhum hoje
              </button>
            </div>
            {Object.entries(answers.effects ?? {}).map(([key, level]) => (
              <fieldset key={key} className="pv-fieldset">
                <legend className="pv-scale-label">{effectLabels[key as EffectKey]}</legend>
                <div className="pv-segments">
                  {intensities.map((option) => (
                    <button key={option} type="button" aria-pressed={level === option} onClick={() => set({ effects: { ...(answers.effects ?? {}), [key]: option as Intensity } })}>
                      {intensityLabels[option]}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            {hasStrongEffect(answers) && (
              <Link className="pv-notice pv-notice-link" href={`${base}/alerta`}>
                Sentiu algo forte ou diferente? <strong>Veja o que fazer.</strong>
              </Link>
            )}
          </div>
        )}

        {step === "hunger" && (
          <div className="pv-stack">
            <Scale label="Fome" low="Pouca" high="Muita" value={answers.hunger} onChange={(value) => set({ hunger: value })} />
            <Scale label="Saciedade depois de comer" low="Pouca" high="Muita" value={answers.satiety} onChange={(value) => set({ satiety: value })} />
          </div>
        )}

        {step === "energy" && (
          <div className="pv-stack">
            <Scale label="Energia" low="Pouca" high="Muita" value={answers.energy} onChange={(value) => set({ energy: value })} />
            <Scale label="Como dormiu" low="Mal" high="Muito bem" value={answers.sleep} onChange={(value) => set({ sleep: value })} />
          </div>
        )}

        {step === "water" && (
          <div className="pv-stack">
            <div className="pv-weight">
              <button type="button" className="pv-step" aria-label="Menos um copo" onClick={() => { setWaterTouched(true); set({ water_glasses: Math.max(0, (answers.water_glasses ?? 0) - 1) }); }}>−</button>
              <p className="pv-water" aria-live="polite">
                <strong>{answers.water_glasses ?? 0}</strong> {answers.water_glasses === 1 ? "copo" : "copos"}
                <small>{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format((answers.water_glasses ?? 0) * 0.25)} L</small>
              </p>
              <button type="button" className="pv-step" aria-label="Mais um copo" onClick={() => { setWaterTouched(true); set({ water_glasses: Math.min(30, (answers.water_glasses ?? 0) + 1) }); }}>+</button>
            </div>
            <div className="pv-cups" aria-hidden="true">
              {Array.from({ length: Math.max(8, answers.water_glasses ?? 0) }, (_, position) => (
                <span key={position} className={position < (answers.water_glasses ?? 0) ? "is-full" : undefined}>
                  <Icon name="drop" size={20} />
                </span>
              ))}
            </div>
          </div>
        )}

        {step === "adherence" && (
          <div className="pv-stack">
            <div className="pv-segments">
              {(Object.keys(adherenceLabels) as (keyof typeof adherenceLabels)[]).map((key) => (
                <button key={key} type="button" aria-pressed={answers.adherence === key} onClick={() => set({ adherence: answers.adherence === key ? undefined : key })}>
                  {adherenceLabels[key]}
                </button>
              ))}
            </div>
            {(answers.adherence === "partial" || answers.adherence === "no") && (
              <fieldset className="pv-fieldset">
                <legend className="pv-scale-label">Quer dizer o motivo? <span className="pv-muted">Opcional</span></legend>
                <div className="pv-chips">
                  {(Object.keys(reasonLabels) as (keyof typeof reasonLabels)[]).map((key) => (
                    <button key={key} type="button" className="pv-chip" aria-pressed={answers.adherence_reason === key} onClick={() => set({ adherence_reason: answers.adherence_reason === key ? undefined : key })}>
                      {reasonLabels[key]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {step === "application" && (
          <div className="pv-stack">
            <fieldset className="pv-fieldset">
              <legend className="pv-scale-label">Dia</legend>
              <div className="pv-segments">
                {(["today", "yesterday", "other"] as const).map((key) => (
                  <button key={key} type="button" aria-pressed={applicationDay === key} onClick={() => setApplicationDay(key)}>
                    {{ today: "Hoje", yesterday: "Ontem", other: "Outro dia" }[key]}
                  </button>
                ))}
              </div>
              {applicationDay === "other" && (
                <label className="pv-field">
                  <span className="pv-visually-hidden">Dia da aplicação</span>
                  <input type="date" max={today} value={answers.application_on ?? ""} onChange={(event) => set({ application_on: event.target.value || undefined })} />
                </label>
              )}
            </fieldset>
            <label className="pv-field">
              Horário
              <input type="time" value={answers.application_time ?? ""} onChange={(event) => set({ application_time: event.target.value || undefined })} />
            </label>
            <fieldset className="pv-fieldset">
              <legend className="pv-scale-label">Local</legend>
              <div className="pv-chips">
                {(Object.keys(siteLabels) as (keyof typeof siteLabels)[]).map((key) => (
                  <button key={key} type="button" className="pv-chip" aria-pressed={answers.application_site === key} onClick={() => set({ application_site: answers.application_site === key ? undefined : key })}>
                    {siteLabels[key]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="pv-fieldset">
              <legend className="pv-scale-label">Lado</legend>
              <div className="pv-segments">
                {(Object.keys(sideLabels) as (keyof typeof sideLabels)[]).map((key) => (
                  <button key={key} type="button" aria-pressed={answers.application_side === key} onClick={() => set({ application_side: answers.application_side === key ? undefined : key })}>
                    {sideLabels[key]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === "note" && (
          <label className="pv-field">
            <span className="pv-visually-hidden">Recado para {doctor}</span>
            <textarea rows={4} maxLength={2000} placeholder="Escreva aqui, se quiser." value={answers.note ?? ""} onChange={(event) => set({ note: event.target.value })} />
          </label>
        )}
      </div>

      {error && <p className="pv-form-error" role="alert">{error}</p>}

      <div className="pv-checkin-actions">
        {index > 0 ? (
          <button type="button" className="pv-link" onClick={() => setIndex(index - 1)} disabled={pending}>
            Voltar
          </button>
        ) : (
          <Link className="pv-link" href={`${base}/hoje`}>Agora não</Link>
        )}
        {!last && (
          <button type="button" className="pv-link" onClick={() => setIndex(index + 1)} disabled={pending}>
            Pular
          </button>
        )}
      </div>
      <button type="button" className="pv-button is-center" disabled={pending} onClick={() => (last ? send() : setIndex(index + 1))}>
        {last ? (pending ? "Enviando…" : "Enviar check-in") : "Continuar"}
      </button>
    </div>
  );
}
