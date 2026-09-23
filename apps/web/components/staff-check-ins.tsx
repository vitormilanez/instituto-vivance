"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StaffCheckIns } from "@/modules/daily-check-ins/service";
import {
  adherenceLabels,
  effectLabels,
  feelingLabels,
  intensityLabels,
  intensityLetters,
  reasonLabels,
  siteLabels,
  sideLabels,
  type EffectKey,
  type Intensity,
} from "@/modules/daily-check-ins/model";

const dayMonth = (day: string) => day.split("-").reverse().slice(0, 2).join("/");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

// Leitura do médico: o relato do paciente como foi enviado, com a data. O
// que o paciente marcou como "forte" aparece escrito — nada de cor de risco,
// nada de interpretação automática. O médico decide a frequência e se o
// check-in pergunta sobre a aplicação.
export function StaffCheckInsPanel({
  data,
  tenantId,
  patientId,
  canEdit,
}: {
  data: StaffCheckIns;
  tenantId: string;
  patientId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [frequency, setFrequency] = useState(data.frequencyDays);
  const [application, setApplication] = useState(data.applicationEnabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const changed = frequency !== data.frequencyDays || application !== data.applicationEnabled;

  async function save() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/patients/${patientId}/check-in-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency_days: frequency, application_enabled: application }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      setMessage("Configuração salva.");
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel staff-check-ins" aria-labelledby="staff-check-ins-title">
      <div className="section-heading">
        <div>
          <h2 id="staff-check-ins-title">Check-in do paciente</h2>
          <p>Relatos enviados pelo paciente nos últimos 30 dias, como foram enviados. Sem interpretação automática.</p>
        </div>
      </div>
      <fieldset className="staff-check-in-settings" disabled={!canEdit || pending}>
        <legend>Configuração</legend>
        <label>
          <input type="radio" name="frequency" checked={frequency === 1} onChange={() => setFrequency(1)} /> Todo dia
        </label>
        <label>
          <input type="radio" name="frequency" checked={frequency === 3} onChange={() => setFrequency(3)} /> A cada 3 dias
        </label>
        <label>
          <input type="checkbox" checked={application} onChange={(event) => setApplication(event.target.checked)} /> Perguntar sobre a aplicação (dia, hora e local)
        </label>
        {canEdit ? (
          <button type="button" onClick={save} disabled={!changed || pending}>
            {pending ? "Salvando…" : "Salvar configuração"}
          </button>
        ) : (
          <p className="quiet-label">Só o médico do vínculo altera a configuração.</p>
        )}
        {message && <p role="status">{message}</p>}
        {!data.configured && <p className="quiet-label">Padrão em uso: todo dia, sem pergunta sobre aplicação.</p>}
      </fieldset>

      {data.effects.rows.length > 0 && (
        <div className="staff-effects">
          <h3>Efeitos marcados · últimos 14 dias</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Efeito</th>
                {data.effects.dates.map((day) => (
                  <th key={day} scope="col">{dayMonth(day)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.effects.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell) => (
                    <td key={cell.day} title={cell.state === "none" ? "sem check-in" : cell.state === "clear" ? "não marcado" : intensityLabels[cell.state]}>
                      {cell.state === "none" ? "·" : cell.state === "clear" ? "" : intensityLetters[cell.state]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="quiet-label">L leve · M moderado · F forte · vazio = não marcado · ponto = sem check-in</p>
        </div>
      )}

      {data.rows.length ? (
        <ol className="staff-check-in-list">
          {data.rows.map((row) => {
            const effects = Object.entries((row.effects ?? {}) as Record<string, string>);
            return (
              <li key={row.id}>
                <strong>{dayMonth(row.check_in_on)}</strong>
                <dl>
                  {row.weight_kg !== null && (<><dt>Peso</dt><dd>{decimal.format(row.weight_kg)} kg</dd></>)}
                  {row.feeling !== null && (<><dt>Como se sentiu</dt><dd>{feelingLabels[row.feeling - 1]}</dd></>)}
                  {(row.no_effects || effects.length > 0) && (
                    <>
                      <dt>Efeitos</dt>
                      <dd>
                        {row.no_effects
                          ? "Nenhum"
                          : effects.map(([key, level], index) => (
                              <span key={key}>
                                {index > 0 ? ", " : ""}
                                {effectLabels[key as EffectKey]} ({level === "strong" ? <strong>forte</strong> : intensityLabels[level as Intensity].toLowerCase()})
                              </span>
                            ))}
                      </dd>
                    </>
                  )}
                  {(row.hunger !== null || row.satiety !== null) && (<><dt>Fome · saciedade</dt><dd>{row.hunger ?? "–"} · {row.satiety ?? "–"} de 5</dd></>)}
                  {(row.energy !== null || row.sleep !== null) && (<><dt>Energia · sono</dt><dd>{row.energy ?? "–"} · {row.sleep ?? "–"} de 5</dd></>)}
                  {row.water_glasses !== null && (<><dt>Água</dt><dd>{row.water_glasses} copos</dd></>)}
                  {row.adherence && (
                    <>
                      <dt>Tratamento</dt>
                      <dd>
                        {adherenceLabels[row.adherence as keyof typeof adherenceLabels]}
                        {row.adherence_reason ? ` · ${reasonLabels[row.adherence_reason as keyof typeof reasonLabels].toLowerCase()}` : ""}
                      </dd>
                    </>
                  )}
                  {(row.application_site || row.application_on) && (
                    <>
                      <dt>Aplicação</dt>
                      <dd>
                        {[
                          row.application_on ? dayMonth(row.application_on) : null,
                          row.application_time?.slice(0, 5) ?? null,
                          row.application_site ? siteLabels[row.application_site as keyof typeof siteLabels] : null,
                          row.application_side ? sideLabels[row.application_side as keyof typeof sideLabels].toLowerCase() : null,
                        ].filter(Boolean).join(" · ")}
                      </dd>
                    </>
                  )}
                  {row.note && (<><dt>Recado</dt><dd className="staff-check-in-note">{row.note}</dd></>)}
                </dl>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="quiet-label">Nenhum check-in nos últimos 30 dias.</p>
      )}
    </section>
  );
}
