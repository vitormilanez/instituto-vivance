import Link from "next/link";
import { ArrowRight, Clock3, FileText, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { PatientCareContext } from "@/modules/workspace/today";
import type { PatientHeaderFacts } from "@/modules/workspace/patient-header-facts";
import type { StaffDocuments } from "@/modules/documents/service";
import { documentTitle } from "@/modules/documents/title";
import { patientGoalFacts } from "@/modules/workspace/patient-goal-facts";
import { DoctorWeightChart, type WeightPoint } from "./doctor-weight-chart";
import styles from "./doctor-patient-overview.module.css";

const date = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
  : "Data não informada";

export function DoctorPatientHeader({ name, birthDate, reportedBirthDate = false, tenantId, patientId, facts }: {
  name: string; birthDate: string | null; reportedBirthDate?: boolean; tenantId: string; patientId: string; facts: PatientHeaderFacts | null;
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <header className={styles.header}>
    <span className={styles.avatar} aria-hidden="true">{initials}</span>
    <div className={styles.identity}><h1>{name}</h1><p>{facts?.nextAppointmentLabel ? `Próxima consulta · ${facts.nextAppointmentLabel}` : "Contexto do paciente"}</p>
      <small>{birthDate ? `${reportedBirthDate ? "Nascimento informado pelo paciente" : "Nascimento no cadastro"} · ${date(birthDate)}` : "Nascimento não informado"}{facts ? ` · ${facts.relationshipLabel}` : ""}</small>
    </div>
    {facts && <div className={styles.actions}>
      <Link className="button secondary" href={`/clinicas/${tenantId}/mensagens?paciente=${patientId}`}><MessageCircle size={20} aria-hidden="true" />Mensagem</Link>
      <Link className="button" href={facts.nextAppointmentHref ?? `/clinicas/${tenantId}/agenda`}>{facts.nextAppointmentHref ? "Ver consulta na agenda" : "Abrir agenda"}</Link>
    </div>}
  </header>;
}

function Action({ href, children }: { href: string; children: ReactNode }) {
  return <Link className={styles.action} href={href}>{children}<ArrowRight size={18} aria-hidden="true" /></Link>;
}

export function DoctorPatientOverview({ care, documents, weight, recordBase, tenantId, summary, awaitingPatient = false }: {
  care: PatientCareContext; documents: StaffDocuments | null; weight: WeightPoint[] | null;
  recordBase: string; tenantId: string; summary: ReactNode; awaitingPatient?: boolean;
}) {
  const goal = care.intake ? patientGoalFacts({ expectedOutcome: care.intake.expectedOutcome ?? null, firstPriority: care.intake.firstPriority ?? null, source: care.intake.source ?? null, recordedByName: care.intake.recordedByName ?? null, updatedAt: care.intake.updatedAt, awaitingPatient }) : null;
  const since = care.encounter?.finalized_at;
  const recentDocuments = care.documentItems.filter(item => !since || item.created_at > since);
  const documentsUnavailable = care.documents.total === null || Boolean(care.failed?.includes("documents"));
  const weightUnavailable = weight === null;
  const recentWeight = weight?.at(-1);
  const showWeight = recentWeight && (!since || recentWeight.date.slice(0, 10) >= since.slice(0, 10));
  const visible = documents?.documents.filter(doc => !doc.duplicate_of && (doc.category === "exam" || doc.visibility === "shared")) ?? [];
  const requestedLabels: Record<string, string> = { documents: "Documentos aguardando envio", measurements: "Medidas aguardando resposta", intake: "Acolhimento aguardando resposta", onboarding: "Cadastro inicial aguardando resposta" };
  return <div className={styles.overview}>
    <div className={styles.main}>
      <section className={styles.section} aria-labelledby="patient-overview-title">
        <h2 id="patient-overview-title">Visão geral</h2>
        <div className={styles.goal}>
          <h3>{goal?.title ?? "Objetivo informado"}</h3>
          <p>{goal ? goal.expectedOutcome || "Resultado esperado não informado." : care.onboarding?.answers.goal?.trim() || "Nenhum objetivo informado até agora."}</p>
          {goal?.firstPriority && <p><strong>Prioridade declarada:</strong> {goal.firstPriority}</p>}
          <small>{goal ? `${goal.origin}${goal.updatedAt ? ` · ${goal.updatedAt}` : ""}` : care.onboarding ? `Cadastro inicial · ${date(care.onboarding.submittedAt)}` : "O objetivo aparecerá após o envio ou registro do acolhimento."}</small>
        </div>
      </section>
      <section className={styles.section}>
        <h3>{since ? "Desde o último atendimento" : "Registros recebidos"}</h3>
        <p className={styles.muted}>{since ? `Último atendimento · ${date(since)}` : "Nenhum atendimento finalizado registrado."}</p>
        <ul className={styles.rows}>
          {recentDocuments.length > 0 && <li><time dateTime={recentDocuments[0].created_at}>{date(recentDocuments[0].created_at)}</time><span>{recentDocuments.length}{recentDocuments.length === 6 ? " ou mais" : ""} documento(s) recebido(s)</span><Action href={`${recordBase}?aba=Documentos`}>Ver documentos</Action></li>}
          {showWeight && <li><time dateTime={recentWeight.date}>{date(recentWeight.date)}</time><span>Peso informado · {new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1 }).format(recentWeight.value)} kg</span><Action href={`${recordBase}?aba=Evolu%C3%A7%C3%A3o`}>Ver origem</Action></li>}
          {documentsUnavailable && <li><span>Novos documentos indisponíveis agora.</span><Action href={`${recordBase}?aba=Documentos`}>Ver documentos</Action></li>}
          {weightUnavailable && <li><span>Registros de peso indisponíveis agora.</span><Action href={`${recordBase}?aba=Evolu%C3%A7%C3%A3o`}>Ver evolução</Action></li>}
          {!documentsUnavailable && !weightUnavailable && !recentDocuments.length && !showWeight && <li><span>Nenhum novo documento ou peso disponível neste período.</span></li>}
        </ul>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}><h3>Exames e documentos</h3><Action href={`${recordBase}?aba=Documentos`}>Ver todos</Action></div>
        <p className={styles.muted}>{care.documents.total === null ? "Contagem indisponível agora" : `${care.documents.total} arquivo(s) disponível(is)`} · revisão documental e resultados têm estados próprios.</p>
        {documents ? visible.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Documento</th><th>Recebido</th><th>Revisão documental</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{visible.slice(0, 3).map(doc => {
          const review = documents.reviews.find(item => item.document_id === doc.id);
          return <tr key={doc.id}><td><FileText size={19} aria-hidden="true" /><span>{documentTitle(doc)}</span></td><td>{date(doc.created_at)}</td><td><span className={review ? styles.reviewed : styles.pending}>{review ? "Revisão registrada" : "Para revisar"}</span>{review && <small>{date(review.reviewed_at)}</small>}</td><td><Action href={`${recordBase}?aba=Documentos#exam-documento-${doc.id}`}>Conferir fonte</Action></td></tr>;
        })}</tbody></table></div> : <p>Nenhum exame ou documento compartilhado nesta prévia.</p> : <p>Não foi possível carregar os documentos. Abra a área de documentos para tentar novamente.</p>}
        <small className={styles.source}>Resultados e referências do laudo ficam junto à fonte. Revisão documental não significa aprovação dos resultados.</small>
      </section>
      <div className={styles.history}><h3>Histórico de atendimentos</h3><Action href={`${recordBase}?aba=Linha%20do%20tempo`}>Ver histórico</Action></div>
    </div>
    <aside className={styles.aside} aria-label="Evolução e pendências do paciente">
      <section className={styles.section}>
        <h2>Evolução</h2>
        <DoctorWeightChart points={weight} href={`${recordBase}?aba=Evolu%C3%A7%C3%A3o`} initialWeight={care.onboarding?.measurements.weightKg != null && care.onboarding.measurements.measuredOn ? { value: care.onboarding.measurements.weightKg, date: care.onboarding.measurements.measuredOn } : null} />
      </section>
      <section className={styles.section}>
        <h3>Pendências do cuidado</h3>
        <ul className={styles.requests}>
          {care.preparation && !["reviewed", "cancelled"].includes(care.preparation.status) && <li><Clock3 size={22} aria-hidden="true" /><div><strong>{care.preparation.submitted_at ? "Pré-consulta para revisar" : "Pré-consulta aguardando resposta"}</strong><small>{care.preparation.submitted_at ? "Enviada" : "Solicitada"} · {date(care.preparation.submitted_at ?? care.preparation.requested_at)}</small><Action href={`/clinicas/${tenantId}/preparo?solicitacao=${care.preparation.id}#preparo-${care.preparation.id}`}>Ver pré-consulta</Action></div></li>}
          {care.requests.map(request => <li key={request.id}><Clock3 size={22} aria-hidden="true" /><div><strong>{requestedLabels[request.kind] ?? "Solicitação aguardando resposta"}</strong><small>Solicitada · {date(request.requested_at)}</small><Action href={`${recordBase}?aba=Vis%C3%A3o%20geral&contexto=ver#patient-context-details`}>Ver solicitação</Action></div></li>)}
          {!care.requests.length && (!care.preparation || ["reviewed", "cancelled"].includes(care.preparation.status)) && <li><span>Nenhuma solicitação pendente registrada.</span></li>}
        </ul>
      </section>
      <details className={styles.summary} id="patient-exam-summary"><summary>Resumo de exames · revisão médica</summary>{summary}</details>
    </aside>
  </div>;
}
