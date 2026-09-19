"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { PatientCheckIns as PatientCheckInsData } from "@/modules/check-ins/service";
import { clinicalTime } from "./encounter-editor";
import { byteLimit, DocumentUploadForm } from "./documents-workspace";

function PatientCheckIn({
  item,
  today,
  tenant,
  patientId,
}: {
  item: PatientCheckInsData["checkIns"][number];
  today: string;
  tenant: string;
  patientId: string | null;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const measure = String(form.get("measure_value") ?? "").trim();
      const label = String(form.get("measure_label") ?? "").trim();
      const unit = String(form.get("measure_unit") ?? "").trim();
      const hasMeasure = Boolean(measure || label || unit);
      const response = await fetch(
        `/api/v1/clinics/${tenant}/check-ins/${item.id}/submission`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            report: form.get("report"),
            reported_on: form.get("reported_on"),
            measure_label: hasMeasure ? label : null,
            measure_value: measure ? Number(measure) : null,
            measure_unit: hasMeasure ? unit : null,
            confirmed: form.get("confirmed") === "on",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível enviar.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error && error.name !== "TimeoutError"
          ? error.message
          : "A conexão demorou. Atualize a página e confira se o relato foi enviado.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <article id={`check-in-${item.id}`} className="panel patient-check-in">
      <div className="section-heading">
        <div>
          <h2>
            {item.status === "pending"
              ? "Atualização solicitada"
              : "Atualização enviada"}
          </h2>
          <p>
            Solicitada em {clinicalTime(item.requested_at)}
            {item.due_on
              ? ` · responder até ${item.due_on.split("-").reverse().join("/")}`
              : ""}
          </p>
        </div>
        <span className="appointment-status scheduled">
          {item.status === "pending"
            ? "A responder"
            : item.status === "reviewed"
              ? "Revisado pela equipe"
              : "Em revisão"}
        </span>
      </div>
      <blockquote>{item.prompt}</blockquote>
      {item.submission ? (
        <div className="check-in-report">
          <span>
            Seu relato original ·{" "}
            {item.submission.reported_on.split("-").reverse().join("/")}
          </span>
          <p>{item.submission.report}</p>
          {item.submission.measure_label && (
            <p>
              <strong>Medida informada:</strong> {item.submission.measure_label}{" "}
              · {item.submission.measure_value} {item.submission.measure_unit}
            </p>
          )}
          <small>
            Recebido em {clinicalTime(item.submission.submitted_at)}. Conteúdo
            original preservado.
          </small>
        </div>
      ) : (
        <form onSubmit={submit}>
          {error && <p role="alert">{error}</p>}
          <label className="field">
            Seu relato
            <textarea
              name="report"
              rows={5}
              maxLength={4000}
              required
              disabled={pending}
            />
          </label>
          <label className="field">
            Data do relato
            <input
              name="reported_on"
              type="date"
              max={today}
              defaultValue={today}
              required
              disabled={pending}
            />
          </label>
          <fieldset className="check-in-measure">
            <legend>Medida · opcional</legend>
            <label className="field">
              Nome
              <input
                name="measure_label"
                maxLength={80}
                placeholder="Ex.: peso"
                disabled={pending}
              />
            </label>
            <label className="field">
              Valor
              <input
                name="measure_value"
                type="number"
                step="any"
                disabled={pending}
              />
            </label>
            <label className="field">
              Unidade
              <input
                name="measure_unit"
                maxLength={30}
                placeholder="Ex.: kg"
                disabled={pending}
              />
            </label>
          </fieldset>
          <label className="publication-confirm">
            <input
              type="checkbox"
              name="confirmed"
              required
              disabled={pending}
            />
            Confirmo que este relato e esta medida, quando informada, foram
            registrados por mim.
          </label>
          <button disabled={pending}>
            {pending ? "Enviando…" : "Enviar relato"}
          </button>
        </form>
      )}
      {patientId && (
        <details className="document-upload-panel">
          <summary>Enviar foto da refeição · opcional</summary>
          <p>
            Aceita PDF, JPG e PNG de até {byteLimit()}. A foto não é
            interpretada automaticamente, não gera nenhum veredito e fica
            disponível para a equipe conferir manualmente.
          </p>
          <DocumentUploadForm
            tenant={tenant}
            ownPatientId={patientId}
            category="clinical_document"
          />
        </details>
      )}
      <p className="module-footnote">
        Este registro não altera seu plano automaticamente e não é um canal de
        urgência. Em caso de necessidade, use os canais habituais da clínica.
      </p>
    </article>
  );
}

export function PatientCheckIns({
  initial,
  today,
}: {
  initial: PatientCheckInsData;
  today: string;
}) {
  const base = `/clinicas/${initial.clinic.id}/meu-cuidado/diario`;
  return (
    <div className="patient-check-ins">
      <div className="section-heading">
        <p>Responda às solicitações da equipe com suas próprias palavras.</p>
      </div>
      {initial.checkIns.length ? (
        initial.checkIns.map((item) => (
          <PatientCheckIn
            key={`${item.id}:${item.status}`}
            item={item}
            today={today}
            tenant={initial.clinic.id}
            patientId={initial.patientId}
          />
        ))
      ) : (
        <section className="panel empty">
          <h2>Nenhuma solicitação de check-in</h2>
          <p>Quando a equipe solicitar um relato, ele aparecerá aqui.</p>
        </section>
      )}
      <nav className="agenda-actions" aria-label="Páginas de check-ins">
        {initial.page > 1 && (
          <Link href={`${base}?pagina=${initial.page - 1}`}>Anterior</Link>
        )}
        {initial.hasNext && (
          <Link href={`${base}?pagina=${initial.page + 1}`}>Próxima</Link>
        )}
      </nav>
    </div>
  );
}
