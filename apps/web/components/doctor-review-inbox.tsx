"use client";

import Link from "next/link";
import { useState } from "react";
import {
  doctorReviewGroups,
  type DoctorReviewPatient,
  type DoctorReviewStatus,
} from "@/modules/workspace/doctor-review";
import {
  receivedItemLabels,
  type ReceivedItemKind,
} from "@/modules/workspace/received-items";
import { ReceivedLink } from "./received-link";

const arrival = (at: string) =>
  new Date(at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

export function DoctorReviewInbox({
  tenantId,
  patients,
  failed,
}: {
  tenantId: string;
  patients: DoctorReviewPatient[];
  failed: ReceivedItemKind[];
}) {
  const [kind, setKind] = useState<ReceivedItemKind | "all">("all");
  const [status, setStatus] = useState<DoctorReviewStatus>("all");
  const [search, setSearch] = useState("");
  const groups = doctorReviewGroups(patients, { kind, status, search });
  const total = groups.reduce(
    (count, patient) => count + patient.items.length,
    0,
  );
  return (
    <div className="dv-review">
      <div className="dv-review-heading">
        <div>
          <span className="eyebrow">Entre consultas</span>
          <h1>Para revisar</h1>
          <p>O que seus pacientes enviaram, reunido por pessoa.</p>
        </div>
        <Link
          className="button secondary"
          href={`/clinicas/${tenantId}/acompanhamento`}
        >
          Solicitações de acompanhamento
        </Link>
      </div>
      {failed.length > 0 && (
        <div className="notice" role="status">
          Não foi possível carregar:{" "}
          {failed.map((item) => receivedItemLabels[item]).join(", ")}. Os demais
          registros continuam disponíveis.{" "}
          <a href={`/clinicas/${tenantId}/revisar`}>Tentar novamente</a>
        </div>
      )}
      <section className="dv-review-toolbar" aria-label="Filtrar envios">
        <div
          className="dv-review-status"
          role="group"
          aria-label="Abertura do registro"
        >
          {(
            [
              { key: "all", label: "Todos" },
              { key: "unopened", label: "Não abertos" },
              { key: "opened", label: "Já abertos" },
            ] as const
          ).map((option) => (
            <button
              type="button"
              key={option.key}
              aria-pressed={status === option.key}
              onClick={() => setStatus(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="dv-review-filters">
          <div>
            <label htmlFor="review-search">Paciente</label>
            <input
              id="review-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome"
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="review-kind">Tipo de envio</label>
            <select
              id="review-kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as ReceivedItemKind | "all")
              }
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(receivedItemLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <div className="dv-review-summary">
        <p role="status">
          {total} {total === 1 ? "envio" : "envios"} · {groups.length}{" "}
          {groups.length === 1 ? "paciente" : "pacientes"}
        </p>
        <span>Do mais antigo ao mais recente</span>
      </div>
      <p className="dv-review-context">
        Desde a última consulta finalizada ou o início do vínculo. Abrir um
        registro não o marca como revisado.
      </p>
      {groups.length === 0 ? (
        <div className="panel dv-review-empty">
          <h2>
            {failed.length
              ? "Parte dos envios está indisponível"
              : patients.some((patient) => patient.items.length)
                ? "Nenhum envio nesta seleção"
                : "Nenhum envio por aqui ainda"}
          </h2>
          <p>
            {failed.length
              ? "Tente carregar novamente para conferir os tipos de envio que faltam."
              : patients.some((patient) => patient.items.length)
                ? "Experimente outro nome, tipo ou estado de abertura."
                : "Check-ins, mensagens, medidas, pré-consultas e documentos aparecem aqui quando seus pacientes os enviarem."}
          </p>
          {(kind !== "all" || status !== "all" || search) && (
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setKind("all");
                setStatus("all");
                setSearch("");
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="dv-review-groups">
          {groups.map((patient) => (
            <section
              className="dv-review-patient"
              key={patient.patientId}
              aria-labelledby={`review-patient-${patient.patientId}`}
            >
              <header>
                <div className="dv-avatar" aria-hidden="true">
                  {patient.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div>
                  <h2 id={`review-patient-${patient.patientId}`}>
                    {patient.name}
                  </h2>
                  <p>
                    {patient.items.length}{" "}
                    {patient.items.length === 1 ? "envio" : "envios"}
                  </p>
                </div>
                <Link
                  href={`/clinicas/${tenantId}/pacientes/${patient.patientId}`}
                >
                  Abrir ficha<span className="sr-only"> de {patient.name}</span>
                </Link>
              </header>
              <ul>
                {patient.items.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <div>
                      <strong>{receivedItemLabels[item.kind]}</strong>
                      <time dateTime={item.at}>{arrival(item.at)}</time>
                    </div>
                    <span
                      className={`dv-read-state${item.seen === false ? " dv-read-new" : ""}`}
                    >
                      {item.seen === false
                        ? "Não aberto"
                        : item.seen === true
                          ? "Já aberto"
                          : "Abertura não confirmada"}
                    </span>
                    <ReceivedLink
                      tenantId={tenantId}
                      kind={item.kind}
                      itemId={item.id}
                      href={item.href}
                      unseen={item.seen === false}
                    >
                      Abrir registro
                      <span className="sr-only">
                        : {receivedItemLabels[item.kind]} de {patient.name},{" "}
                        {arrival(item.at)}
                      </span>
                      <span aria-hidden="true"> ↗</span>
                    </ReceivedLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
