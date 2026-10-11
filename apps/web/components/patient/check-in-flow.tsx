"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  adherenceLabels,
  bowelStatusLabels,
  checkInSteps,
  checkInSummary,
  effectLabels,
  feelingLabels,
  hasStrongEffect,
  intensities,
  intensityLabels,
  reasonLabels,
  selectableEffectKeys,
  sideLabels,
  siteLabels,
  type CheckInAnswers,
  type EffectKey,
  type Intensity,
} from "@/modules/daily-check-ins/model";
import { Icon, type IconName } from "./icons";
import { Check, ChevronRight, MessageSquare, Moon, Toilet, Utensils, Zap } from "lucide-react";
import { momentQuestions, topicLabels } from "@/modules/daily-check-ins/experience";
import { MomentArtwork, MomentScale } from "./moment-choices";
import { sendOrQueue } from "./outbox";

const titles: Record<string, [string, string]> = {
  energy: [momentQuestions.energy, "Toque em uma opção para continuar."],
  sleep: [momentQuestions.sleep, "Pense no seu último sono. Toque para continuar."],
  hunger: [momentQuestions.hunger, "Como está agora? Toque para continuar."],
  bowel: [momentQuestions.bowel, "Escolha como foi para você. Toque para continuar."],
  application: ["Quer registrar sua aplicação?", "Pedido pelo seu médico."],
  note: ["Quer acrescentar algo?", "Um recado é opcional. Você já pode enviar."],
};
const topicIcons = { energy: Zap, sleep: Moon, hunger: Utensils, bowel: Toilet, application: Check, note: MessageSquare };

// Enjoo e náusea aparecem como uma escolha no novo registro. A chave legada
// "queasy" continua aceita e legível no histórico, sem reescrever respostas.
const entryEffectLabel = (key: EffectKey) => key === "nausea" ? "Náusea ou enjoo" : effectLabels[key];

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
  const request = useRef<{ key: string; fingerprint: string } | null>(null);
  const busy = useRef(false);
  const lastFocusState = useRef({ index: 0, done: false });
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const extraFields = useRef<HTMLDetailsElement>(null);
  const weightInput = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(0);
  const [weight, setWeight] = useState("");
  const [answers, setAnswers] = useState<CheckInAnswers>({});
  const [waterTouched, setWaterTouched] = useState(false);
  const [applicationDay, setApplicationDay] = useState<"today" | "yesterday" | "other">("today");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ queued: boolean; at: string; rows: { label: string; value: string }[] } | null>(null);

  const step = steps[index];
  const last = index === steps.length - 1;
  const set = (patch: Partial<CheckInAnswers>) => setAnswers((current) => ({ ...current, ...patch }));
  const doctor = doctorName ?? "seu médico";

  useEffect(() => {
    const previous = lastFocusState.current;
    if (previous.index === index && previous.done === Boolean(done)) return;
    lastFocusState.current = { index, done: Boolean(done) };
    const heading = done ? doneHeading.current : stepHeading.current;
    heading?.closest(".pv-checkin, .pv-done")?.scrollIntoView({ block: "start", behavior: "instant" });
    heading?.focus({ preventScroll: true });
  }, [done, index]);

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
    if (result.adherence !== "partial" && result.adherence !== "no") delete result.adherence_reason;
    if (!result.note?.trim()) delete result.note;
    return result;
  }

  async function send() {
    if (busy.current) return;
    const weightValue = parseWeight(weight);
    if (weight.trim() && (weightValue === null || weightValue > 500)) {
      setError("Confira o peso: use um número maior que zero e até 500 kg.");
      if (extraFields.current) extraFields.current.open = true;
      weightInput.current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    const body = payload();
    const fingerprint = JSON.stringify(body);
    if (!request.current || request.current.fingerprint !== fingerprint)
      request.current = { key: crypto.randomUUID(), fingerprint };
    try {
      const sent = await sendOrQueue(
        `/api/v1/clinics/${tenantId}/daily-check-ins`,
        { request_key: request.current.key, answers: body },
        "Check-in",
      );
      if (!sent.queued) {
        const result = await sent.response.json();
        if (!sent.response.ok) throw new Error(result.error ?? "Não conseguimos enviar agora.");
      }
      setDone({
        queued: sent.queued,
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
        <span className="pv-done-icon" aria-hidden="true"><Icon name={done.queued ? "wifiOff" : "check"} size={32} /></span>
        <h2 className="pv-big" tabIndex={-1} ref={doneHeading}>{done.queued ? "Salvo no seu celular" : "Pronto, obrigado!"}</h2>
        <p className="pv-lead">
          {done.queued
            ? "Sem internet agora. Enviamos sozinhos assim que a conexão voltar — não precisa fazer nada."
            : `Tudo registrado para ${doctor}.`}
        </p>
        <p className="pv-sent-when">
          {done.queued ? <><Icon name="wifiOff" size={16} /> Aguardando conexão</> : <><Icon name="check" size={16} /> Enviado {done.at}</>}
        </p>
        {done.rows.length > 0 && (
          <details className="pv-card pv-receipt">
            <summary>Ver o que enviei</summary>
            <dl className="pv-summary">
              {done.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <p className="pv-muted">Próximo check-in: {nextLabel === "hoje" ? "amanhã" : nextLabel}.</p>
        <Link className="pv-button is-center" href={`${base}/hoje`}>Voltar para o início</Link>
      </div>
    );

  const [title, subtitle] = titles[step];
  const faces: IconName[] = ["f1", "f2", "f3", "f4", "f5"];

  return (
    <div className="pv-checkin moment-flow">
      <nav className="moment-steps" aria-label="Perguntas do check-in">
        {steps.map((item, position) => {
          const TopicIcon = topicIcons[item];
          const answered = item === "bowel" ? Boolean(answers.bowel_status) : item === "note" ? Boolean(answers.note?.trim()) : item === "application" ? Boolean(answers.application_site || answers.application_on) : answers[item] !== undefined;
          return <button type="button" key={item} aria-current={index === position ? "step" : undefined} onClick={() => setIndex(position)} disabled={pending}>
            <TopicIcon size={18} aria-hidden="true" /><span>{topicLabels[item]}</span>{answered && <Check size={12} className="moment-step-check" aria-hidden="true" />}
          </button>;
        })}
      </nav>
      <div className="moment-question-heading">
        <div className="pv-stack pv-tight">
          <p className="moment-kicker">{index + 1} de {steps.length} · {topicLabels[step]}</p>
          <h2 className="pv-big" id="pv-checkin-title" tabIndex={-1} ref={stepHeading}>{title}</h2>
          <p className="pv-lead">{step === "application" ? `Pedido por ${doctor}.` : subtitle}</p>
        </div>
        {(step === "sleep" || step === "hunger" || step === "bowel") && <MomentArtwork name={step === "bowel" ? "bathroom" : step} />}
      </div>

      <div className="pv-checkin-body" aria-labelledby="pv-checkin-title" role="group">
        {(step === "energy" || step === "sleep" || step === "hunger") && (
          <MomentScale topic={step} value={answers[step]} advance onChoose={(value) => {
            set({ [step]: value });
            setIndex(index + 1);
          }} disabled={pending} />
        )}
        {step === "bowel" && (
          <div className="moment-bowel-options" role="group" aria-label="Intestino">
            {(["poor", "regular", "good"] as const).map((key) => (
              <button type="button" key={key} aria-pressed={answers.bowel_status === key} disabled={pending}
                aria-label={`${bowelStatusLabels[key]}. Escolher e continuar`}
                onClick={() => { set({ bowel_status: key }); setIndex(index + 1); }}>
                <Icon name={{ poor: "f2", regular: "f3", good: "f4" }[key] as IconName} size={32} />
                <strong>{bowelStatusLabels[key]}</strong>
                <span>{{ poor: "Com desconforto", regular: "Mais ou menos", good: "Confortável" }[key]}</span>
              </button>
            ))}
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
          <>
            <label className="pv-field">
              <span className="pv-visually-hidden">Quer acrescentar algo? Recado para {doctor}</span>
              <textarea rows={3} maxLength={2000} placeholder="Algo diferente no seu dia? Conte aqui, se quiser." value={answers.note ?? ""} onChange={(event) => set({ note: event.target.value })} disabled={pending} />
            </label>
            <div className="moment-review" aria-label="Suas respostas">
              {(["energy", "sleep", "hunger", "bowel"] as const).map((topic) => {
                const value = topic === "bowel" ? (answers.bowel_status ? bowelStatusLabels[answers.bowel_status] : null) : answers[topic] ? `${answers[topic]} de 5` : null;
                return <button type="button" key={topic} onClick={() => setIndex(steps.indexOf(topic))} disabled={pending}>
                  <span>{topicLabels[topic]}</span><strong>{value ?? "Não informado"}</strong><ChevronRight size={16} aria-hidden="true" />
                </button>;
              })}
            </div>
            <details className="moment-more" ref={extraFields}>
              <summary>Mais sobre meu dia <span>Peso, efeitos, água e tratamento · opcional</span></summary>
              <fieldset disabled={pending} className="moment-extra-fields">
<section className="moment-extra-section"><h3>Peso</h3><>
            <div className="pv-weight">
              <button type="button" className="pv-step" aria-label="Diminuir 0,1 kg" onClick={() => {
                const current = parseWeight(weight) ?? lastWeight ?? 0;
                setWeight(decimal.format(Math.max(0, Math.round((current - 0.1) * 10) / 10)));
              }}>−</button>
              <label className="pv-weight-input">
                <span className="pv-visually-hidden">Peso em quilos</span>
                <input ref={weightInput} inputMode="decimal" autoComplete="off" placeholder="0,0" value={weight} onChange={(event) => setWeight(event.target.value)} />
                <span aria-hidden="true">kg</span>
              </label>
              <button type="button" className="pv-step" aria-label="Aumentar 0,1 kg" onClick={() => {
                const current = parseWeight(weight) ?? lastWeight ?? 0;
                setWeight(decimal.format(Math.round((current + 0.1) * 10) / 10));
              }}>+</button>
            </div>
            {lastWeight && <p className="pv-muted pv-center">Último registro: {decimal.format(lastWeight)} kg</p>}
          </></section>
<section className="moment-extra-section"><h3>Como você se sentiu</h3><div className="pv-options">
            {[5, 4, 3, 2, 1].map((n) => (
              <button key={n} type="button" className="pv-option" aria-pressed={answers.feeling === n} onClick={() => set({ feeling: answers.feeling === n ? undefined : n })}>
                <Icon name={faces[n - 1]} size={28} />
                <span>{feelingLabels[n - 1]}</span>
                {answers.feeling === n && <Icon name="check" size={20} />}
              </button>
            ))}
          </div></section>
<section className="moment-extra-section"><h3>Efeitos que sentiu</h3><div className="pv-stack">
            <div className="pv-chips">
              {selectableEffectKeys.map((key) => {
                const selected = Boolean(answers.effects?.[key]);
                return (
                  <button key={key} type="button" className="pv-chip" aria-pressed={selected} onClick={() => {
                    const effects = { ...(answers.effects ?? {}) };
                    if (effects[key]) delete effects[key];
                    else effects[key] = "mild";
                    set({ effects, no_effects: false });
                  }}>
                    {selected && <Icon name="check" size={16} />} {entryEffectLabel(key)}
                  </button>
                );
              })}
              <button type="button" className="pv-chip" aria-pressed={Boolean(answers.no_effects)} onClick={() => set({ no_effects: !answers.no_effects, effects: {} })}>
                {answers.no_effects && <Icon name="check" size={16} />} Nenhum hoje
              </button>
            </div>
            {Object.entries(answers.effects ?? {}).map(([key, level]) => (
              <fieldset key={key} className="pv-fieldset">
                <legend className="pv-scale-label">{entryEffectLabel(key as EffectKey)}</legend>
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
          </div></section>
<section className="moment-extra-section"><h3>Água</h3><div className="pv-stack">
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
          </div></section>
<section className="moment-extra-section"><h3>Tratamento</h3><div className="pv-stack">
            <div className="pv-segments">
              {(Object.keys(adherenceLabels) as (keyof typeof adherenceLabels)[]).map((key) => (
                <button key={key} type="button" aria-pressed={answers.adherence === key} onClick={() => {
                  const adherence = answers.adherence === key ? undefined : key;
                  set({ adherence, adherence_reason: adherence === "partial" || adherence === "no" ? answers.adherence_reason : undefined });
                }}>
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
          </div></section>
                <section className="moment-extra-section"><h3>Depois de comer</h3>
                  <Scale label="Saciedade" low="Pouca" high="Muita" value={answers.satiety} onChange={(value) => set({ satiety: value })} />
                </section>
              </fieldset>
            </details>
          </>
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
          <button type="button" className="pv-link" onClick={() => {
            if (step === "bowel") set({ bowel_status: undefined });
            else if (step === "application") set({ application_on: undefined, application_time: undefined, application_site: undefined, application_side: undefined });
            else if (step === "energy" || step === "sleep" || step === "hunger") set({ [step]: undefined });
            setIndex(index + 1);
          }} disabled={pending}>
            Pular
          </button>
        )}
      </div>
      {(last || step === "application") && <button type="button" className="pv-button is-center" disabled={pending} onClick={() => (last ? send() : setIndex(index + 1))}>
        {last ? (pending ? "Enviando…" : "Enviar check-in") : "Continuar"}
      </button>}
    </div>
  );
}
