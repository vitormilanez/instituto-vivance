import Link from "next/link";
import { FileText, Target, CalendarDays, ClipboardList, ChevronRight, History } from "lucide-react";
import type { PatientCareContext } from "@/modules/workspace/today";
import type { ConsultationBrief, ConsultationBriefSource } from "@/modules/ai/consultation-brief";
import type { BlockAppointment, BlockDraft } from "./consultation-block";
import type { CareLink, ReceivedView } from "@/modules/workspace/home-view";
import type { OpenWorkItem } from "@/modules/workspace/open-work-items";
import { careLinkCopy } from "@/modules/workspace/home-view";
import { appointmentClock } from "@/modules/workspace/home-day";
import { consultationAction } from "@/modules/workspace/consultation-layout";
import { preparationQuestions } from "@/modules/return-preparation/questionnaire";
import { onboardingMeasurements, onboardingQuestions } from "@/modules/onboarding/display";
import { receivedItemLabels } from "@/modules/workspace/received-items";
import { DoctorWeightChart, type WeightPoint } from "./doctor-weight-chart";
import { ReceivedLink } from "./received-link";
import { RetryButton } from "./retry-button";
import { CareLinkAccept } from "./care-link-accept";
import { ConsultationPrescriptions, ConsultationRequests } from "./consultation-tools";
import { TeleconsultationLink } from "./teleconsultation-link";

const day = (at: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(at.length === 10 ? `${at}T12:00:00Z` : at));
const fullDay = (at: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(at));
const prepLabels: Record<string, string> = { goal: "Assunto da consulta", changes: "O que mudou", routine: "Rotina e disposição", treatment: "Tratamento informado", questions: "Dúvidas do paciente" };

type FeedEntry = { key: string; kind: string; id: string; at: string; label: string; href: string; seen?: boolean | null; answers?: Record<string, string> | null; initial?: PatientCareContext["onboarding"]; preview?: string; current?: boolean };

function feedEntries(context: PatientCareContext, received: ReceivedView | null, base: string, patientId: string): FeedEntry[] {
  const items = new Map<string, FeedEntry>();
  for (const item of [...(received?.visible ?? []), ...(received?.more ?? [])]) items.set(`${item.kind}:${item.id}`, { ...item, key: `${item.kind}:${item.id}`, label: receivedItemLabels[item.kind] });
  const preparations: { id: string; submitted_at: string; answers: Record<string, string> | null }[] = [...(context.preparationHistory ?? [])];
  if (context.preparation?.submitted_at && context.preparation.answers) preparations.push({ ...context.preparation, submitted_at: context.preparation.submitted_at });
  if (context.previousPreparation) preparations.push(context.previousPreparation);
  for (const prep of preparations) {
    const key = `preparation:${prep.id}`;
    items.set(key, { ...items.get(key), key, kind: "preparation", id: prep.id, at: prep.submitted_at, label: "Pré-consulta", href: `${base}/preparo?solicitacao=${prep.id}#preparo-${prep.id}`, answers: prep.answers, preview: prep.answers?.goal, current: context.preparation?.id === prep.id });
  }
  for (const doc of context.documentItems ?? []) {
    const key = `documents:${doc.id}`;
    items.set(key, { ...items.get(key), key, kind: "documents", id: doc.id, at: doc.created_at, label: doc.title || "Exame ou documento", href: `${base}/pacientes/${patientId}?aba=Documentos#documento-${doc.id}` });
  }
  if (context.onboarding) {
    const initial = context.onboarding;
    items.set(`onboarding:${initial.id}`, { key: `onboarding:${initial.id}`, kind: "onboarding", id: initial.id ?? "initial", at: initial.submittedAt, label: "Contexto de base", href: `${base}/pacientes/${patientId}?aba=Vis%C3%A3o%20geral`, initial, preview: initial.answers.goal });
  }
  return [...items.values()].sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
}

function Answers({ answers, initial = false }: { answers: Record<string, string>; initial?: boolean }) {
  const questions = initial ? onboardingQuestions : preparationQuestions;
  return <dl className="brief-answers">{questions.map(({ id, label }) => <div key={id} data-primary={id === "goal" || undefined}><dt>{initial ? label : prepLabels[id]}</dt><dd>{answers[id]?.trim() ? answers[id] : "Não informado"}</dd></div>)}</dl>;
}

function PatientFeed({ context, received, base, patientId, tenantId }: { context: PatientCareContext; received: ReceivedView | null; base: string; patientId: string; tenantId: string }) {
  const items = feedEntries(context, received, base, patientId);
  const preparations = items.filter((item) => item.kind === "preparation" && item.answers);
  const latest = preparations[0];
  const previous = preparations[1];
  const incomplete = !received || received.failedLabels.length > 0 || (context.failed ?? []).some((failure) => ["preparation", "preparationHistory", "preparationAnswers", "documents", "onboarding"].includes(failure));
  return <section className="brief-patient-feed" aria-labelledby={`feed-${patientId}`}>
    <div className="brief-section-heading"><h3 id={`feed-${patientId}`}>O que o paciente trouxe</h3><span>Mais recente primeiro</span></div>
    {items.length ? <ol className="brief-feed">{items.map((item) => <li key={item.key}>
      <details open={item.key === latest?.key} className={`brief-submission${item.kind === "preparation" ? " brief-submission-preparation" : ""}`}>
        <summary>
          <span className="brief-feed-icon" aria-hidden="true">{item.kind === "preparation" ? <ClipboardList size={18} /> : item.kind === "onboarding" ? <History size={18} /> : <FileText size={18} />}</span>
          <span className="brief-feed-copy"><strong>{item.label}{item.current ? " desta consulta" : item.kind === "preparation" ? " anterior" : ""}</strong><small>{fullDay(item.at)} · {item.kind === "documents" ? "Documento disponível" : "Enviado pelo paciente"}</small>{item.key !== latest?.key && item.preview?.trim() && <span className="brief-feed-preview">{item.preview}</span>}</span>
          {item.seen === false && <span className="brief-unseen">Não visto</span>}
          <ChevronRight size={18} className="brief-disclosure-icon" aria-hidden="true" />
        </summary>
        <div className="brief-submission-body">
          {item.answers && <Answers answers={item.answers} />}
          {item.initial && <><Answers initial answers={item.initial.answers} /><p className="brief-original-measures">{onboardingMeasurements(item.initial.measurements)}</p></>}
          {item.kind === "preparation" && !item.answers && <p>As respostas estão disponíveis no registro original.</p>}
          {item.kind === "preparation" && item.key === latest?.key && previous?.answers && <details className="brief-compare"><summary>Comparar com a anterior de {day(previous.at)}</summary><div className="brief-comparison"><div><h4>{day(item.at)} · mais recente</h4><Answers answers={item.answers!} /></div><div><h4>{day(previous.at)} · anterior</h4><Answers answers={previous.answers} /></div></div></details>}
          {item.kind === "onboarding" ? <Link className="brief-source-link" href={item.href}>Abrir contexto de base <ChevronRight size={14} aria-hidden="true" /></Link> : <ReceivedLink tenantId={tenantId} kind={item.kind} itemId={item.id} href={item.href} unseen={item.seen === false}>Abrir registro original <ChevronRight size={14} aria-hidden="true" /></ReceivedLink>}
        </div>
      </details>
    </li>)}</ol> : <p>{incomplete ? "Não foi possível conferir todos os relatos e documentos. Tente carregar novamente." : "O paciente ainda não enviou relatos ou documentos."}</p>}
    {Boolean(received?.failedLabels.length) && <div className="brief-load-error" role="status"><p>Alguns envios não carregaram: {received!.failedLabels.join(", ")}.</p><RetryButton /></div>}
  </section>;
}

function BriefSource({ source, received, tenantId }: { source: ConsultationBriefSource; received: ReceivedView | null; tenantId: string }) {
  const kind = source.type === "return_preparation_request" ? "preparation" : source.type === "patient_document" ? "documents" : null;
  const original = [...(received?.visible ?? []), ...(received?.more ?? [])].find((item) => item.kind === kind && item.id === source.id);
  const label = <>{source.label}<ChevronRight size={12} aria-hidden="true" /></>;
  return kind ? <ReceivedLink tenantId={tenantId} kind={kind} itemId={source.id} href={source.href} unseen={original?.seen === false}>{label}</ReceivedLink> : <Link href={source.href}>{label}</Link>;
}

export function DoctorConsultationBriefing({ base, tenantId, appointment, eyebrow, link, context, weight, received, draft, brief, workItems, now, agendaHref, backToNext }: { base: string; tenantId: string; appointment: BlockAppointment; eyebrow: string; link: CareLink; context: PatientCareContext | null; weight: WeightPoint[] | null; received: ReceivedView | null; draft: BlockDraft | null; brief?: ConsultationBrief | null; workItems?: OpenWorkItem[] | null; now: string; agendaHref: string; backToNext?: string | null }) {
  const name = appointment.patients?.display_name ?? "Paciente";
  const canPrepare = appointment.status === "in_progress" || (appointment.status === "scheduled" && Date.parse(appointment.ends_at) > Date.parse(now));
  const video = appointment.teleconsultation?.delivery_mode === "video";
  const action = consultationAction({ draft, appointmentId: appointment.id, preparable: canPrepare, base, agendaHref, query: video ? "?modo=teleconsulta&etapa=consulta" : "" });
  const access = careLinkCopy(link);
  const failed = context?.failed ?? [];
  const work = workItems?.filter((item) => item.patientId === appointment.patient_id) ?? [];
  const pendingWork = work.filter((item) => !(item.kind === "encounter" && item.id === draft?.id && action.label === "Retomar atendimento"));
  const prep = context?.preparation?.submitted_at ? context.preparation : context?.previousPreparation;
  return <article className="home-consultation doctor-consultation consultation-briefing" aria-labelledby={`consulta-${appointment.id}-titulo`}>
    <header className="brief-header">
      <div className="brief-identity"><span className="dv-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div><h2 id={`consulta-${appointment.id}-titulo`}>{name}</h2><p><span>{eyebrow}</span> · <time dateTime={appointment.starts_at}>{appointmentClock(appointment.starts_at)}–{appointmentClock(appointment.ends_at)}</time></p><small>{appointment.kind === "return" ? "Retorno" : "Consulta"} · {appointment.doctor_display_name}</small></div></div>
      {context && link.status === "active" && <ul className="brief-readiness" aria-label="Fontes disponíveis para o preparo">
        {prep?.submitted_at && <li><Link href={`${base}/preparo?solicitacao=${prep.id}#preparo-${prep.id}`}><ClipboardList size={14} aria-hidden="true" />Pré-consulta {day(prep.submitted_at)}</Link></li>}
        {!failed.includes("documents") && context.documents.total !== null && context.documents.total > 0 && <li><a href={`${base}/pacientes/${appointment.patient_id}?aba=Documentos`}><FileText size={14} aria-hidden="true" />{context.documents.total} exames{context.documents.latest_at ? ` · ${day(context.documents.latest_at)}` : ""}</a></li>}
        {weight && weight.length > 0 && <li><a href={`#peso-${appointment.id}`}>{weight.length} pesos recentes</a></li>}
      </ul>}
      <div className="home-consultation-actions brief-actions">
        {link.status === "active" && <><Link className="button" href={action.href}>{action.label}</Link><Link className="button secondary" href={`${base}/pacientes/${appointment.patient_id}`}>Abrir ficha</Link><Link className="button secondary" href={`${base}/mensagens?paciente=${appointment.patient_id}`}>Mensagem</Link>{context && !failed.includes("requests") && <ConsultationRequests tenantId={tenantId} patientId={appointment.patient_id} requests={context.requests} />}</>}
        {video && canPrepare && appointment.teleconsultation?.join_url && <TeleconsultationLink url={appointment.teleconsultation.join_url} compact />}
      </div>
      {draft && draft.appointment_id !== null && draft.appointment_id !== appointment.id && <p className="brief-other-draft">Há um rascunho de outro atendimento. <Link href={`${base}/atendimentos/${draft.id}`}>Retomar esse rascunho</Link></p>}
      {backToNext && <Link className="home-back" href={backToNext}>Voltar para a próxima consulta</Link>}
    </header>
    {access ? <div className="home-care-link"><p>{access}</p>{link.status === "assigned" && <CareLinkAccept tenantId={tenantId} relationshipId={link.relationshipId} version={link.version} patientName={name} />}</div> : !context ? <div className="brief-load-error" role="status"><p>Não foi possível carregar o contexto desta consulta.</p><RetryButton /></div> : <>
      {failed.length > 0 && <div className="brief-load-error" role="status"><p>Parte do contexto não carregou. Os registros disponíveis continuam abaixo.</p><RetryButton /></div>}
      <div className="brief-content">
        <div className="brief-narrative">
          <section className="brief-summary" aria-labelledby={`brief-${appointment.id}`}>
            <div className="brief-section-heading"><h3 id={`brief-${appointment.id}`}>Para esta consulta</h3></div>
            <p className="brief-mode">{brief?.mode === "ai" ? "Rascunho preparado pela IA · revisar" : "Relatos e lacunas · conferir as fontes"}</p>
            {brief?.topics.length ? <ul className="brief-topics">{brief.topics.map((topic, index) => <li key={index}><p>{topic.text}</p><div className="brief-sources">{topic.sources.map((source) => <BriefSource key={`${source.type}:${source.id}`} source={source} received={received} tenantId={tenantId} />)}</div></li>)}</ul> : <p>Confira os registros originais abaixo para preparar a conversa.</p>}
            {brief?.retry && <div className="brief-load-error" role="status"><p>O resumo assistido não carregou. Os relatos originais continuam disponíveis.</p><RetryButton /></div>}
          </section>
          <PatientFeed context={context} received={received} base={base} patientId={appointment.patient_id} tenantId={tenantId} />
        </div>
        <aside className="brief-facts" aria-label="Evolução e fatos da consulta">
          <div id={`peso-${appointment.id}`}><DoctorWeightChart initialWeight={context.onboarding?.measurements.weightKg != null && context.onboarding.measurements.measuredOn ? { value: context.onboarding.measurements.weightKg, date: context.onboarding.measurements.measuredOn } : null} points={weight} href={`${base}/acompanhamento?aba=evolucao&paciente=${appointment.patient_id}`} /></div>
          <h3>Fatos da consulta</h3>
          <div className="brief-fact"><FileText size={18} aria-hidden="true" /><div><strong>Exames</strong><span>{failed.includes("documents") ? "Contagem indisponível" : `${context.documents.total} disponíveis${context.documents.latest_at ? ` · ${day(context.documents.latest_at)}` : ""}`}</span></div><Link href={`${base}/pacientes/${appointment.patient_id}?aba=Documentos`}>Revisar</Link></div>
          <div className="brief-fact"><Target size={18} aria-hidden="true" /><div><strong>Metas</strong><span>{failed.includes("intake") || failed.includes("requests") ? "Estado indisponível" : context.intake?.hasGoal ? "Informadas pelo paciente" : context.requests.some((item) => item.kind === "goals") ? "Solicitadas · aguardando resposta" : "Não informadas"}</span></div></div>
          <div className="brief-fact"><CalendarDays size={18} aria-hidden="true" /><div><strong>Última consulta</strong><span>{failed.includes("encounter") ? "Registro indisponível" : context.encounter?.finalized_at ? `Finalizada em ${day(context.encounter.finalized_at)}` : "Sem registro finalizado"}</span></div>{context.encounter && <Link href={`${base}/atendimentos/${context.encounter.id}`}>Abrir</Link>}</div>
          <div className="brief-fact"><ClipboardList size={18} aria-hidden="true" /><div><strong>Plano de cuidado</strong><span>{failed.includes("publications") ? "Estado indisponível" : context.publications[0] ? `Publicado · revisão ${context.publications[0].revision}` : "Nenhum publicado"}</span></div>{context.publications[0] && <Link href={`${base}/planos/${context.publications[0].plan_id}`}>Abrir</Link>}</div>
          <ConsultationPrescriptions tenantId={tenantId} patientId={appointment.patient_id} total={context.prescriptions?.total ?? null} available={context.prescriptions?.available ?? false} />
          {context.encounter?.evolution?.trim() && <details className="brief-evolution"><summary>Evolução registrada pelo médico</summary><p>{context.encounter.evolution}</p><Link href={`${base}/atendimentos/${context.encounter.id}`}>Ler registro completo</Link></details>}
          {pendingWork.length > 0 && <section className="brief-open-work"><h3>Seu trabalho com este paciente</h3><ul>{pendingWork.map((item) => <li key={`${item.kind}:${item.id}`}><span>{item.state}</span><Link href={item.href}>{item.action}</Link></li>)}</ul></section>}
          {workItems === null && <div className="brief-load-error" role="status"><p>Não foi possível carregar o trabalho com este paciente.</p><RetryButton /></div>}
        </aside>
      </div>
    </>}
  </article>;
}
