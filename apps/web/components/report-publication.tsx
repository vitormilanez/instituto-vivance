"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { ReportDetail } from "@/modules/reports/service";
import { clinicalTime } from "./encounter-editor";

type Mode = "publish" | "withdraw" | "revision" | null;

export function ReportPublication({ detail }: { detail: ReportDetail }) {
  const router = useRouter();
  const busy = useRef(false);
  const [mode, setMode] = useState<Mode>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const current = detail.publications.find(
    (publication) => publication.status === "published",
  );
  const canPublish =
    detail.report.status === "approved" &&
    current?.source_version !== detail.report.version;

  function choose(next: Mode) {
    setMode(next);
    setConfirmed(false);
    setError("");
  }

  async function request(path: string, method: "POST" | "DELETE", body: unknown) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível concluir.");
      setMode(null);
      setConfirmed(false);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Atualize a página e confira o estado antes de tentar novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return;
    const data = new FormData(event.currentTarget);
    await request(
      `/api/v1/clinics/${detail.clinic.id}/reports/${detail.report.id}/publication`,
      "POST",
      {
        version: detail.report.version,
        previous_publication: current?.id ?? null,
        title: data.get("title"),
        summary: data.get("summary"),
        confirmed: true,
      },
    );
  }

  return (
    <section className="panel report-publication" aria-labelledby="report-publication-title">
      <div className="section-heading">
        <div>
          <span className="quiet-label">Portal do paciente</span>
          <h2 id="report-publication-title">O que a pessoa pode acessar</h2>
          <p>
            A publicação tem texto próprio e nunca inclui fontes, notas internas
            ou pontos reservados para a consulta.
          </p>
        </div>
      </div>

      {current ? (
        <article className="report-publication-current">
          <span className="quiet-label">Publicado</span>
          <h3>{current.patient_title}</h3>
          <p>{current.patient_summary}</p>
          <small>
            Versão {current.source_version} · publicada em{" "}
            {clinicalTime(current.published_at)}
          </small>
          <div className="report-actions">
            <a
              className="button secondary"
              href={`/api/v1/clinics/${detail.clinic.id}/report-publications/${current.id}/pdf`}
            >
              Baixar PDF publicado
            </a>
            <button className="secondary" disabled={pending} onClick={() => choose("withdraw")}>
              Retirar do portal
            </button>
          </div>
        </article>
      ) : (
        <p className="report-publication-empty">
          Nenhuma versão está disponível para o paciente.
        </p>
      )}

      {error && <p className="feedback" role="alert">{error}</p>}

      {canPublish && mode !== "publish" && (
        <button disabled={pending} onClick={() => choose("publish")}>
          {current ? "Preparar substituição" : "Preparar publicação"}
        </button>
      )}

      {mode === "publish" && (
        <form className="report-publication-form" onSubmit={publish}>
          <h3>{current ? "Substituir a publicação atual" : "Publicar para o paciente"}</h3>
          <p>
            Revise este conteúdo como uma mensagem destinada ao paciente. O
            relatório interno permanece separado.
          </p>
          <label className="field">
            Título que a pessoa verá
            <input
              name="title"
              maxLength={160}
              required
              disabled={pending}
              defaultValue={detail.report.title}
            />
          </label>
          <label className="field">
            Síntese compartilhada
            <textarea
              name="summary"
              maxLength={12000}
              required
              disabled={pending}
              defaultValue={detail.report.summary}
            />
          </label>
          <label className="publication-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo que revisei este texto para {detail.patientName} e quero
            disponibilizá-lo no portal.
          </label>
          <div className="report-actions">
            <button disabled={!confirmed || pending}>
              {pending
                ? "Publicando…"
                : current
                  ? "Confirmar substituição"
                  : "Confirmar publicação"}
            </button>
            <button type="button" className="secondary" disabled={pending} onClick={() => choose(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === "withdraw" && current && (
        <form
          className="report-publication-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!confirmed) return;
            const data = new FormData(event.currentTarget);
            void request(
              `/api/v1/clinics/${detail.clinic.id}/reports/${detail.report.id}/publication`,
              "DELETE",
              {
                publication_id: current.id,
                reason: data.get("reason"),
                confirmed: true,
              },
            );
          }}
        >
          <h3>Retirar esta publicação?</h3>
          <p>
            Ela deixará de aparecer no portal. O histórico continuará preservado.
          </p>
          <label className="field">
            Motivo interno
            <textarea name="reason" maxLength={1000} required disabled={pending} />
          </label>
          <label className="publication-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo a retirada desta publicação.
          </label>
          <div className="report-actions">
            <button disabled={!confirmed || pending}>Confirmar retirada</button>
            <button type="button" className="secondary" disabled={pending} onClick={() => choose(null)}>
              Manter publicação
            </button>
          </div>
        </form>
      )}

      {detail.report.status === "approved" && mode !== "revision" && (
        <button className="secondary" disabled={pending} onClick={() => choose("revision")}>
          Criar nova versão interna
        </button>
      )}
      {mode === "revision" && (
        <div className="report-publication-form">
          <h3>Criar uma nova versão?</h3>
          <p>
            O relatório volta a ser rascunho. Se houver uma publicação, ela
            continua disponível até a próxima substituição ou retirada.
          </p>
          <label className="publication-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo a abertura de uma nova versão interna.
          </label>
          <div className="report-actions">
            <button
              disabled={!confirmed || pending}
              onClick={() =>
                void request(
                  `/api/v1/clinics/${detail.clinic.id}/reports/${detail.report.id}/revision`,
                  "POST",
                  { version: detail.report.version, confirmed: true },
                )
              }
            >
              Abrir nova versão
            </button>
            <button className="secondary" disabled={pending} onClick={() => choose(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {detail.publications.length > 0 && (
        <details className="report-publication-history">
          <summary>Histórico de publicações</summary>
          <ol>
            {detail.publications.map((publication) => (
              <li key={publication.id}>
                <strong>
                  Versão {publication.source_version} ·{" "}
                  {publication.status === "published"
                    ? "Publicada"
                    : publication.status === "superseded"
                      ? "Substituída"
                      : "Retirada"}
                </strong>
                <span>{clinicalTime(publication.published_at)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
