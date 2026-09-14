"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type {
  PatientReturnPreparations,
  StaffReturnPreparations,
} from "@/modules/return-preparation/service";
import { clinicalTime } from "./encounter-editor";

const statusLabels: Record<string, string> = {
  requested: "Solicitado",
  draft: "Rascunho",
  submitted: "Enviado",
  reviewed: "Revisado",
  cancelled: "Cancelado",
};

function appointmentDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function answerRecord(value: unknown): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

async function mutation(path: string, method: "POST" | "PUT", body: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string; version?: number };
  if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir.");
  return result;
}

function PatientPreparation({
  item,
  tenantId,
}: {
  item: PatientReturnPreparations["preparations"][number];
  tenantId: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const original = answerRecord(item.draft?.answers ?? item.submission?.answers);
  const [answers, setAnswers] = useState<Record<string, string>>(original);
  const [draftVersion, setDraftVersion] = useState(item.draft?.version ?? 0);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const editable = item.status === "requested" || item.status === "draft";
  const body = () => ({
    version: draftVersion,
    answers: Object.fromEntries(Object.entries(answers).filter(([, value]) => value.trim())),
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback("");
    try {
      const result = await mutation(
        `/api/v1/clinics/${tenantId}/return-preparations/${item.id}/draft`,
        "PUT",
        body(),
      );
      setDraftVersion(result.version!);
      setFeedback("Rascunho salvo. Você pode continuar depois.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function submit() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback("");
    try {
      await mutation(
        `/api/v1/clinics/${tenantId}/return-preparations/${item.id}/submission`,
        "POST",
        { ...body(), confirmed: true },
      );
      setFeedback("Respostas enviadas. O conteúdo original foi preservado.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <article className="panel preparation-card" id={`preparo-${item.id}`}>
      <div className="preparation-heading">
        <div>
          <h2>{item.questionnaire.title}</h2>
          <p>
            Retorno em {appointmentDate(item.appointments.starts_at)} · {item.appointments.doctor_display_name}
          </p>
        </div>
        <span className={`preparation-status ${item.status}`}>{statusLabels[item.status]}</span>
      </div>
      {item.status === "cancelled" && !item.submission ? (
        <div className="preparation-closed">
          <h3>Solicitação encerrada</h3>
          <p>O compromisso foi cancelado. O histórico e eventual envio continuam preservados.</p>
        </div>
      ) : editable ? (
        <form onSubmit={save}>
          <p className="preparation-guidance">
            Responda com suas palavras. Todas as perguntas são opcionais; campos vazios serão pulados.
          </p>
          <fieldset disabled={pending}>
            {item.questionnaire.questions.map((question) => (
              <label className="field" key={question.id}>
                {question.label} <span>Opcional</span>
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                />
              </label>
            ))}
          </fieldset>
          {feedback && <p className={feedback.startsWith("Rascunho") ? "notice" : "feedback"} role="status">{feedback}</p>}
          <label className="publication-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo o envio final. Depois disso, as respostas não poderão ser alteradas.
          </label>
          <div className="agenda-actions">
            <button disabled={pending}>{pending ? "Salvando…" : "Salvar rascunho"}</button>
            <button className="secondary" type="button" disabled={pending || !confirmed} onClick={submit}>
              {pending ? "Aguarde…" : "Confirmar e enviar uma vez"}
            </button>
          </div>
          <p className="module-footnote">Depois do envio, as respostas não poderão ser alteradas. Isso não muda suas orientações médicas.</p>
        </form>
      ) : (
        <div className="preparation-readonly">
          {item.questionnaire.questions.map((question) => (
            <div key={question.id}>
              <h3>{question.label}</h3>
              <p>{original[question.id] || "Pergunta pulada"}</p>
            </div>
          ))}
          <p className="module-footnote">
            Enviado em {clinicalTime(item.submission!.submitted_at)} · relato original preservado.
            {item.status === "reviewed"
              ? " A equipe confirmou a revisão."
              : item.status === "cancelled"
                ? " A solicitação foi encerrada com a consulta; seu envio continua no histórico."
                : " Aguardando revisão da equipe."}
          </p>
        </div>
      )}
    </article>
  );
}

export function PatientReturnPreparationWorkspace({ initial }: { initial: PatientReturnPreparations }) {
  const base = `/clinicas/${initial.clinic.id}/meu-cuidado/hoje`;
  return (
    <section className="preparation-workspace" aria-labelledby="patient-preparation-title">
      <div className="section-heading">
        <div>
          <h2 id="patient-preparation-title">Prepare seu retorno</h2>
          <p>Um roteiro curto para ajudar a aproveitar a próxima conversa.</p>
        </div>
      </div>
      {initial.preparations.length ? initial.preparations.map((item) => (
        <PatientPreparation key={`${item.id}:${item.version}`} item={item} tenantId={initial.clinic.id} />
      )) : (
        <div className="panel empty"><h3>Nenhum preparo solicitado</h3><p>Quando seu médico pedir uma atualização para um retorno, ela aparecerá aqui.</p></div>
      )}
      <nav className="agenda-actions" aria-label="Páginas de preparos">
        {initial.page > 1 && <Link href={`${base}?pagina=${initial.page - 1}`}>Anterior</Link>}
        {initial.hasNext && <Link href={`${base}?pagina=${initial.page + 1}`}>Próxima</Link>}
      </nav>
    </section>
  );
}

export function StaffReturnPreparationWorkspace({ initial }: { initial: StaffReturnPreparations }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function review(event: FormEvent<HTMLFormElement>, id: string, version: number) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback("");
    const form = new FormData(event.currentTarget);
    try {
      await mutation(`/api/v1/clinics/${initial.clinic.id}/return-preparations/${id}/review`, "POST", {
        version,
        note: form.get("note"),
        confirmed: form.get("confirmed") === "on",
      });
      setFeedback("Revisão interna registrada. O relato original não foi alterado.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível revisar.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <section className="preparation-workspace" aria-label="Preparos de retorno">
      {feedback && <p className={feedback.startsWith("Revisão") ? "notice" : "feedback"} role="status">{feedback}</p>}
      {initial.preparations.length ? initial.preparations.map((item) => {
        const answers = answerRecord(item.submission?.answers);
        return (
          <article className="panel preparation-card" key={`${item.id}:${item.version}`} id={`preparo-${item.id}`}>
            <div className="preparation-heading">
              <div>
                <h2>{item.patients?.display_name ?? "Paciente"}</h2>
                <p>Retorno em {appointmentDate(item.appointments.starts_at)} · roteiro v{item.questionnaire_version}</p>
              </div>
              <span className={`preparation-status ${item.status}`}>{statusLabels[item.status]}</span>
            </div>
            {item.submission ? (
              <div className="preparation-review-grid">
                <div className="preparation-readonly">
                  {item.questionnaire.questions.map((question) => (
                    <div key={question.id}><h3>{question.label}</h3><p>{answers[question.id] || "Pergunta pulada"}</p></div>
                  ))}
                  <p className="module-footnote">Relato original enviado em {clinicalTime(item.submission.submitted_at)}.</p>
                </div>
                {item.review ? (
                  <aside className="preparation-review-note"><h3>Revisão interna</h3><p>{item.review.note}</p><small>{clinicalTime(item.review.reviewed_at)}</small></aside>
                ) : item.status === "cancelled" ? (
                  <aside className="preparation-review-note"><h3>Solicitação encerrada</h3><p>O compromisso foi cancelado. O envio segue preservado no histórico.</p></aside>
                ) : (
                  <form onSubmit={(event) => review(event, item.id, item.version)}>
                    <label className="field">Nota interna da revisão<textarea name="note" rows={5} maxLength={2000} required disabled={pending} /></label>
                    <label className="publication-confirm"><input type="checkbox" name="confirmed" required disabled={pending} />Confirmo que revisei o relato original. Esta nota é interna.</label>
                    <button disabled={pending}>{pending ? "Registrando…" : "Registrar revisão"}</button>
                  </form>
                )}
              </div>
            ) : (
              <div className="preparation-closed"><h3>{item.status === "cancelled" ? "Solicitação encerrada" : "Aguardando paciente"}</h3><p>{item.status === "draft" ? "Há um rascunho privado em andamento. O conteúdo só ficará visível após o envio." : item.status === "cancelled" ? "O compromisso foi cancelado; o histórico foi preservado." : "O paciente ainda não iniciou ou enviou as respostas."}</p></div>
            )}
          </article>
        );
      }) : (
        <div className="panel empty"><h2>Nenhum preparo de retorno</h2><p>Solicite o preparo em um retorno futuro na Agenda.</p></div>
      )}
      <nav className="agenda-actions" aria-label="Páginas de preparos">
        {initial.page > 1 && <Link href={`/clinicas/${initial.clinic.id}/preparo?pagina=${initial.page - 1}`}>Anterior</Link>}
        {initial.hasNext && <Link href={`/clinicas/${initial.clinic.id}/preparo?pagina=${initial.page + 1}`}>Próxima</Link>}
      </nav>
    </section>
  );
}
