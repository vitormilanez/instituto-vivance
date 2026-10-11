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
import { DoctorCurrentGoal } from "./doctor-current-goal";
import { MedicalTabs } from "./medical-selector";

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
  const items = feedEntries(context, received, base, patientId).filter((item) => item.kind !== "documents");
  const preparations = items.filter((item) => item.kind === "preparation" && item.answers);
  const latest = preparations[0];
  const previous = preparations[1];
  const incomplete = !received || received.failedLabels.length > 0 || (context.failed ?? []).some((failure) => ["preparation", "preparationHistory", "preparationAnswers", "documents", "onboarding"].includes(failure));
  const renderItem = (item: FeedEntry) => <li key={item.key}>
      <details className={`brief-submission${item.kind === "preparation" ? " brief-submission-preparation" : ""}`}>
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
    </li>;
  return <section className="brief-patient-feed" aria-labelledby={`feed-${patientId}`}>
    <div className="brief-section-heading"><h3 id={`feed-${patientId}`}>Registros originais</h3><span>Com datas e fontes</span></div>
    {items.length ? <>
      {latest && <ol className="brief-feed">{renderItem(latest)}</ol>}
      {items.filter((item) => item.key !== latest?.key).length > 0 && <details className="brief-feed-history"><summary>{latest ? "Ver histórico e cadastro" : "Ver registros do paciente"} ({items.length - (latest ? 1 : 0)})</summary><ol className="brief-feed">{items.filter((item) => item.key !== latest?.key).map(renderItem)}</ol></details>}
    </> : <p>{incomplete ? "Não foi possível conferir todos os relatos. Tente carregar novamente." : "O paciente ainda não enviou relatos."}</p>}
    {Boolean(received?.failedLabels.length) && <div className="brief-load-error" role="status"><p>Alguns envios não carregaram: {received!.failedLabels.join(", ")}.</p><RetryButton /></div>}
  </section>;
}

function BriefSource({ source, received, tenantId }: { source: ConsultationBriefSource; received: ReceivedView | null; tenantId: string }) {
  const kind = source.type === "return_preparation_request" ? "preparation" : source.type === "patient_document" ? "documents" : null;
  const original = [...(received?.visible ?? []), ...(received?.more ?? [])].find((item) => item.kind === kind && item.id === source.id);
  const label = <>{source.label}<ChevronRight size={12} aria-hidden="true" /></>;
  return kind ? <ReceivedLink tenantId={tenantId} kind={kind} itemId={source.id} href={source.href} unseen={original?.seen === false}>{label}</ReceivedLink> : <Link href={source.href}>{label}</Link>;
}

function patientTopicLabel(source: ConsultationBriefSource | undefined) {
  if (!source) return "Relato enviado";
  if (source.type === "return_preparation_request") return source.label.split(" · ").slice(1).join(" · ") || source.label;
  if (source.type === "patient_onboarding_submission") return source.label.split(" · ")[0];
  return source.label;
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
  const documentWork = pendingWork.filter((item) => item.kind === "documents");
  const otherWork = pendingWork.filter((item) => item.kind !== "documents");
  const patientTopics = brief?.topics.filter((topic) => topic.kind === "patient") ?? [];
  const pendingTopics = brief?.topics.filter((topic) => topic.kind === "pending") ?? [];
  const documentTopics = brief?.topics.filter((topic) => topic.kind === "documents") ?? [];
  const examTopics = brief?.topics.filter((topic) => topic.kind === "exams") ?? [];
  const documentsHref = `${base}/pacientes/${appointment.patient_id}?aba=Documentos`;
  const documentSources: ConsultationBriefSource[] = [...new Map([
    ...[...(received?.visible ?? []), ...(received?.more ?? [])].filter((item) => item.kind === "documents").map((item) => ({ type: "patient_document", id: item.id, date: item.at, href: item.href, label: item.label || "Exame ou documento" })),
    ...documentTopics.flatMap((topic) => topic.sources),
    ...(context?.documentItems ?? []).map((document) => ({ type: "patient_document", id: document.id, date: document.created_at, href: `${documentsHref}#documento-${document.id}`, label: document.title || "Exame ou documento" })),
  ].map((source) => [`${source.type}:${source.id}`, source] as const)).values()];
  const hasLiteralGoal = Boolean(context?.preparation?.answers?.goal?.trim() || context?.previousPreparation?.answers?.goal?.trim() || context?.onboarding?.answers?.goal?.trim());
  const initialGoal = context?.onboarding?.answers.goal?.trim();
  const showInitialGoal = Boolean(initialGoal && !context?.intake?.expectedOutcome?.trim() && !context?.intake?.firstPriority?.trim());
  const initialGoalTopic = patientTopics.find((topic) => topic.text === initialGoal && topic.sources.some((source) => source.type === "patient_onboarding_submission" && source.id === context?.onboarding?.id));
  const remainingPatientTopics = patientTopics.filter((topic) => !(showInitialGoal && topic === initialGoalTopic));
  return <article className="home-consultation doctor-consultation consultation-briefing" aria-labelledby={`consulta-${appointment.id}-titulo`}>
    <details className="brief-expandable" open>
      <summary className="brief-collapse-summary">
        <div className="brief-identity"><span className="dv-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div><h2 id={`consulta-${appointment.id}-titulo`}>{name}</h2><div className="brief-appointment-meta"><p><span>{eyebrow}</span> · <time dateTime={appointment.starts_at}>{appointmentClock(appointment.starts_at)}–{appointmentClock(appointment.ends_at)}</time></p><p>{appointment.kind === "return" ? "Retorno" : "Consulta"} · {appointment.doctor_display_name}</p></div></div></div>
        <span className="brief-collapse-control"><span className="brief-minimize-label">Minimizar</span><span className="brief-expand-label">Expandir</span><ChevronRight size={18} aria-hidden="true" /></span>
      </summary>
    <div className="brief-expandable-body">
    <header className="brief-header">
      <div className="home-consultation-actions brief-actions">
        {link.status === "active" && <>{action.label === "Retomar atendimento" && <Link className="button" href={action.href}>{action.label}</Link>}<Link className="button secondary" href={`${base}/pacientes/${appointment.patient_id}`}>Abrir ficha</Link><Link className="button secondary" href={`${base}/mensagens?paciente=${appointment.patient_id}`}>Mensagem</Link></>}
        {video && canPrepare && appointment.teleconsultation?.join_url && <TeleconsultationLink url={appointment.teleconsultation.join_url} compact />}
      </div>
      {draft && draft.appointment_id !== null && draft.appointment_id !== appointment.id && <p className="brief-other-draft">Há um rascunho de outro atendimento. <Link href={`${base}/atendimentos/${draft.id}`}>Retomar esse rascunho</Link></p>}
      {backToNext && <Link className="home-back" href={backToNext}>Voltar para a próxima consulta</Link>}
    </header>
    {access ? <div className="home-care-link"><p>{access}</p>{link.status === "assigned" && <CareLinkAccept tenantId={tenantId} relationshipId={link.relationshipId} version={link.version} patientName={name} />}</div> : !context ? <div className="brief-load-error" role="status"><p>Não foi possível carregar o contexto desta consulta.</p><RetryButton /></div> : <>
      {failed.length > 0 && <div className="brief-load-error" role="status"><p>Parte do contexto não carregou. Os registros disponíveis continuam abaixo.</p><RetryButton /></div>}
      <MedicalTabs key={appointment.id} label="Informações desta consulta" className="brief-medical-tabs" tabs={[
        { value: "summary", label: "Resumo", content: <>
      <div className="brief-content">
        <div className="brief-narrative">
          <section className="brief-summary" aria-labelledby={`brief-${appointment.id}`}>
            <div className="brief-summary-heading"><h3 id={`brief-${appointment.id}`}>Para esta consulta</h3><p className="brief-mode">{brief?.mode === "ai" ? "Seleção assistida de trechos literais · conferir as fontes" : "Trechos literais e pendências · conferir as fontes"}</p></div>
            <div className="brief-summary-grid" data-has-context={Boolean(context.intake || showInitialGoal || pendingTopics.length)}>
            {(context.intake || showInitialGoal || pendingTopics.length > 0) && <div className="brief-summary-context">
            {context.intake && <div className="brief-summary-card"><DoctorCurrentGoal
              expectedOutcome={context.intake.expectedOutcome ?? null}
              firstPriority={context.intake.firstPriority ?? null}
              source={context.intake.source ?? null}
              recordedByName={context.intake.recordedByName ?? null}
              updatedAt={context.intake.updatedAt}
              awaitingPatient={context.requests.some((request) => request.kind === "goals")}
              href={`${base}/pacientes/${appointment.patient_id}?aba=Vis%C3%A3o%20geral&acolhimento=ver#patient-intake-context`}
            /></div>}
            {showInitialGoal && context.onboarding && <section className="brief-goal brief-summary-card" aria-labelledby={`goal-${appointment.id}`}>
              <h4 id={`goal-${appointment.id}`}>Objetivo do paciente</h4>
              <p className="brief-card-note">Informado no cadastro inicial</p>
              <blockquote>{initialGoal}</blockquote>
              <div className="brief-sources">{initialGoalTopic ? initialGoalTopic.sources.map((source) => <BriefSource key={`${source.type}:${source.id}`} source={source} received={received} tenantId={tenantId} />) : <Link href={`${base}/pacientes/${appointment.patient_id}?aba=Vis%C3%A3o%20geral`}>Cadastro inicial · {day(context.onboarding.submittedAt)}<ChevronRight size={12} aria-hidden="true" /></Link>}</div>
            </section>}
            {pendingTopics.length > 0 && <section className="brief-topic-group brief-summary-card brief-pending-card"><h4>Respostas pendentes</h4><ul className="brief-topics">{pendingTopics.map((topic, index) => <li key={index}><p>{topic.text}</p><div className="brief-sources">{topic.sources.map((source) => <span className="brief-source-with-date" key={`${source.type}:${source.id}`}><BriefSource source={source} received={received} tenantId={tenantId} /><time dateTime={source.date}>{day(source.date)}</time></span>)}</div></li>)}</ul></section>}
            </div>}
            <section className="brief-topic-group brief-summary-card brief-patient-card">
              <h4>Relatos do paciente</h4>
              <p className="brief-group-note">Respostas enviadas pelo paciente, sem interpretação.</p>
              {remainingPatientTopics.length ? <ul className="brief-topics">{remainingPatientTopics.map((topic, index) => <li key={index}><h5 className="brief-topic-label">{patientTopicLabel(topic.sources[0])}</h5><blockquote>{topic.text}</blockquote><div className="brief-sources">{topic.sources.map((source) => <BriefSource key={`${source.type}:${source.id}`} source={source} received={received} tenantId={tenantId} />)}</div></li>)}</ul> : <p className="brief-group-empty">Nenhum outro relato disponível neste recorte. Consulte os registros originais abaixo.</p>}
            </section>
            </div>

            {brief?.retry && <div className="brief-load-error" role="status"><p>O resumo assistido não carregou. Os relatos originais continuam disponíveis.</p><RetryButton /></div>}
          </section>
          <PatientFeed context={context} received={received} base={base} patientId={appointment.patient_id} tenantId={tenantId} />
        </div>
            <aside className="brief-facts" aria-label="Fatos da consulta">

          <h3>Fatos da consulta</h3>
          {(failed.includes("intake") || failed.includes("requests") || context.requests.some((item) => item.kind === "goals") || (!context.intake?.hasGoal && !hasLiteralGoal)) && <div className="brief-fact"><Target size={18} aria-hidden="true" /><div><strong>Metas</strong><span>{failed.includes("intake") || failed.includes("requests") ? "Estado indisponível" : context.requests.some((item) => item.kind === "goals") ? "Solicitadas · aguardando resposta" : "Não informadas"}</span></div></div>}
          <div className="brief-fact"><CalendarDays size={18} aria-hidden="true" /><div><strong>Última consulta</strong><span>{failed.includes("encounter") ? "Registro indisponível" : context.encounter?.finalized_at ? `Finalizada em ${day(context.encounter.finalized_at)}` : "Sem registro finalizado"}</span></div>{context.encounter && <Link href={`${base}/atendimentos/${context.encounter.id}`}>Abrir</Link>}</div>
          <div className="brief-fact"><ClipboardList size={18} aria-hidden="true" /><div><strong>Plano de cuidado</strong><span>{failed.includes("publications") ? "Estado indisponível" : context.publications[0] ? `Publicado · revisão ${context.publications[0].revision}` : "Nenhum publicado"}</span></div>{context.publications[0] && <Link href={`${base}/planos/${context.publications[0].plan_id}`}>Abrir</Link>}</div>
          <ConsultationPrescriptions tenantId={tenantId} patientId={appointment.patient_id} total={context.prescriptions?.total ?? null} available={context.prescriptions?.available ?? false} />

          {otherWork.length > 0 && <section className="brief-open-work"><h3>Seu trabalho com este paciente</h3><ul>{otherWork.map((item) => <li key={`${item.kind}:${item.id}`}><span>{item.state}</span><Link href={item.href}>{item.action}</Link></li>)}</ul></section>}
          {workItems === null && <div className="brief-load-error" role="status"><p>Não foi possível carregar o trabalho com este paciente.</p><RetryButton /></div>}
        </aside>
      </div>
        </> },
        { value: "documents", label: "Exames e documentos", count: failed.includes("documents") ? null : context.documents.total, content: <div className="brief-view-body">
            <section className="brief-topic-group brief-documents" aria-labelledby={`documents-${appointment.id}`}>
              <div className="brief-section-heading"><h4 id={`documents-${appointment.id}`}>Exames e documentos</h4>{!documentWork.some((item) => item.href === documentsHref) && <Link href={documentsHref}>Abrir Documentos</Link>}</div>
              <p className="brief-document-count">{failed.includes("documents") || context.documents.total === null ? "Contagem indisponível" : `${context.documents.total} ${context.documents.total === 1 ? "documento disponível" : "documentos disponíveis"}${context.documents.latest_at ? ` · último em ${day(context.documents.latest_at)}` : ""}`}</p>
              {documentWork.length === 0 && documentTopics.map((topic, index) => <p className="brief-document-count" key={index}>{topic.text}</p>)}
              {examTopics.length > 0 && <div className="brief-exam-results"><h5>Resultados de exames</h5><p className="brief-group-note">Os estados de revisão aparecem em cada linha; valores revisados mantêm acesso à fonte.</p><ul className="brief-topics">{examTopics.map((topic, index) => <li key={index}><p>{topic.text}</p><div className="brief-sources">{topic.sources.map((source) => <BriefSource key={`${source.type}:${source.id}`} source={source} received={received} tenantId={tenantId} />)}</div></li>)}</ul></div>}
              {documentSources.length > 0 && <details className="brief-document-details"><summary>Ver arquivos recentes ({documentSources.length})</summary><ol className="brief-document-list">{documentSources.map((source, index) => <li key={`${source.type}:${source.id}`}><span className="brief-document-number">Arquivo {index + 1}</span><BriefSource source={source} received={received} tenantId={tenantId} /><time dateTime={source.date}>{day(source.date)}</time></li>)}</ol></details>}
              {documentWork.map((item) => <Link className="brief-document-work" key={`${item.kind}:${item.id}`} href={item.href}>{item.state} · {item.action}</Link>)}
            </section>
        </div> },
        { value: "evolution", label: "Evolução", content: <div className="brief-view-body">
          <h3>Evolução do paciente</h3>
          <div id={`peso-${appointment.id}`}><DoctorWeightChart initialWeight={context.onboarding?.measurements.weightKg != null && context.onboarding.measurements.measuredOn ? { value: context.onboarding.measurements.weightKg, date: context.onboarding.measurements.measuredOn } : null} points={weight} href={`${base}/acompanhamento?aba=evolucao&paciente=${appointment.patient_id}`} /></div>
          {context.encounter?.evolution?.trim() && <details className="brief-evolution"><summary>Evolução registrada pelo médico</summary><p>{context.encounter.evolution}</p><Link href={`${base}/atendimentos/${context.encounter.id}`}>Ler registro completo</Link></details>}
        </div> },
        { value: "requests", label: "Solicitações", content: <div className="brief-view-body">
          <h3>Solicitações ao paciente</h3>
          <p>Peça informações para a próxima consulta e acompanhe as respostas.</p>
          {failed.includes("requests") ? <div className="brief-load-error" role="status"><p>Não foi possível carregar as solicitações.</p><RetryButton /></div>
            : <ConsultationRequests tenantId={tenantId} patientId={appointment.patient_id} requests={context.requests} embedded />}
        </div> },
      ]} />
    </>}
    </div>
    </details>
  </article>;
}
