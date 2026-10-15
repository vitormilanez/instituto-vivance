"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { consultationSummaryCategories } from "@/modules/consultation-workflow/summary-types";
import type { PatientConsultationHistory } from "@/modules/consultation-workflow/history";
import { consultationDate, consultationTime, historyCategoryTitles, historyReviewLabel } from "@/modules/consultation-workflow/history-presentation";
import styles from "./patient-consultation-history.module.css";

export function PatientConsultationHistoryPanel({ tenantId, patientId, endpoint, consultationBase }: {
  tenantId: string; patientId: string; endpoint?: string; consultationBase?: string;
}) {
  const url = endpoint ?? `/api/v1/clinics/${tenantId}/consultation-workflow/patients/${patientId}/history`;
  const [history, setHistory] = useState<PatientConsultationHistory | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { cache: "no-store", signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar os resumos.");
      setHistory(result);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os resumos."); });
    return () => controller.abort();
  }, [url, attempt]);

  return <section id="historico-consultas" className={styles.history} aria-labelledby="patient-consultation-history-title">
    <header className={styles.heading}><div><h2 id="patient-consultation-history-title">Histórico de consultas</h2><p>Resumos das suas consultas com este paciente · acesso privado do médico.</p></div></header>
    {error ? <div role="alert" className={styles.message}><p>{error}</p><button type="button" className="secondary" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Tentar carregar novamente</button></div>
      : !history ? <p role="status" className={styles.message}>Carregando histórico de consultas…</p>
        : !history.items.length ? <p className={styles.message}>Os resumos aparecerão aqui após as consultas com assistência. Você poderá conferir a conversa e registrar sua revisão antes de utilizar o conteúdo.</p>
          : <ol className={styles.list}>{history.items.map(item => {
            const draft = item.summary;
            const rejected = draft?.reviewDecision === "rejected";
            const href = consultationBase ?? `/clinicas/${tenantId}/teleconsulta/${item.appointmentId}`;
            return <li key={item.appointmentId}>
              <details className={styles.entry}>
                <summary className={styles.toggle}>
                  <div className={styles.identity}><h3><time dateTime={item.startsAt}>{consultationDate(item.startsAt)}</time></h3><span>{consultationTime(item.startsAt)}–{consultationTime(item.endsAt)} · {item.deliveryMode === "video" ? "Online" : "Presencial"}</span><small>{item.doctorName || "Médico responsável"}</small></div>
                  <span className={styles.status} data-state={rejected ? "rejected" : draft?.reviewDecision === "accepted" ? "reviewed" : "pending"}>{historyReviewLabel(draft?.reviewDecision ?? null, item.summaryStatus)}</span>
                  <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
                </summary>
                <div className={styles.body}>
                  {draft ? <>
                    <p className={styles.disclaimer}>{rejected ? "Este resumo foi marcado como não utilizar. Mantido somente para histórico e conferência." : draft.reviewDecision === "accepted" ? "Revisão registrada pelo médico. O resumo permanece privado e não foi publicado ao paciente." : draft.mode === "extractive" ? "Trechos organizados sem síntese de IA. Confira e revise antes de utilizar como registro da consulta." : "Rascunho gerado por IA. Confira e revise antes de utilizar como registro da consulta."}{draft.incomplete ? " A fonte possui limitações ou pontos que precisam de conferência." : ""}</p>
                    <p className={styles.provenance}>Resumo · versão {draft.version} · versão criada em {consultationDate(draft.createdAt)}, às {consultationTime(draft.createdAt)}{draft.reviewedAt ? ` · revisão registrada em ${consultationDate(draft.reviewedAt)}, às ${consultationTime(draft.reviewedAt)}` : ""}</p>
                    <div className={styles.sections}>{consultationSummaryCategories.map(category => draft.categories[category]?.length > 0 && <section key={category}><h4>{historyCategoryTitles[category]}</h4><ul>{draft.categories[category].map((fact, index) => <li key={index}>{fact.text}</li>)}</ul></section>)}</div>
                  </> : <p className={styles.message}>O resumo ainda não está disponível. Abra a consulta para conferir o andamento ou continuar com o registro manual.</p>}
                  <Link className={styles.action} href={href}>{draft?.reviewDecision ? "Abrir consulta e conferir fontes" : "Abrir consulta e revisar resumo"}</Link>
                </div>
              </details>
            </li>;
          })}</ol>}
    {history?.truncated && <p className={styles.message}>Exibindo as {history.limit} consultas mais recentes com assistência. Os registros anteriores continuam vinculados às respectivas consultas.</p>}
    {history && <button type="button" className="secondary" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Atualizar histórico</button>}
  </section>;
}
