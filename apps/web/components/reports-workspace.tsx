"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { ReportsList } from "@/modules/reports/service";
import { clinicalTime } from "./encounter-editor";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Aprovado internamente",
};

function reportDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function ReportsWorkspace({ initial }: { initial: ReportsList }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: data.get("patient_id"),
            period_start: data.get("period_start"),
            period_end: data.get("period_end"),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível criar o relatório.");
      router.push(`/clinicas/${initial.clinic.id}/relatorios/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar o relatório.");
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <details className="panel report-create-panel">
        <summary>Criar relatório interno</summary>
        <p>Escolha a pessoa e o período. O relatório começa como rascunho privado.</p>
        {initial.patients.length ? (
          <form className="report-create-form" onSubmit={create}>
            {error && <p role="alert">{error}</p>}
            <label className="field">
              Paciente
              <select name="patient_id" required disabled={pending}>
                {initial.patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Início do período
              <input name="period_start" type="date" required defaultValue={today} disabled={pending} />
            </label>
            <label className="field">
              Fim do período
              <input name="period_end" type="date" required defaultValue={today} disabled={pending} />
            </label>
            <button disabled={pending}>{pending ? "Criando…" : "Começar relatório"}</button>
          </form>
        ) : (
          <p>Nenhum paciente com vínculo ativo está disponível.</p>
        )}
      </details>

      <section className="report-list" aria-labelledby="reports-title">
        <div className="section-heading">
          <div>
            <h2 id="reports-title">Relatórios internos</h2>
            <p>Rascunhos e versões aprovadas para organização do cuidado.</p>
          </div>
          <span className="quiet-label">{initial.reports.length} nesta página</span>
        </div>
        {initial.reports.length ? (
          initial.reports.map((report) => (
            <article className="report-row" key={report.id}>
              <div>
                <span className="quiet-label">{statusLabels[report.status] ?? report.status}</span>
                <h3>{report.title || "Relatório sem título"}</h3>
                <p>
                  {report.patientName} · {reportDate(report.period_start)} a{" "}
                  {reportDate(report.period_end)}
                </p>
                <small>Versão {report.version} · atualizado em {clinicalTime(report.updated_at)}</small>
              </div>
              <Link className="button secondary" href={`/clinicas/${initial.clinic.id}/relatorios/${report.id}`}>
                Abrir relatório
              </Link>
            </article>
          ))
        ) : (
          <section className="panel empty">
            <h3>Nenhum relatório iniciado</h3>
            <p>Crie um rascunho para reunir fontes e preparar a próxima conversa.</p>
          </section>
        )}
      </section>
      <nav className="agenda-actions" aria-label="Páginas de relatórios">
        {initial.page > 1 && <Link href={`/clinicas/${initial.clinic.id}/relatorios?pagina=${initial.page - 1}`}>Anterior</Link>}
        {initial.hasNext && <Link href={`/clinicas/${initial.clinic.id}/relatorios?pagina=${initial.page + 1}`}>Próxima</Link>}
      </nav>
      <p className="module-footnote">A aprovação é interna. Quando houver decisão de compartilhar, a publicação exige confirmação separada e o PDF representa somente a versão publicada.</p>
    </>
  );
}
