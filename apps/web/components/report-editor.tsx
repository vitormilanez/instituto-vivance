"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { ReportDetail } from "@/modules/reports/service";
import { clinicalTime } from "./encounter-editor";
import { ReportPublication } from "./report-publication";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em revisão médica",
  approved: "Aprovado internamente",
};

function reportDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function ReportEditor({ initial }: { initial: ReportDetail }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const selectedSources = new Set(
    initial.sources.map((source) => `${source.source_type}:${source.source_id}`),
  );
  const editable = initial.report.status === "draft";

  async function returnToDraft() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/reports/${initial.report.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: initial.report.version,
            status: "draft",
            title: initial.report.title,
            summary: initial.report.summary,
            consultation_points: initial.report.consultation_points,
            sources: initial.sources.map((source) => ({
              type: source.source_type,
              id: source.source_id,
            })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível reabrir o rascunho.");
      setNotice("Relatório reaberto para edição.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível reabrir o rascunho.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function save(form: HTMLFormElement, status: "draft" | "in_review") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    const data = new FormData(form);
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/reports/${initial.report.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: initial.report.version,
            status,
            title: data.get("title"),
            summary: data.get("summary"),
            consultation_points: data.get("consultation_points"),
            sources: data.getAll("sources").map((value) => {
              const [type, id] = String(value).split(":");
              return { type, id };
            }),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível salvar o relatório.");
      setNotice(status === "draft" ? "Rascunho salvo." : "Relatório enviado para revisão.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o relatório.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function approve() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/reports/${initial.report.id}/approval`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: initial.report.version, confirmed: true }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível aprovar o relatório.");
      setConfirming(false);
      setNotice("Relatório aprovado e mantido como registro interno.");
      router.refresh();
    } catch (reason) {
      setConfirming(false);
      setError(reason instanceof Error ? reason.message : "Não foi possível aprovar o relatório.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Link className="back-link" href={`/clinicas/${initial.clinic.id}/relatorios`}>← Voltar aos relatórios</Link>
      <header className="page-heading report-heading">
        <div>
          <span className="quiet-label">{statusLabels[initial.report.status]}</span>
          <h1>{initial.report.title || "Novo relatório"}</h1>
          <p>
            {initial.patientName} · {reportDate(initial.report.period_start)} a{" "}
            {reportDate(initial.report.period_end)} · versão {initial.report.version}
          </p>
        </div>
      </header>
      {error && <p className="feedback" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <section className="report-workflow" aria-label="Estado do relatório">
        <div>
          <strong>Registro interno</strong>
          <span>{statusLabels[initial.report.status]}</span>
        </div>
        <div>
          <strong>Portal do paciente</strong>
          <span>A publicação, se necessária, é confirmada separadamente.</span>
        </div>
      </section>

      <form className="panel report-editor" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(event.currentTarget, "draft"); }}>
        <label className="field">
          Título
          <input name="title" maxLength={160} defaultValue={initial.report.title} disabled={!editable || pending} placeholder="Ex.: Acompanhamento de setembro" />
        </label>
        <label className="field">
          Síntese do período
          <textarea name="summary" maxLength={12000} defaultValue={initial.report.summary} disabled={!editable || pending} placeholder="Organize os fatos relevantes sem criar conclusões automáticas." />
        </label>
        <label className="field">
          Pontos para a próxima consulta
          <textarea name="consultation_points" maxLength={6000} defaultValue={initial.report.consultation_points} disabled={!editable || pending} placeholder="Liste dúvidas, lacunas e assuntos que precisam de avaliação médica." />
        </label>
        <fieldset className="report-sources" disabled={!editable || pending}>
          <legend>Fontes incluídas</legend>
          <p>Escolha registros reais deste paciente e período.</p>
          {initial.candidates.length ? initial.candidates.map((source) => (
            <label key={`${source.type}:${source.id}`}>
              <input type="checkbox" name="sources" value={`${source.type}:${source.id}`} defaultChecked={selectedSources.has(`${source.type}:${source.id}`)} />
              <span><strong>{source.label}</strong><small>{clinicalTime(source.occurredAt)} · {source.detail}</small></span>
            </label>
          )) : <p>Nenhuma fonte disponível neste período.</p>}
        </fieldset>
        {editable && (
          <div className="report-actions">
            <button disabled={pending}>{pending ? "Salvando…" : "Salvar rascunho"}</button>
            {initial.report.status === "draft" && (
              <button type="button" className="secondary" disabled={pending} onClick={(event) => { if (event.currentTarget.form) void save(event.currentTarget.form, "in_review"); }}>
                Enviar para revisão
              </button>
            )}
          </div>
        )}
        {initial.report.status === "in_review" && (
          <div className="report-actions">
            <button type="button" disabled={pending} onClick={() => setConfirming(true)}>
              Revisar e aprovar
            </button>
            <button type="button" className="secondary" disabled={pending} onClick={() => void returnToDraft()}>
              Voltar ao rascunho
            </button>
          </div>
        )}
      </form>

      {confirming && (
        <section className="panel report-approval" aria-labelledby="report-approval-title">
          <h2 id="report-approval-title">Aprovar esta versão?</h2>
          <p>O conteúdo e as fontes ficarão preservados. Esta aprovação ainda não publica nada para o paciente.</p>
          <div className="report-actions">
            <button disabled={pending} onClick={() => void approve()}>Confirmar aprovação</button>
            <button className="secondary" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        </section>
      )}

      <ReportPublication detail={initial} />

      <section className="report-history" aria-labelledby="report-history-title">
        <div className="section-heading"><h2 id="report-history-title">Histórico de versões</h2></div>
        <ol>
          {initial.versions.map((version) => (
            <li key={version.id}>
              <strong>Versão {version.version} · {statusLabels[version.status] ?? version.status}</strong>
              <span>{clinicalTime(version.created_at)}</span>
              <small>{Array.isArray(version.sources) ? version.sources.length : 0} fontes preservadas</small>
            </li>
          ))}
        </ol>
      </section>
      <p className="module-footnote">O relatório interno e suas fontes permanecem privados. O paciente recebe somente o texto confirmado na publicação.</p>
    </>
  );
}
