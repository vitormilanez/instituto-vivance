"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { StaffCheckIns } from "@/modules/check-ins/service";
import { clinicalTime } from "./encounter-editor";

const labels: Record<string, string> = {
  pending: "Aguardando paciente",
  submitted: "Aguardando revisão",
  reviewed: "Revisado",
};
export function CheckInWorkspace({ initial }: { initial: StaffCheckIns }) {
  const router = useRouter(),
    busy = useRef(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function send(path: string, body: unknown, message: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify(body),
        }),
        data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível concluir.");
      setNotice(message);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "A conexão demorou. Atualize a página antes de tentar novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send(
      `/api/v1/clinics/${initial.clinic.id}/check-ins`,
      {
        patient_id: form.get("patient_id"),
        prompt: form.get("prompt"),
        due_on: form.get("due_on") || null,
      },
      "Check-in solicitado ao paciente.",
    );
  }
  function review(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send(
      `/api/v1/clinics/${initial.clinic.id}/check-ins/${id}/review`,
      { note: form.get("note"), confirmed: form.get("confirmed") === "on" },
      "Revisão registrada.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Acompanhamento</h1>
          <p>Relatos recebidos entre consultas, com origem e revisão humana.</p>
        </div>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <details className="panel check-in-request">
        <summary>Solicitar check-in</summary>
        <p>
          Envie uma pergunta manual para um paciente sob sua responsabilidade.
        </p>
        {initial.patients.length ? (
          <form onSubmit={request}>
            <label className="field">
              Paciente
              <select name="patient_id" required disabled={pending}>
                {initial.patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Pergunta
              <textarea
                name="prompt"
                required
                minLength={2}
                maxLength={1000}
                rows={3}
                disabled={pending}
              />
            </label>
            <label className="field">
              Responder até · opcional
              <input type="date" name="due_on" disabled={pending} />
            </label>
            <button disabled={pending}>
              {pending ? "Enviando…" : "Enviar solicitação"}
            </button>
          </form>
        ) : (
          <p>Nenhum paciente com vínculo ativo disponível.</p>
        )}
      </details>
      <section className="check-in-board" aria-label="Fila de check-ins">
        <div className="section-heading">
          <h2>Fila de revisão</h2>
          <span className="quiet-label">
            {initial.checkIns.length} nesta página
          </span>
        </div>
        {initial.checkIns.length ? (
          initial.checkIns.map((item) => (
            <article
              id={`check-in-${item.id}`}
              className={`panel check-in-card ${item.status}`}
              key={item.id}
            >
              <div className="section-heading">
                <div>
                  <h3>{item.patients?.display_name ?? "Paciente"}</h3>
                  <p>
                    Solicitado em {clinicalTime(item.requested_at)}
                    {item.due_on
                      ? ` · responder até ${item.due_on.split("-").reverse().join("/")}`
                      : ""}
                  </p>
                </div>
                <span className="appointment-status scheduled">
                  {labels[item.status] ?? item.status}
                </span>
              </div>
              <blockquote>{item.prompt}</blockquote>
              {item.submission && (
                <div className="check-in-report">
                  <span>
                    Relato do paciente ·{" "}
                    {item.submission.reported_on.split("-").reverse().join("/")}
                  </span>
                  <p>{item.submission.report}</p>
                  {item.submission.measure_label && (
                    <p>
                      <strong>Medida informada:</strong>{" "}
                      {item.submission.measure_label} ·{" "}
                      {item.submission.measure_value}{" "}
                      {item.submission.measure_unit}
                    </p>
                  )}
                  <small>
                    Recebido em {clinicalTime(item.submission.submitted_at)}.
                    Conteúdo original preservado.
                  </small>
                </div>
              )}
              {item.status === "submitted" && (
                <form
                  className="check-in-review"
                  onSubmit={(e) => review(e, item.id)}
                >
                  <label className="field">
                    Registro interno da revisão
                    <textarea
                      name="note"
                      required
                      maxLength={2000}
                      rows={3}
                      disabled={pending}
                    />
                  </label>
                  <label className="publication-confirm">
                    <input
                      type="checkbox"
                      name="confirmed"
                      required
                      disabled={pending}
                    />
                    Confirmo que revisei este relato. Isso não altera o plano
                    automaticamente.
                  </label>
                  <button disabled={pending}>
                    {pending ? "Registrando…" : "Registrar revisão"}
                  </button>
                </form>
              )}
              {item.review && (
                <div className="check-in-review-note">
                  <strong>Revisão da equipe</strong>
                  <p>{item.review.note}</p>
                  <small>
                    Registrada em {clinicalTime(item.review.reviewed_at)}.
                  </small>
                </div>
              )}
            </article>
          ))
        ) : (
          <section className="panel empty">
            <h3>Nenhum check-in nesta página</h3>
            <p>As solicitações e respostas reais aparecerão aqui.</p>
          </section>
        )}
      </section>
      <nav className="agenda-actions" aria-label="Páginas de check-ins">
        {initial.page > 1 && (
          <Link href={`?pagina=${initial.page - 1}`}>Anterior</Link>
        )}
        {initial.hasNext && (
          <Link href={`?pagina=${initial.page + 1}`}>Próxima</Link>
        )}
      </nav>
    </>
  );
}
