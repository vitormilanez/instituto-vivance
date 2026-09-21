"use client";

import { useRef, useState } from "react";
import type { PatientIntakeContext } from "@/modules/patient-intake/types";
import { PatientIntakeSummary } from "./patient-intake-summary";

export function PatientIntakePanel({
  tenantId,
  patientId,
  initial,
  canEdit,
  focusOnLoad = false,
}: {
  tenantId: string;
  patientId: string;
  initial: PatientIntakeContext;
  canEdit: boolean;
  focusOnLoad?: boolean;
}) {
  const [record, setRecord] = useState(initial);
  const [reason, setReason] = useState(initial.reason);
  const [expectedOutcome, setExpectedOutcome] = useState(initial.expectedOutcome);
  const [firstPriority, setFirstPriority] = useState(initial.firstPriority);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const outcomeRef = useRef<HTMLTextAreaElement>(null);
  const priorityRef = useRef<HTMLTextAreaElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "draft" ? "draft" : "complete";
    const form = new FormData(event.currentTarget);
    const confirmed = form.get("confirmPatientWords") === "on";
    if (intent === "complete") {
      const missing = [
        [reason, reasonRef, "Informe o que fez o paciente procurar o Vivance."],
        [expectedOutcome, outcomeRef, "Informe o que o paciente espera melhorar."],
        [firstPriority, priorityRef, "Informe o assunto mais importante para conversar primeiro."],
      ] as const;
      const firstMissing = missing.find(([value]) => !value.trim());
      if (firstMissing) {
        setError(firstMissing[2]);
        firstMissing[1].current?.focus();
        return;
      }
      if (!confirmed) {
        setError("Confirme que o registro representa as palavras do paciente.");
        confirmationRef.current?.focus();
        return;
      }
    }
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/patients/${patientId}/intake`,
        {
          method: "PATCH",
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: record.version,
            reason,
            expectedOutcome,
            firstPriority,
            intent,
            confirmPatientWords: confirmed,
          }),
        },
      );
      const body = (await response.json()) as {
        intake?: PatientIntakeContext;
        error?: string;
      };
      if (!response.ok || !body.intake)
        throw new Error(body.error || "Não foi possível salvar o acolhimento.");
      setRecord(body.intake);
      setReason(body.intake.reason);
      setExpectedOutcome(body.intake.expectedOutcome);
      setFirstPriority(body.intake.firstPriority);
      setNotice(
        intent === "draft"
          ? "Rascunho salvo. Você pode continuar depois."
          : "Acolhimento concluído e disponível no preparo da consulta.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Suas respostas continuam nesta tela.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const form = (
    <form className="patient-intake-form" onSubmit={submit}>
      <fieldset disabled={pending}>
        <legend>O que você busca neste cuidado?</legend>
        <p>
          Leva cerca de dois minutos. Registre apenas o que o paciente relatou;
          os detalhes podem ser completados depois.
        </p>
        <label htmlFor="intake-reason">
          O que fez você procurar o Vivance agora?
        </label>
        <textarea
          ref={reasonRef}
          autoFocus={focusOnLoad && record.status === "draft"}
          id="intake-reason"
          rows={3}
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-required="true"
        />
        <small>Use as palavras do paciente.</small>

        <label htmlFor="intake-outcome">
          O que você espera melhorar ou conseguir com o acompanhamento?
        </label>
        <textarea
          ref={outcomeRef}
          id="intake-outcome"
          rows={3}
          maxLength={2000}
          value={expectedOutcome}
          onChange={(event) => setExpectedOutcome(event.target.value)}
          aria-required="true"
        />
        <small>Pode ser algo de saúde, rotina ou bem-estar.</small>

        <label htmlFor="intake-priority">
          O que é mais importante conversar primeiro?
        </label>
        <textarea
          ref={priorityRef}
          id="intake-priority"
          rows={3}
          maxLength={2000}
          value={firstPriority}
          onChange={(event) => setFirstPriority(event.target.value)}
          aria-required="true"
        />

        <label className="patient-intake-confirmation">
          <input
            ref={confirmationRef}
            name="confirmPatientWords"
            type="checkbox"
            aria-required="true"
          />
          Confirmo que registrei as respostas nas palavras do paciente.
        </label>
      </fieldset>
      <div className="patient-intake-actions">
        {record.status === "draft" ? (
          <button className="secondary" name="intent" value="draft" type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar para continuar depois"}
          </button>
        ) : null}
        <button name="intent" value="complete" type="submit" disabled={pending}>
          {pending ? "Salvando…" : record.status === "completed" ? "Salvar atualização" : "Salvar e abrir ficha"}
        </button>
      </div>
      <div className="patient-intake-feedback" aria-live="polite">
        {error ? <p className="feedback" role="alert">{error}</p> : null}
        {notice ? <p className="inline-confirm">{notice}</p> : null}
      </div>
    </form>
  );

  return (
    <section id="acolhimento-inicial" className="panel patient-intake-panel">
      <div className="section-heading patient-record-section-heading">
        <div>
          <h2>O que o paciente busca</h2>
          <p>Contexto inicial para preparar a primeira conversa.</p>
        </div>
        <span className={`appointment-status ${record.status === "completed" ? "completed" : "scheduled"}`}>
          {record.status === "completed" ? "Pronto para a primeira consulta" : "Acolhimento pendente"}
        </span>
      </div>
      {record.status === "completed" ? (
        <>
          <PatientIntakeSummary record={record} />
          {canEdit ? <details><summary>Atualizar respostas</summary>{form}</details> : null}
        </>
      ) : canEdit ? (
        form
      ) : (
        <p>O médico responsável ainda não concluiu o acolhimento.</p>
      )}
    </section>
  );
}
