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
const priority: Record<string, number> = { submitted: 0, pending: 1, reviewed: 2 };
const mealPromptSuggestion =
  "Conte o que você comeu hoje, com os horários e o que havia em cada refeição. Se quiser, envie junto uma foto do prato: ela não é interpretada automaticamente e fica disponível para eu conferir.";
export function CheckInWorkspace({ initial }: { initial: StaffCheckIns }) {
  const router = useRouter(),
    busy = useRef(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selectedPatient, setSelectedPatient] = useState(""),
    [promptDraft, setPromptDraft] = useState("");
  // Devolve se a operação foi concluída, para quem chama só limpar o que
  // o usuário escreveu quando o envio realmente deu certo.
  async function send(path: string, body: unknown, message: string) {
    if (busy.current) return false;
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
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "A conexão demorou. Atualize a página antes de tentar novamente.",
      );
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void send(
      `/api/v1/clinics/${initial.clinic.id}/check-ins`,
      {
        patient_id: data.get("patient_id"),
        prompt: data.get("prompt"),
        due_on: data.get("due_on") || null,
      },
      "Check-in solicitado ao paciente.",
    ).then((sent) => {
      // Em erro o texto permanece na tela; só o envio concluído limpa.
      if (sent) setPromptDraft("");
    });
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
  const visibleCheckIns = initial.checkIns
    .filter((item) => !selectedPatient || item.patient_id === selectedPatient)
    .sort((a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3));
  const submitted = visibleCheckIns.filter((item) => item.status === "submitted").length;
  const pendingRequests = visibleCheckIns.filter((item) => item.status === "pending").length;
  const reviewed = visibleCheckIns.filter((item) => item.status === "reviewed").length;

  return (
    <>
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
      <section className="check-in-board" aria-label="Fila de check-ins">
        <div className="section-heading">
          <div>
            <h2>Pedidos de check-in</h2>
            <p>Os relatos para revisar aparecem primeiro. Os números abaixo correspondem aos pedidos desta página.</p>
          </div>
        </div>
        <label className="field followup-filter">
          Filtrar por paciente
          <select value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>
            <option value="">Todos os pacientes</option>
            {initial.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.display_name}</option>)}
          </select>
        </label>
        <dl className="check-in-summary" aria-label="Resumo da fila">
          <div><dt>Para revisar</dt><dd>{submitted}</dd></div>
          <div><dt>Aguardando resposta</dt><dd>{pendingRequests}</dd></div>
          <div><dt>Revisados</dt><dd>{reviewed}</dd></div>
        </dl>
        {visibleCheckIns.length ? (
          visibleCheckIns.map((item) => (
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
            <h3>Nenhum check-in para este filtro</h3>
            <p>Escolha outro paciente ou avance a página para ver mais pedidos.</p>
          </section>
        )}
      </section>
      <details className="panel check-in-request">
        <summary>Solicitar check-in</summary>
        <p>Envie uma pergunta manual para um paciente sob sua responsabilidade.</p>
        {initial.patients.length ? (
          <form onSubmit={request}>
            <label className="field">
              Paciente
              <select name="patient_id" required disabled={pending}>
                {initial.patients.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className="button secondary prompt-suggestion"
              disabled={pending}
              onClick={() => setPromptDraft(mealPromptSuggestion)}
            >
              Usar sugestão para registro de refeição
            </button>
            <label className="field">
              Pergunta
              <textarea
                name="prompt"
                required
                minLength={2}
                maxLength={1000}
                rows={3}
                disabled={pending}
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.currentTarget.value)}
              />
            </label>
            <label className="field">
              Responder até · opcional
              <input type="date" name="due_on" disabled={pending} />
            </label>
            <button disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação"}</button>
          </form>
        ) : <p>Nenhum paciente com vínculo ativo disponível.</p>}
      </details>
      <nav className="agenda-actions" aria-label="Páginas de check-ins">
        {initial.page > 1 && (
          <Link href={`?aba=check-ins&pagina=${initial.page - 1}`}>Anterior</Link>
        )}
        {initial.hasNext && (
          <Link href={`?aba=check-ins&pagina=${initial.page + 1}`}>Próxima</Link>
        )}
      </nav>
    </>
  );
}
