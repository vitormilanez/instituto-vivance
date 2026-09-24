"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PatientReturnPreparations } from "@/modules/return-preparation/service";
import { preparationTopics } from "@/modules/return-preparation/questionnaire";
import { Icon } from "./icons";

type Item = PatientReturnPreparations["preparations"][number];

function answerRecord(value: unknown): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

// A pergunta do roteiro vira título + apoio: até o primeiro "?" é o título.
export function splitQuestion(label: string) {
  const index = label.indexOf("?");
  if (index < 0 || index === label.length - 1) return { title: label, hint: "" };
  return { title: label.slice(0, index + 1).trim(), hint: label.slice(index + 1).trim() };
}

const shortLabels: Record<string, string> = {
  goal: "Assunto principal",
  changes: "O que mudou",
  routine: "Rotina",
  treatment: "O que está seguindo",
  questions: "Dúvidas",
};

// Pré-consulta: começa pelo que a pessoa já registrou, depois uma pergunta por
// tela, prioridades opcionais e a revisão. O rascunho é salvo a cada passo e
// fica privado até o envio.
export function PreparationFlow({
  item,
  tenantId,
  base,
  summary,
  whenLabel,
}: {
  item: Item;
  tenantId: string;
  base: string;
  summary: { label: string; value: string }[];
  whenLabel: string;
}) {
  const router = useRouter();
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const historyGuard = useRef(false);
  const allowLeave = useRef(false);
  const questions = item.questionnaire.questions as { id: string; label: string }[];
  const busy = useRef(false);
  const initialView = useRef(true);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(answerRecord(item.draft?.answers));
  const [priorities, setPriorities] = useState<string[]>(item.draft?.priorities ?? []);
  const [version, setVersion] = useState(item.draft?.version ?? 0);
  const [savedAt, setSavedAt] = useState<string | null>(item.draft ? "antes" : null);
  const [dirty, setDirty] = useState(false);
  const firstOpen = questions.findIndex((question) => !answers[question.id]?.trim());
  const [step, setStep] = useState(summary.length ? 0 : Math.max(1, firstOpen + 1));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const firstStep = summary.length ? 0 : 1;
  const total = questions.length + 3 - firstStep; // resumo, se houver + perguntas + prioridades + revisão
  const answered = questions.filter((question) => answers[question.id]?.trim()).length;
  const complete = answered === questions.length;

  useEffect(() => {
    if (initialView.current) {
      initialView.current = false;
      return;
    }
    const heading = sent ? sentHeading.current : stepHeading.current;
    heading?.closest(".pv-checkin, .pv-done")?.scrollIntoView({ block: "start", behavior: "instant" });
    heading?.focus({ preventScroll: true });
  }, [sent, step]);

  useEffect(() => {
    if (!dirty || sent) {
      if (historyGuard.current && window.history.state?.pvDraftGuard) {
        historyGuard.current = false;
        window.history.back();
      }
      return;
    }
    const currentUrl = window.location.href;
    const guardState = { ...window.history.state, pvDraftGuard: true };
    if (!historyGuard.current) {
      window.history.pushState(guardState, "", currentUrl);
      historyGuard.current = true;
    }
    const warn = (event: BeforeUnloadEvent) => { if (!allowLeave.current) { event.preventDefault(); event.returnValue = ""; } };
    const link = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || allowLeave.current || anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy.current) setLeaveHref(anchor.href);
    };
    const back = (event: PopStateEvent) => {
      if (allowLeave.current) return;
      // The extra same-document entry catches Back before Next changes the page.
      event.stopImmediatePropagation();
      window.history.pushState(guardState, "", currentUrl);
      if (!busy.current) setLeaveHref("history-back");
    };
    window.addEventListener("popstate", back, true);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", link, true);
    return () => { window.removeEventListener("popstate", back, true); window.removeEventListener("beforeunload", warn); document.removeEventListener("click", link, true); };
  }, [dirty, sent]);

  function leave(href: string) {
    allowLeave.current = true;
    const guarded = historyGuard.current;
    historyGuard.current = false;
    setLeaveHref(null);
    if (href === "history-back") window.history.go(guarded ? -2 : -1);
    else if (guarded) router.replace(href);
    else router.push(href);
  }

  useEffect(() => {
    if (leaveHref) leaveDialog.current?.showModal();
    else leaveDialog.current?.close();
  }, [leaveHref]);

  const body = () => ({
    version,
    answers: Object.fromEntries(Object.entries(answers).filter(([, value]) => value.trim())),
    priorities,
  });

  async function call(path: string, method: "PUT" | "POST", payload: unknown) {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string; version?: number };
    if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir.");
    return result;
  }

  async function saveDraft() {
    if (!dirty) return true;
    try {
      const result = await call(`/api/v1/clinics/${tenantId}/return-preparations/${item.id}/draft`, "PUT", body());
      setVersion(result.version!);
      setSavedAt("agora");
      setDirty(false);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o rascunho. Suas respostas continuam aqui.");
      return false;
    }
  }

  async function go(next: number) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    if (await saveDraft()) setStep(next);
    busy.current = false;
    setPending(false);
  }

  async function saveAndLeave(href = `${base}/hoje`) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    if (await saveDraft()) {
      leave(href);
      router.refresh();
    } else setLeaveHref(null);
    busy.current = false;
    setPending(false);
  }

  async function send() {
    if (busy.current || !complete) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      // Tocar em "Enviar pré-consulta", depois da revisão, é a confirmação.
      await call(`/api/v1/clinics/${tenantId}/return-preparations/${item.id}/submission`, "POST", { ...body(), confirmed: true });
      setSent(
        new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Seu rascunho está salvo; tente de novo.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (sent)
    return (
      <div className="pv-stack pv-done">
        <span className="pv-done-icon" aria-hidden="true"><Icon name="check" size={32} /></span>
        <h2 className="pv-big" tabIndex={-1} ref={sentHeading}>Pré-consulta enviada</h2>
        <p className="pv-lead">Suas respostas ficaram registradas para a consulta {whenLabel}, do jeito que você escreveu.</p>
        <p className="pv-sent-when"><Icon name="check" size={16} /> Enviado {sent}</p>
        <Link className="pv-button is-center" href={`${base}/hoje`}>Voltar para o início</Link>
      </div>
    );

  const question = step >= 1 && step <= questions.length ? questions[step - 1] : null;
  const text = question ? splitQuestion(question.label) : null;

  return (
    <div className="pv-checkin">
      <div className="pv-progress" aria-hidden="true">
        {Array.from({ length: total }, (_, position) => (
          <span key={position} className={position <= step - firstStep ? "is-done" : undefined} />
        ))}
      </div>
      <p className="pv-muted pv-progress-label">
        Pré-consulta · consulta {whenLabel}
        {dirty ? " · alterações ainda não salvas" : savedAt ? " · rascunho salvo" : ""}
      </p>

      {step === 0 && (
        <>
          <div className="pv-stack pv-tight">
            <h2 className="pv-big" tabIndex={-1} ref={stepHeading}>Primeiro, confira o que você já registrou</h2>
            <p className="pv-lead">Desde a última consulta. Assim você não precisa escrever tudo de novo.</p>
          </div>
          <div className="pv-card">
            <dl className="pv-summary">
              {summary.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <button type="button" className="pv-link" onClick={() => setStep(questions.findIndex((item) => item.id === "changes") + 1 || 1)}>
            Quero corrigir ou acrescentar algo
          </button>
        </>
      )}

      {question && text && (
        <>
          <div className="pv-stack pv-tight">
            <p className="pv-eyebrow">Pergunta {step} de {questions.length}</p>
            <h2 className="pv-big pv-prep-question" id="pv-prep-question" tabIndex={-1} ref={stepHeading}>{text.title}</h2>
            {text.hint && <p className="pv-lead">{text.hint}</p>}
          </div>
          <label className="pv-field">
            <span className="pv-visually-hidden">{text.title}</span>
            <textarea
              rows={5}
              maxLength={4000}
              value={answers[question.id] ?? ""}
              onChange={(event) => {
                setAnswers({ ...answers, [question.id]: event.target.value });
                setDirty(true);
              }}
              disabled={pending}
            />
            <small>
              {answers[question.id]?.trim()
                ? "Só você vê até enviar."
                : "Resposta necessária para enviar. Pode continuar e voltar depois."}
            </small>
          </label>
        </>
      )}

      {step === questions.length + 1 && (
        <>
          <div className="pv-stack pv-tight">
            <p className="pv-eyebrow">Opcional</p>
            <h2 className="pv-big" tabIndex={-1} ref={stepHeading}>O que você quer priorizar na conversa?</h2>
            <p className="pv-lead">Toque em até 3, na ordem de importância.</p>
          </div>
          <div className="pv-chips">
            {preparationTopics.map((topic) => {
              const order = priorities.indexOf(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  className="pv-chip"
                  aria-pressed={order >= 0}
                  disabled={pending || (order < 0 && priorities.length >= 3)}
                  onClick={() => {
                    setPriorities(order >= 0 ? priorities.filter((id) => id !== topic.id) : [...priorities, topic.id]);
                    setDirty(true);
                  }}
                >
                  {order >= 0 && <span className="pv-order">{order + 1}</span>}
                  {topic.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === questions.length + 2 && (
        <>
          <div className="pv-stack pv-tight">
            <h2 className="pv-big" tabIndex={-1} ref={stepHeading}>Revise e envie</h2>
            <p className="pv-lead">Só você vê este rascunho até enviar.</p>
          </div>
          <ul className="pv-card pv-review">
            {questions.map((item, index) => {
              const value = answers[item.id]?.trim();
              return (
                <li key={item.id}>
                  <span>
                    <strong>{shortLabels[item.id] ?? `Pergunta ${index + 1}`}</strong>
                    <small className={value ? undefined : "pv-missing"}>{value || "Falta responder"}</small>
                  </span>
                  <button type="button" className="pv-link" onClick={() => setStep(index + 1)}>
                    {value ? "Editar" : "Responder"}
                  </button>
                </li>
              );
            })}
            <li>
              <span>
                <strong>Prioridades</strong>
                <small>
                  {priorities.length
                    ? priorities.map((id, index) => `${index + 1}. ${preparationTopics.find((topic) => topic.id === id)?.label}`).join("  ")
                    : "Nenhuma escolhida (opcional)"}
                </small>
              </span>
              <button type="button" className="pv-link" onClick={() => setStep(questions.length + 1)}>Editar</button>
            </li>
          </ul>
        </>
      )}

      {error && <p className="pv-form-error" role="alert">{error}</p>}
      {step > firstStep && <button type="button" className="pv-link" disabled={pending} onClick={() => saveAndLeave()}>Salvar e sair</button>}
      <dialog ref={leaveDialog} className="pv-leave-dialog" aria-labelledby="pv-leave-title" onCancel={(event) => { event.preventDefault(); if (!pending) setLeaveHref(null); }}>
        <div className="pv-stack">
          <h2 id="pv-leave-title">Salvar antes de sair?</h2>
          <p>A resposta desta etapa ainda não foi salva.</p>
          <button type="button" className="pv-button is-center" disabled={pending} onClick={() => saveAndLeave(leaveHref ?? `${base}/hoje`)}>Salvar e sair</button>
          <button type="button" className="pv-link" disabled={pending} onClick={() => setLeaveHref(null)}>Continuar respondendo</button>
          <button type="button" className="pv-link" disabled={pending} onClick={() => { const href = leaveHref; setDirty(false); if (href) leave(href); }}>Descartar alterações desta etapa e sair</button>
        </div>
      </dialog>

      <div className="pv-checkin-actions">
        {step > firstStep ? (
          <button type="button" className="pv-link" onClick={() => go(step - 1)} disabled={pending}>Voltar</button>
        ) : (
          <button type="button" className="pv-link" disabled={pending} onClick={() => saveAndLeave()}>Salvar e sair</button>
        )}
      </div>
      {step === questions.length + 2 ? (
        <button type="button" className="pv-button is-center" disabled={pending || !complete} aria-disabled={!complete} onClick={send}>
          {pending ? "Enviando…" : complete ? "Enviar pré-consulta" : `Faltam ${questions.length - answered} respostas`}
        </button>
      ) : (
        <button type="button" className="pv-button is-center" disabled={pending} onClick={() => go(step + 1)}>
          {pending ? "Salvando…" : step === 0 ? "Está certo, continuar" : "Continuar"}
        </button>
      )}
    </div>
  );
}
