import Link from "next/link";
import { PrescriptionsPanel } from "@/components/prescriptions-panel";
import { TeleconsultationLink } from "./teleconsultation-link";
import type { PatientCareContext } from "@/modules/workspace/today";
import {
  dayStatusLabels,
  appointmentClock,
} from "@/modules/workspace/home-day";
import {
  careLinkCopy,
  receivedWhen,
  type CareLink,
  type ReceivedView,
} from "@/modules/workspace/home-view";
import {
  ContextCardList,
  contextCardsFrom,
} from "@/components/context-card-list";
import { ReceivedSince } from "@/components/received-since";
import { CareLinkAccept } from "@/components/care-link-accept";
import { DoctorWeightChart, type WeightPoint } from "@/components/doctor-weight-chart";
import { preparationQuestions } from "@/modules/return-preparation/questionnaire";
import { onboardingMeasurements, onboardingQuestions } from "@/modules/onboarding/display";
import { ConsultationContextTabs } from "@/components/consultation-context-tabs";

export type BlockAppointment = {
  id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  kind: string;
  status: string;
  doctor_display_name: string;
  teleconsultation?: { delivery_mode: "in_person" | "video"; join_url: string | null };
  patients: { display_name: string } | null;
};

export type BlockDraft = {
  id: string;
  appointment_id: string | null;
  updated_at: string;
};

// A consulta aberta. A mesma estrutura serve à próxima consulta, a qualquer
// linha que a pessoa abrir e à próxima de outro dia: quem é e quando, a ação
// principal, o que o paciente enviou e só então o contexto. O que chegou de
// novo vem primeiro porque é o que o médico ainda não sabe.
export function ConsultationBlock({
  base,
  tenantId,
  today,
  appointment,
  eyebrow,
  link,
  context,
  weight,
  received,
  draft,
  backToNext,
  now,
  compact = false,
}: {
  now: string;
  compact?: boolean;
  base: string;
  tenantId: string;
  today: string;
  appointment: BlockAppointment;
  eyebrow: string;
  link: CareLink;
  context: PatientCareContext | null;
  weight: WeightPoint[] | null;
  received: ReceivedView | null;
  draft: BlockDraft | null;
  backToNext?: string | null;
}) {
  const name = appointment.patients?.display_name ?? "Paciente";
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(appointment.starts_at));
  const agendaHref = `${base}/agenda?data=${date}#consulta-${appointment.id}`;
  const resumesThis = draft && draft.appointment_id === appointment.id;
  const video = appointment.teleconsultation?.delivery_mode === "video";
  const encounterQuery = video ? "?modo=teleconsulta&etapa=consulta" : "";
  // Consulta agendada que já terminou não se "prepara": a ação é ir à Agenda,
  // onde se registra o que aconteceu (concluir, falta). Nada é inferido aqui.
  const preparable =
    appointment.status === "in_progress" ||
    (appointment.status === "scheduled" &&
      Date.parse(appointment.ends_at) > Date.parse(now));
  const titleId = `consulta-${appointment.id}-titulo`;
  const cards =
    link.status === "active" && context
      ? contextCardsFrom(
          base,
          appointment.patient_id,
          context,
          `${base}/pacientes/${appointment.patient_id}`,
        )
      : [];
  const otherCards = cards.filter((card) => card.id !== "preparation");
  const linkCopy = careLinkCopy(link);
  const contextTabs = context ? (
    <ConsultationContextTabs
      initial={<InitialAnswers onboarding={context.onboarding} />}
      preparation={<PreparationAnswers context={context} cards={cards.filter((card) => card.id === "preparation")} compact={compact} base={base} patientId={appointment.patient_id} />}
      received={received ? <ReceivedSince view={received} today={today} tenantId={tenantId} headingId={`consulta-${appointment.id}-recebido`} /> : <p className="home-received-empty">Nenhum envio disponível para esta consulta.</p>}
      prescriptions={<PrescriptionsPanel tenantId={tenantId} patientId={appointment.patient_id} />}
    />
  ) : null;
  const otherContext = otherCards.length ? (
    <section className="doctor-consultation-context doctor-consultation-other" aria-label="Exames, medidas, metas e registros da clínica">
      <h3>Informações para a consulta</h3>
      <ContextCardList cards={otherCards} compactRequests={compact} homeView base={base} patientId={appointment.patient_id} />
    </section>
  ) : null;
  if (compact) return (
    <article className="home-consultation doctor-consultation" aria-labelledby={titleId}>
      <header className="doctor-consultation-identity">
        <span className="dv-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
        <div><p className="home-eyebrow">{eyebrow} · {appointmentClock(appointment.starts_at)}–{appointmentClock(appointment.ends_at)}</p><h2 id={titleId}>{name}</h2><p className="home-consultation-meta">{appointment.kind === "return" ? "Retorno" : "Consulta"} · {appointment.doctor_display_name}</p></div>
        {context && <DoctorWeightChart initialWeight={context.onboarding?.measurements.weightKg != null && context.onboarding.measurements.measuredOn ? { value: context.onboarding.measurements.weightKg, date: context.onboarding.measurements.measuredOn } : null} points={weight} href={`${base}/acompanhamento?aba=evolucao&paciente=${appointment.patient_id}`} />}
      </header>
      {linkCopy ? <div className="home-care-link"><p>{linkCopy}</p>{link.status === "assigned" && <CareLinkAccept tenantId={tenantId} relationshipId={link.relationshipId} version={link.version} patientName={name} />}</div> : <>
        {context && <ConsultationGlance context={context} tenantId={tenantId} />}
        {otherContext}
        {contextTabs}
      </>}
      <div className="home-consultation-actions">
        <Link className="button" href={resumesThis ? `${base}/atendimentos/${draft.id}${encounterQuery}` : agendaHref}>{resumesThis ? "Retomar atendimento" : preparable ? "Preparar atendimento" : "Ver na agenda"}</Link>
        {link.status === "active" && <><Link className="button secondary" href={`${base}/pacientes/${appointment.patient_id}`}>Abrir ficha</Link>
        <Link className="button secondary" href={`${base}/mensagens?paciente=${appointment.patient_id}`}>Mensagem</Link></>}
        {video && preparable && appointment.teleconsultation?.join_url && <TeleconsultationLink url={appointment.teleconsultation.join_url} compact />}
      </div>
      {draft && !resumesThis && <p className="home-draft">Atendimento em rascunho · <Link href={`${base}/atendimentos/${draft.id}`}>Retomar</Link></p>}
      {backToNext && <Link className="home-back" href={backToNext}>Voltar para a próxima consulta</Link>}
    </article>
  );
  return (
    <article className="home-consultation" aria-labelledby={titleId}>
      <header className="home-consultation-head">
        <p className="home-eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{name}</h2>
        <p className="home-consultation-meta">
          <strong>
            {appointmentClock(appointment.starts_at)}–
            {appointmentClock(appointment.ends_at)}
          </strong>
          <span>{appointment.kind === "return" ? "Retorno" : "Consulta"}</span>
          <span>{appointment.doctor_display_name}</span>
          {appointment.status !== "scheduled" &&
          appointment.status !== "in_progress" ? (
            <span className="home-status">
              {dayStatusLabels[appointment.status] ?? appointment.status}
            </span>
          ) : null}
        </p>
        <div className="home-consultation-actions">
          {resumesThis ? (
            <Link className="button" href={`${base}/atendimentos/${draft.id}`}>
              Retomar atendimento
            </Link>
          ) : preparable ? (
            <Link className="button" href={agendaHref}>
              Preparar atendimento
            </Link>
          ) : (
            <Link className="button secondary" href={agendaHref}>
              Ver na agenda
            </Link>
          )}
          {backToNext ? (
            <Link className="home-back" href={backToNext}>
              Voltar para a próxima consulta
            </Link>
          ) : null}
          {compact ? (
            <Link
              className="button secondary"
              href={`${base}/pacientes/${appointment.patient_id}`}
            >
              Abrir ficha
            </Link>
          ) : null}
        </div>
        {draft && !resumesThis ? (
          <p className="home-draft">
            Seu rascunho de atendimento · atualizado{" "}
            {receivedWhen(draft.updated_at, today).replace("Hoje", "hoje")} ·{" "}
            <Link href={`${base}/atendimentos/${draft.id}`}>Retomar</Link>
          </p>
        ) : null}
      </header>
      {linkCopy ? (
        <div className="home-care-link">
          <p>{linkCopy}</p>
          {link.status === "assigned" ? (
            <CareLinkAccept
              tenantId={tenantId}
              relationshipId={link.relationshipId}
              version={link.version}
              patientName={name}
            />
          ) : null}
        </div>
      ) : (
        <>
          {otherContext}
          {contextTabs}
        </>
      )}
    </article>
  );
}

function ConsultationGlance({ context, tenantId }: { context: PatientCareContext; tenantId: string }) {
  const date = (value: string) =>
    new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  return (
    <section className="doctor-consultation-glance" aria-label="Resumo para a consulta">
      <div>
        <h3>Evolução registrada</h3>
        <p className="doctor-evolution-text">{context.encounter?.evolution?.trim() || "Nenhuma evolução finalizada registrada."}</p>
        {context.encounter?.evolution?.trim() && context.encounter.finalized_at && (
          <small>Último atendimento finalizado em {date(context.encounter.finalized_at)}.</small>
        )}
        {context.encounter?.evolution?.trim() && (
          <Link href={`/clinicas/${tenantId}/atendimentos/${context.encounter.id}`}>Ler evolução completa</Link>
        )}
      </div>
    </section>
  );
}

function InitialAnswers({ onboarding }: { onboarding: PatientCareContext["onboarding"] }) {
  if (!onboarding) return <p className="home-received-empty">Cadastro inicial ainda não foi enviado.</p>;
  const submittedDate = (value: string) => new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo",
  });
  return (
    <article className="doctor-consultation-answer-card">
      <h3>Cadastro inicial</h3>
      <p className="doctor-consultation-answer-source">Enviado em {submittedDate(onboarding.submittedAt)} pelo paciente.</p>
      <dl>
        {onboardingQuestions.map(({ id, label }) => <div key={id}><dt>{label}</dt><dd>{onboarding.answers[id]?.trim() ? onboarding.answers[id] : "Não informado"}</dd></div>)}
        <div><dt>Medidas informadas no cadastro</dt><dd>{onboardingMeasurements(onboarding.measurements)}</dd></div>
      </dl>
    </article>
  );
}

function PreparationAnswers({ context, cards, compact, base, patientId }: { context: PatientCareContext; cards: ReturnType<typeof contextCardsFrom>; compact: boolean; base: string; patientId: string }) {
  const current = context.preparation;
  if (!current?.submitted_at || !current.answers)
    return <><p className="home-received-empty">{current ? "Aguardando resposta para esta consulta." : "Pré-consulta não solicitada para esta consulta."}</p><ContextCardList cards={cards} compactRequests={compact} homeView base={base} patientId={patientId} /></>;
  const submittedDate = new Date(current.submitted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  return <><article className="doctor-consultation-answer-card"><h3>Pré-consulta desta consulta</h3><p className="doctor-consultation-answer-source">Enviada em {submittedDate} pelo paciente.</p><dl>{preparationQuestions.map(({ id, label }) => <div key={id}><dt>{label}</dt><dd>{current.answers?.[id]?.trim() ? current.answers[id] : "Não informado"}</dd></div>)}</dl></article><ContextCardList cards={cards} compactRequests={compact} homeView base={base} patientId={patientId} /></>;
}
