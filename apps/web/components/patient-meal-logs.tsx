"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { PatientMeals } from "@/modules/meals/service";
import { mealTypeLabels } from "@/modules/meals/validation";
import { clinicalTime } from "./encounter-editor";

const choices = Object.entries(mealTypeLabels);
const currentLocalDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function PatientMealLogs({ initial }: { initial: PatientMeals }) {
  const router = useRouter(), busy = useRef(false), request = useRef<{ key: string; fingerprint: string } | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const localDateTime = form.get("eaten_at");
    const payload = {
      meal_type: form.get("meal_type"),
      eaten_at: typeof localDateTime === "string" ? new Date(localDateTime).toISOString() : localDateTime,
      description: form.get("description"),
    };
    const fingerprint = JSON.stringify(payload);
    if (!request.current || request.current.fingerprint !== fingerprint)
      request.current = { key: crypto.randomUUID(), fingerprint };
    try {
      const response = await fetch(`/api/v1/clinics/${initial.clinic.id}/meals`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ request_key: request.current.key, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível registrar a refeição.");
      formElement.reset();
      request.current = null;
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar a refeição.");
    } finally { busy.current = false; setPending(false); }
  }

  return <section className="meal-log-workspace" aria-labelledby="meal-log-title">
    <article className="panel meal-log-entry">
      <div className="section-heading"><div>
        <h2 id="meal-log-title">Registrar refeição</h2>
        <p>Registre o que comeu para que a equipe tenha contexto na próxima conversa.</p>
      </div></div>
      <form onSubmit={submit}>
        <div className="meal-log-fields">
          <label className="field">Tipo de refeição
            <select name="meal_type" defaultValue="lunch" disabled={pending}>{choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label className="field">Data e horário
            <input name="eaten_at" type="datetime-local" required disabled={pending} defaultValue={currentLocalDateTime()} />
          </label>
        </div>
        <label className="field">O que você comeu?
          <textarea name="description" rows={4} required maxLength={2000} disabled={pending} placeholder="Ex.: arroz, frango, salada e água." />
        </label>
        <p className="module-footnote">Este é um relato seu. Não calcula calorias, não avalia sua alimentação e não altera orientações médicas.</p>
        {error && <p className="feedback" role="alert">{error}</p>}
        <button disabled={pending}>{pending ? "Registrando…" : "Registrar refeição"}</button>
      </form>
    </article>
    <section className="meal-log-history" aria-labelledby="meal-history-title">
      <div className="section-heading"><div><h2 id="meal-history-title">Registros recentes</h2><p>Seus últimos 20 relatos, preservados como foram enviados.</p></div></div>
      {initial.meals.length ? initial.meals.map((meal) => <article className="panel meal-log-item" key={meal.id}>
        <div><strong>{mealTypeLabels[meal.meal_type as keyof typeof mealTypeLabels] ?? "Refeição"}</strong><span>{clinicalTime(meal.eaten_at)}</span></div>
        <p>{meal.description}</p>
      </article>) : <section className="panel empty"><h3>Seu primeiro registro começa aqui</h3><p>Quando quiser, conte uma refeição do seu dia.</p></section>}
    </section>
  </section>;
}
