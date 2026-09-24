"use client";

import { useState } from "react";
import type { StaffMeals } from "@/modules/meals/service";
import { mealTypeLabels } from "@/modules/meals/validation";
import { clinicalTime } from "./encounter-editor";

export function StaffMealLogs({ initial }: { initial: StaffMeals }) {
  const [selectedPatient, setSelectedPatient] = useState("");
  const patients = Array.from(new Map(initial.meals.map((meal) => [meal.patient_id, meal.patients?.display_name ?? "Paciente"])).entries());
  const meals = initial.meals.filter((meal) => !selectedPatient || meal.patient_id === selectedPatient);
  return <section className="meal-log-history" aria-labelledby="staff-meal-history-title">
    <div className="section-heading"><div><h2 id="staff-meal-history-title">Refeições registradas</h2><p>Relatos originais dos pacientes com vínculo ativo; não são avaliação nutricional automática. Abra um registro para ver o texto e a foto.</p></div></div>
    <label className="field followup-filter">
      Filtrar por paciente
      <select value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>
        <option value="">Todos os pacientes</option>
        {patients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
    <p className="quiet-label">{meals.length} {meals.length === 1 ? "registro recente" : "registros recentes"}</p>
    {meals.length ? meals.map((meal) => <details className="panel meal-log-item meal-log-disclosure" key={meal.id}>
      <summary><strong>{meal.patients?.display_name ?? "Paciente"} · {mealTypeLabels[meal.meal_type as keyof typeof mealTypeLabels] ?? "Refeição"}</strong><span>{clinicalTime(meal.eaten_at)}</span></summary>
      {meal.description ? <p>{meal.description}</p> : <p className="quiet-label">Só a foto, sem descrição.</p>}
      {meal.photo_document_id && <figure className="meal-log-photo">
        <a href={`/api/v1/clinics/${initial.clinic.id}/documents/${meal.photo_document_id}/download`} target="_blank" rel="noreferrer">
          {/* Rota protegida: o mesmo vínculo de cuidado autoriza o download. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- rota protegida com redirecionamento; o otimizador não tem a sessão */}
          <img src={`/api/v1/clinics/${initial.clinic.id}/documents/${meal.photo_document_id}/download`} alt={`Foto da refeição enviada por ${meal.patients?.display_name ?? "paciente"}`} loading="lazy" />
        </a>
        <figcaption className="quiet-label">Foto enviada por {meal.patients?.display_name ?? "paciente"} · {clinicalTime(meal.eaten_at)}</figcaption>
      </figure>}
    </details>) : <section className="panel empty"><h3>Nenhuma refeição para este filtro</h3><p>Escolha outro paciente para ver os registros disponíveis.</p></section>}
  </section>;
}
