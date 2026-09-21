"use client";

import type { StaffMeals } from "@/modules/meals/service";
import { mealTypeLabels } from "@/modules/meals/validation";
import { clinicalTime } from "./encounter-editor";

export function StaffMealLogs({ initial }: { initial: StaffMeals }) {
  return <section className="meal-log-history" aria-labelledby="staff-meal-history-title">
    <div className="section-heading"><div><h2 id="staff-meal-history-title">Refeições registradas</h2><p>Relatos originais dos pacientes com vínculo ativo; não são avaliação nutricional automática.</p></div></div>
    {initial.meals.length ? initial.meals.map((meal) => <article className="panel meal-log-item" key={meal.id}>
      <div><strong>{meal.patients?.display_name ?? "Paciente"} · {mealTypeLabels[meal.meal_type as keyof typeof mealTypeLabels] ?? "Refeição"}</strong><span>{clinicalTime(meal.eaten_at)}</span></div>
      <p>{meal.description}</p>
    </article>) : <section className="panel empty"><h3>Nenhuma refeição registrada</h3><p>Os relatos enviados pelos pacientes com seu vínculo de cuidado aparecerão aqui.</p></section>}
  </section>;
}
