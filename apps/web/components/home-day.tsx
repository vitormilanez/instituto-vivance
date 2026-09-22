import Link from "next/link";
import type { ReactNode } from "react";
import type { todayWorkspace } from "@/modules/workspace/today";
import {
  appointmentClock,
  dayCounts,
  dayCountsLine,
  dayHeading,
  dayStatusLabels,
} from "@/modules/workspace/home-day";
import { receivedDateLabel } from "@/modules/workspace/received-items";
import {
  betweenConsultations,
  earlierLabel,
  receivedFailureCopy,
  receivedView,
  receivedWhen,
  rowSummary,
  splitDay,
  type CareLink,
} from "@/modules/workspace/home-view";
import { receivedItemLabels } from "@/modules/workspace/received-items";
import { ConsultationBlock } from "@/components/consultation-block";
import { StickyConsultation } from "@/components/sticky-consultation";
import { RetryButton } from "@/components/retry-button";
import { OpenWork } from "@/components/open-work";

type Data = Awaited<ReturnType<typeof todayWorkspace>>;
type Appointment = Data["appointments"][number];

const futureDayLabel = (date: string, today: string) => {
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const formatted = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const short = formatted.replace("-feira", "");
  return date === tomorrow.toISOString().slice(0, 10)
    ? `Amanhã, ${short}`
    : short;
};

function careLink(data: Data, patientId: string): CareLink {
  const link = data.links.get(patientId);
  if (!link) return { status: "none" };
  if (link.status === "active") return { status: "active" };
  return {
    status: "assigned",
    relationshipId: link.relationshipId,
    version: link.version,
  };
}

// O dia do médico como eixo. A consulta aberta é o único bloco com peso de
// cartão; as outras linhas são texto numa coluna de horários. As consultas que
// já passaram ficam recolhidas antes da próxima, para que ela esteja na
// primeira dobra. Ordem sempre por horário; cor nunca comunica prioridade.
export function HomeDay({
  base,
  data,
  shortcuts,
}: {
  base: string;
  data: Data;
  shortcuts?: ReactNode;
}) {
  const tenantId = base.split("/")[2];
  const counts = dayCounts(
    data.appointments.map((item) => ({
      id: item.id,
      patientId: item.patient_id,
      patientName: item.patients?.display_name ?? "Paciente",
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      status: item.status,
    })),
  );
  const { earlier, rest } = splitDay(data.appointments, data.nextToday);
  const openId = data.open?.id ?? null;
  const openInEarlier = earlier.some((item) => item.id === openId);

  const contextFor = (appointmentId: string) =>
    data.contexts.get(appointmentId) ?? null;

  const viewFor = (appointmentId: string, patientId: string) => {
    const cutoff = data.cutoffs.get(patientId) ?? null;
    return receivedView({
      items: data.received.get(patientId) ?? [],
      cutoff,
      hasPreviousConsultation: Boolean(
        contextFor(appointmentId)?.encounter?.finalized_at,
      ),
      cutoffLabel: receivedDateLabel(cutoff),
      failed: data.failed,
    });
  };

  const draftFor = (patientId: string) =>
    data.drafts.find((draft) => draft.patient_id === patientId) ?? null;

  const block = (appointment: Appointment | NonNullable<Data["next"]>, eyebrow: string) => {
    const link = careLink(data, appointment.patient_id);
    const isNext = appointment.id === data.nextToday;
    return (
      <ConsultationBlock
        base={base}
        now={data.now}
        tenantId={tenantId}
        today={data.today}
        appointment={appointment}
        eyebrow={eyebrow}
        link={link}
        context={link.status === "active" ? contextFor(appointment.id) : null}
        received={
          link.status === "active"
            ? viewFor(appointment.id, appointment.patient_id)
            : null
        }
        draft={draftFor(appointment.patient_id)}
        backToNext={
          !isNext && data.nextToday
            ? `${base}?consulta=${data.nextToday}#consulta-${data.nextToday}`
            : null
        }
      />
    );
  };

  const eyebrowFor = (appointment: Appointment) =>
    appointment.id === data.nextToday
      ? appointment.status === "in_progress"
        ? "Atendimento em andamento"
        : "Próxima consulta"
      : `Consulta · ${dayStatusLabels[appointment.status] ?? appointment.status}`;

  const row = (appointment: Appointment) => {
    const name = appointment.patients?.display_name ?? "Paciente";
    const muted = ["cancelled", "no_show"].includes(appointment.status);
    const isOpen = appointment.id === openId;
    return (
      <li
        key={appointment.id}
        id={`consulta-${appointment.id}`}
        className={`home-row${muted ? " is-muted" : ""}${isOpen ? " is-open" : ""}`}
      >
        <time className="home-clock" dateTime={appointment.starts_at}>
          {appointmentClock(appointment.starts_at)}
        </time>
        {isOpen ? (
          block(appointment, eyebrowFor(appointment))
        ) : (
          <Link
            className="home-row-link"
            href={`${base}?consulta=${appointment.id}#consulta-${appointment.id}`}
            scroll={false}
          >
            <span className="home-row-who">
              <strong>{name}</strong>
              <span>
                {appointment.kind === "return" ? "Retorno" : "Consulta"} ·{" "}
                {dayStatusLabels[appointment.status] ?? appointment.status}
              </span>
            </span>
            {!muted ? (
              <span className="home-row-summary">
                {rowSummary({
                  link: careLink(data, appointment.patient_id),
                  received: data.received.get(appointment.patient_id) ?? [],
                  failed: data.failed,
                })}
              </span>
            ) : null}
          </Link>
        )}
      </li>
    );
  };

  // Próxima consulta de outro dia: o dia de hoje acabou (ou não teve
  // consultas), e ela aparece depois do eixo, com a data dita por extenso.
  const future =
    data.next && !data.nextToday && data.nextDate && data.nextDate !== data.today
      ? data.next
      : null;

  const open = data.open;
  const stickyLabel = open
    ? [
        open.patients?.display_name ?? "Paciente",
        appointmentClock(open.starts_at),
        rowSummary({
          link: careLink(data, open.patient_id),
          received: data.received.get(open.patient_id) ?? [],
          failed: data.failed,
        }),
      ].join(" · ")
    : null;

  const between = betweenConsultations(data.between, data.received);
  // Só a consulta aberta (e a próxima de outro dia) mostra o rascunho no
  // próprio bloco; o de uma linha recolhida continua na fila.
  const blockPatients = new Set(
    [open?.patient_id, future?.patient_id].filter(Boolean) as string[],
  );
  const noConsultations = counts.consultations === 0;

  return (
    <div className="home">
      {open && stickyLabel ? (
        <StickyConsultation targetId={`consulta-${open.id}`} label={stickyLabel} />
      ) : null}
      <header className="home-head">
        <div>
          <h1>{dayHeading(data.today)}</h1>
          <p>
            {dayCountsLine(counts)}
            {data.truncated ? " · lista limitada" : ""}
          </p>
        </div>
        <Link className="home-agenda-link" href={`${base}/agenda`}>
          Abrir agenda
        </Link>
      </header>

      {data.appointments.length ? (
        <ol className="home-timeline" aria-label="Consultas de hoje">
          {earlier.length ? (
            <li className="home-earlier">
              <details open={openInEarlier}>
                <summary>{earlierLabel(earlier.length, !data.nextToday)}</summary>
                <ol className="home-timeline">{earlier.map(row)}</ol>
              </details>
            </li>
          ) : null}
          {rest.map(row)}
        </ol>
      ) : null}

      {future ? (
        <div className="home-future" id={`consulta-${future.id}`}>
          {block(future, `Próxima consulta · ${futureDayLabel(data.nextDate!, data.today)}`)}
        </div>
      ) : !data.nextToday && !data.next ? (
        <section className="panel home-empty" aria-labelledby="home-empty-title">
          <h2 id="home-empty-title">Nenhuma consulta futura agendada</h2>
          <p>Organize o próximo atendimento na Agenda.</p>
          <Link className="button secondary" href={`${base}/agenda`}>
            Organizar agenda
          </Link>
        </section>
      ) : null}

      <OpenWork
        items={
          data.work?.filter(
            (item) =>
              // O rascunho de quem tem consulta aberta na tela já aparece no
              // bloco dela; aqui ficaria repetido.
              !(item.kind === "encounter" && blockPatients.has(item.patientId)),
          ) ?? null
        }
        today={data.today}
      />

      <section className="home-section home-between" aria-labelledby="home-between-title">
        <details open={noConsultations}>
          <summary>
            <h2 id="home-between-title">Entre consultas</h2>
            <span>
              {data.failed.length
                ? "Contagem indisponível"
                : between.length
                  ? `${between.length} ${between.length === 1 ? "paciente enviou" : "pacientes enviaram"} algo desde a última consulta`
                  : "Nada recebido de pacientes sem consulta hoje"}
            </span>
          </summary>
          <p className="home-section-note">
            Pacientes com vínculo ativo com você e sem consulta hoje. Ordem de
            chegada, sem classificação.
          </p>
          {between.length ? (
            <ul className="home-between-list">
              {between.map((patient) => (
                <li key={patient.patientId}>
                  <div className="home-between-who">
                    <strong>{patient.name}</strong>
                    <Link href={`${base}/pacientes/${patient.patientId}`}>
                      Abrir ficha
                    </Link>
                  </div>
                  <ul className="home-received-list">
                    {patient.items.slice(0, 5).map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <a href={item.href}>
                          <strong>{receivedItemLabels[item.kind]}</strong>
                          <time dateTime={item.at}>
                            {receivedWhen(item.at, data.today)}
                          </time>
                          <span className="home-received-open" aria-hidden="true">
                            Abrir
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  {patient.items.length > 5 ? (
                    <p className="home-section-note">
                      e mais {patient.items.length - 5} desde a última consulta.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {data.failed.length ? (
            <div className="home-received-error" role="status">
              <p>
                {receivedFailureCopy(
                  data.failed.map((kind) => receivedItemLabels[kind]),
                )}
              </p>
              <RetryButton />
            </div>
          ) : null}
        </details>
      </section>

      {shortcuts}
    </div>
  );
}
