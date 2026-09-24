import Link from "next/link";
import { TeleconsultationLink } from "./teleconsultation-link";
import type { PatientCareContext } from "@/modules/workspace/today";
import { contextSummary } from "@/modules/workspace/patient-context-cards";
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
  const linkCopy = careLinkCopy(link);
  if (compact) return (
    <article className="home-consultation doctor-consultation" aria-labelledby={titleId}>
      <header className="doctor-consultation-identity">
        <span className="dv-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
        <div><p className="home-eyebrow">{eyebrow} · {appointmentClock(appointment.starts_at)}–{appointmentClock(appointment.ends_at)}</p><h2 id={titleId}>{name}</h2><p className="home-consultation-meta">{appointment.kind === "return" ? "Retorno" : "Consulta"} · {appointment.doctor_display_name}</p></div>
      </header>
      {linkCopy ? <div className="home-care-link"><p>{linkCopy}</p>{link.status === "assigned" && <CareLinkAccept tenantId={tenantId} relationshipId={link.relationshipId} version={link.version} patientName={name} />}</div> : <>
        {context && <ConsultationGlance context={context} tenantId={tenantId} />}
        {context && <div className="doctor-consultation-context"><ContextCardList cards={cards} compactRequests={compact} homeView base={base} patientId={appointment.patient_id} /></div>}
      </>}
      <div className="home-consultation-actions">
        <Link className="button" href={resumesThis ? `${base}/atendimentos/${draft.id}${encounterQuery}` : agendaHref}>{resumesThis ? "Retomar atendimento" : preparable ? "Preparar atendimento" : "Ver na agenda"}</Link>
        <Link className="button secondary" href={`${base}/pacientes/${appointment.patient_id}`}>Abrir ficha</Link>
        <Link className="button secondary" href={`${base}/mensagens?paciente=${appointment.patient_id}`}>Mensagem</Link>
      </div>
      {video && preparable && appointment.teleconsultation?.join_url && <TeleconsultationLink url={appointment.teleconsultation.join_url} compact />}
      {draft && !resumesThis && <p className="home-draft">Atendimento em rascunho · <Link href={`${base}/atendimentos/${draft.id}`}>Retomar</Link></p>}
      {received && !linkCopy && <details className="doctor-consultation-received"><summary>O que chegou desde a última consulta</summary><ReceivedSince view={received} today={today} tenantId={tenantId} headingId={`consulta-${appointment.id}-recebido`} /></details>}
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
          {received ? (
            <ReceivedSince
              view={received}
              today={today}
              tenantId={tenantId}
              headingId={`consulta-${appointment.id}-recebido`}
            />
          ) : null}
          {context ? (
            <section
              className="home-context"
              aria-labelledby={`consulta-${appointment.id}-contexto`}
            >
              <h3 id={`consulta-${appointment.id}-contexto`}>
                Contexto para esta consulta
              </h3>
              <p>{contextSummary(cards)}</p>
              <ContextCardList
                cards={cards}
                compactRequests={compact}
                base={base}
                patientId={appointment.patient_id}
              />
            </section>
          ) : null}
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
  const current = context.preparation;
  const currentGoal = current?.goal ?? null;
  const previous = context.previousPreparation;
  const currentAnswer = current?.submitted_at
    ? currentGoal
      ? `Respondido em ${date(current.submitted_at)}`
      : `Respondido em ${date(current.submitted_at)}; sem assunto principal informado.`
    : current
      ? "Aguardando resposta para esta consulta."
      : "Pré-consulta não solicitada para esta consulta.";

  return (
    <section className="doctor-consultation-glance" aria-label="Resumo para a consulta">
      <div>
        <h3>Evolução registrada</h3>
        <p>{context.encounter?.evolution?.trim() || "Nenhuma evolução finalizada registrada."}</p>
        {context.encounter?.evolution?.trim() && context.encounter.finalized_at && (
          <small>Último atendimento finalizado em {date(context.encounter.finalized_at)}.</small>
        )}
        {context.encounter?.evolution?.trim() && (
          <Link href={`/clinicas/${tenantId}/atendimentos/${context.encounter.id}`}>Ler evolução completa</Link>
        )}
      </div>
      <div>
        <h3>O que o paciente procura nesta consulta</h3>
        <p>{currentGoal || currentAnswer}</p>
        {currentGoal && current?.submitted_at ? (
          <small>Resposta desta consulta enviada em {date(current.submitted_at)}.</small>
        ) : previous?.goal ? (
          <p className="doctor-consultation-previous-answer">
            Resposta anterior enviada em {date(previous.submitted_at)}: {previous.goal}
          </p>
        ) : null}
      </div>
    </section>
  );
}
