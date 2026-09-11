"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import type { EncounterList } from "@/modules/encounters/service";

type Encounter = EncounterList["encounters"][number];

export function EncounterDirectory({
  tenantId,
  initial,
}: {
  tenantId: string;
  initial: EncounterList;
}) {
  const [query, setQuery] = useState(initial.query);
  const [activeQuery, setActiveQuery] = useState(initial.query);
  const [encounters, setEncounters] = useState(initial.encounters);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function load(reset: boolean) {
    if (pending || (!reset && !nextCursor)) return;
    setPending(true);
    setError("");
    const requestedQuery = reset ? query.trim() : activeQuery;
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/encounters/search`,
        {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: requestedQuery,
            ...(!reset && nextCursor ? { cursor: nextCursor } : {}),
          }),
        },
      );
      const result = (await response.json()) as EncounterList & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível buscar atendimentos.");
      setActiveQuery(result.query);
      setNextCursor(result.nextCursor);
      setEncounters((current) => {
        if (reset) return result.encounters;
        const merged = new Map<string, Encounter>();
        for (const encounter of [...current, ...result.encounters])
          merged.set(encounter.id, encounter);
        return [...merged.values()];
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível buscar atendimentos.",
      );
    } finally {
      setPending(false);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(true);
  }

  return (
    <section className="panel encounter-directory">
      <div className="section-heading encounter-directory-heading">
        <div>
          <h2>Registros clínicos</h2>
          <p>Atendimentos visíveis conforme seu vínculo de cuidado.</p>
        </div>
        <span className="directory-count">
          {encounters.length} {encounters.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      <form className="encounter-search" onSubmit={search} role="search">
        <div className="field">
          <label htmlFor="encounter-search">Buscar paciente</label>
          <input
            id="encounter-search"
            type="search"
            maxLength={80}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome do paciente"
          />
        </div>
        <button disabled={pending}>{pending ? "Buscando…" : "Buscar"}</button>
      </form>
      {activeQuery && (
        <p>
          Resultado para <strong>{activeQuery}</strong>
        </p>
      )}
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      {encounters.length ? (
        <ul className="list encounter-list">
          {encounters.map((encounter) => (
            <li className="encounter-row" key={encounter.id}>
              <span className="patient-avatar patient-avatar-large" aria-hidden="true">
                {encounter.patient_display_name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="encounter-row-main">
                <strong>{encounter.patient_display_name}</strong>
                <p>
                  Atualizado em{" "}
                  {new Date(encounter.updated_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <small>{encounter.doctor_display_name}</small>
              </div>
              <span
                className={`appointment-status ${
                  encounter.status === "draft" ? "in-progress" : "completed"
                }`}
              >
                {encounter.status === "draft" ? "Em atendimento" : "Concluído"}
              </span>
              <Link
                className="encounter-row-action"
                href={`/clinicas/${tenantId}/atendimentos/${encounter.id}`}
              >
                {encounter.status === "draft" &&
                encounter.doctor_id === initial.userId
                  ? "Continuar atendimento"
                  : "Consultar registro"}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h3>
            {activeQuery
              ? "Nenhum atendimento encontrado"
              : "Nenhum atendimento disponível"}
          </h3>
          <p>
            {activeQuery
              ? "Revise o nome e tente novamente."
              : initial.clinic.role === "doctor"
                ? "Na agenda, abra uma consulta e confirme o início do atendimento."
                : "Os registros aparecerão após a atribuição de um vínculo de cuidado ativo."}
          </p>
        </div>
      )}
      {nextCursor && (
        <button
          className="secondary encounter-load-more"
          disabled={pending}
          onClick={() => void load(false)}
        >
          {pending ? "Carregando…" : "Carregar mais atendimentos"}
        </button>
      )}
      <p className="sr-only" aria-live="polite">
        {pending
          ? "Carregando atendimentos"
          : `${encounters.length} registros exibidos`}
      </p>
    </section>
  );
}
