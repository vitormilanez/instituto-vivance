"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { preparationQuestions } from "@/modules/return-preparation/questionnaire";

// Operate extension: incumbent Vivance tokens, inline task, no modal.
// Doctor reviews five questions before an immutable, appointment-bound request.
export function PreparationRequestEditor({ tenantId, appointmentId, patientName, onClose }: {
  tenantId: string; appointmentId: string; patientName: string; onClose: () => void;
}) {
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const request = useRef<{ key: string; payload: string } | null>(null);
  const [questions, setQuestions] = useState(() => preparationQuestions.map((question) => ({ ...question })));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => { panel.current?.focus(); panel.current?.scrollIntoView({ block: "start" }); }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    const payload = JSON.stringify(questions.map((question) => ({ ...question, label: question.label.trim() })));
    if (!request.current || request.current.payload !== payload)
      request.current = { key: crypto.randomUUID(), payload };
    let rejected = false;
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/return-preparations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ appointment_id: appointmentId, request_key: request.current.key, questions: JSON.parse(payload) }),
      });
      rejected = !response.ok;
      const result = await response.json();
      if (!response.ok) { setUncertain(false); throw new Error(result.error ?? "Não foi possível solicitar a pré-consulta."); }
      onClose();
      router.refresh();
    } catch (reason) {
      const network = !rejected;
      if (network) setUncertain(true);
      setError(network ? "Não foi possível confirmar o envio. Tente novamente com o mesmo roteiro; a solicitação não será duplicada." : reason instanceof Error ? reason.message : "Não foi possível enviar. Atualize a Agenda.");
    } finally { inFlight.current = false; setPending(false); }
  }

  function move(index: number, direction: number) {
    setQuestions((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  return <section ref={panel} tabIndex={-1} className="panel preparation-card" aria-labelledby="request-preparation-title">
    <div className="preparation-heading"><div>
      <h2 id="request-preparation-title">Preparar pré-consulta de {patientName}</h2>
      <p>Ajuste as cinco perguntas para este encontro. Após solicitar, este roteiro fica preservado.</p>
    </div><button type="button" className="secondary" onClick={onClose} disabled={pending}>Fechar sem enviar</button></div>
    <form onSubmit={send}>
      <fieldset disabled={pending || uncertain}>
        {questions.map((question, index) => <div className="preparation-question-edit" key={question.id}>
          <label className="field">Pergunta {index + 1}
            <textarea rows={3} required maxLength={600} value={question.label} onChange={(event) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, label: event.target.value.replace(/[\r\n]/g, " ") } : item))} />
          </label>
          <div className="agenda-actions">
            <button type="button" className="secondary" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Mover pergunta ${index + 1} para cima`}>Subir</button>
            <button type="button" className="secondary" disabled={index === questions.length - 1} onClick={() => move(index, 1)} aria-label={`Mover pergunta ${index + 1} para baixo`}>Descer</button>
          </div>
        </div>)}
      </fieldset>
      <p className="module-footnote">As respostas serão relatos do paciente, não conclusões clínicas. Não inclua informações de outras pessoas nas perguntas.</p>
      {error && <p className="feedback" role="alert">{error}</p>}
      <button disabled={pending}>{pending ? "Solicitando…" : uncertain ? "Tentar confirmar a mesma solicitação" : "Solicitar preenchimento ao paciente"}</button>
    </form>
  </section>;
}
