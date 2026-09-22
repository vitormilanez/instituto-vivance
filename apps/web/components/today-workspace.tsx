import Link from "next/link";
import type { ReactNode } from "react";
import type {
  todayWorkspace,
  patientCareContext,
} from "@/modules/workspace/today";
import {
  consultationContextCards,
  contextSummary,
  type ContextCard,
} from "@/modules/workspace/patient-context-cards";

const time = (date: string) =>
  new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
const nextDayLabel = (date: string, today: string) => {
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const formatted = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return date === tomorrow.toISOString().slice(0, 10)
    ? `Amanhã, ${formatted}`
    : formatted;
};
const states: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Falta",
};
// Same status vocabulary the agenda already uses (appointment-status.*) —
// never a risk/urgency color, just which of the five real states this is.
const statusTone = (status: string) =>
  status === "in_progress"
    ? "in-progress"
    : status === "completed"
      ? "completed"
      : status === "cancelled" || status === "no_show"
        ? "cancelled"
        : "scheduled";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

// Um card por tipo de informação, na mesma ordem em todas as telas. Cada card é
// um único alvo focável: ausência também é acionável, nunca um <div> inerte.
export function ContextCardList({ cards }: { cards: ContextCard[] }) {
  return (
    <ul className="context-cards">
      {cards.map((card) => (
        <li key={card.id}>
          <a className={card.pending ? "is-pending" : undefined} href={card.href}>
            <strong>{card.title}</strong>
            <span className="context-state">{card.state}</span>
            <span className="context-action">{card.action}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function contextCardsFrom(
  base: string,
  patientId: string,
  context: NonNullable<Awaited<ReturnType<typeof patientCareContext>>>,
  recordBase?: string,
) {
  const latest = context.publications[0] ?? null;
  return consultationContextCards({
    base,
    recordBase: recordBase ?? `${base}/pacientes/${patientId}`,
    preparation: context.preparation
      ? {
          id: context.preparation.id,
          status: context.preparation.status,
          submittedAt: context.preparation.submitted_at,
        }
      : null,
    documents: {
      total: context.documents.total,
      latestAt: context.documents.latest_at,
    },
    measurements: {
      total: context.measurements.total,
      latestAt: context.measurements.latest_at,
    },
    intake: context.intake,
    encounter: context.encounter
      ? {
          id: context.encounter.id,
          finalizedAt: context.encounter.finalized_at,
        }
      : null,
    publication: latest
      ? {
          planId: latest.plan_id,
          revision: latest.revision,
          publishedAt: latest.published_at,
        }
      : null,
  });
}

export function PatientCareLinks({
  base,
  patientId,
  context,
  recordBase,
}: {
  base: string;
  patientId: string;
  context: NonNullable<Awaited<ReturnType<typeof patientCareContext>>>;
  recordBase?: string;
}) {
  return (
    <ContextCardList
      cards={contextCardsFrom(base, patientId, context, recordBase)}
    />
  );
}

// Consultation first, patient context next, human action, then the day.
// Navy is structural; clinical state is always stated in text.
export function TodayWorkspace({
  base,
  data,
  shortcuts,
}: {
  base: string;
  data: Awaited<ReturnType<typeof todayWorkspace>>;
  // Atalhos ficam entre a próxima consulta e a agenda do dia: depois do que
  // exige ação agora, antes da lista que a pessoa percorre.
  shortcuts?: ReactNode;
}) {
  const { next } = data;
  const nextDate = data.nextDate ?? data.today;
  const isFutureDay = Boolean(next && nextDate !== data.today);
  const active = next && data.drafts.find((p) => p.appointment_id === next.id);
  // Cards de contexto na mesma ordem em qualquer tela, inclusive quando faltam.
  const contextCards =
    next && data.context
      ? contextCardsFrom(
          base,
          next.patient_id,
          data.context,
          `${base}/pacientes/${next.patient_id}`,
        )
      : [];
  const attentionCount =
    data.checkIns.length +
    data.drafts.length +
    data.preparations.length;
  return (
    <>
      <div className="page-heading today-page-heading">
        <div>
          <h1>Hoje</h1>
          <p className="today-date">
            {new Date(`${data.today}T12:00:00Z`).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}{" "}
            · {data.appointments.length}
            {data.truncated ? "+" : ""}{" "}
            {data.appointments.length === 1 ? "agendamento" : "agendamentos"}
          </p>
        </div>
      </div>
      <div className="today-workspace">
        <section className="panel today-next" aria-labelledby="next-title">
          {next ? (
            <>
              <div className="today-next-summary">
                <div className="today-next-heading">
                  <h2 id="next-title">
                    {next.status === "in_progress"
                      ? "Atendimento em andamento"
                      : "Próxima consulta"}
                  </h2>
                  <span
                    className={`badge appointment-status ${statusTone(next.status)}`}
                  >
                    {states[next.status]}
                  </span>
                </div>
                <div className="today-patient">
                  <span
                    className="patient-avatar patient-avatar-xl"
                    aria-hidden="true"
                  >
                    {initials(next.patients?.display_name ?? "Paciente")}
                  </span>
                  <div>
                    <h3>{next.patients?.display_name ?? "Paciente"}</h3>
                    <p>{next.kind === "return" ? "Retorno" : "Consulta"}</p>
                  </div>
                </div>
                <div className="today-consultation-meta">
                  <div className="today-consultation-when">
                    {isFutureDay && (
                      <span>{nextDayLabel(nextDate, data.today)}</span>
                    )}
                    <strong>
                      {time(next.starts_at)}–{time(next.ends_at)}
                    </strong>
                  </div>
                  <span className="today-consultation-doctor">
                    {next.doctor_display_name}
                  </span>
                </div>
                <div className="today-primary-action">
                  {isFutureDay && (
                    <span>Nenhuma consulta restante hoje. Esta é a próxima.</span>
                  )}
                  <Link
                    className="button"
                    href={
                      active
                        ? `${base}/atendimentos/${active.id}`
                        : `${base}/agenda?data=${nextDate}#consulta-${next.id}`
                    }
                  >
                    {active ? "Retomar atendimento" : "Preparar atendimento"}
                  </Link>
                </div>
              </div>
              <div className="today-context">
                <h2>Contexto para esta consulta</h2>
                {data.context ? (
                  <>
                    <p>{contextSummary(contextCards)}</p>
                    <ContextCardList cards={contextCards} />
                  </>
                ) : (
                  <p>
                    Sem vínculo de cuidado ativo com este paciente para o seu
                    acesso. Pré-consulta, exames, medidas e metas aparecem aqui
                    quando o vínculo estiver ativo.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 id="next-title">Próxima consulta</h2>
              <div className="empty">
                <h3>Nenhuma consulta futura agendada</h3>
                <p>
                  Organize o próximo atendimento na Agenda.
                </p>
                <Link className="button secondary" href={`${base}/agenda`}>
                  Organizar agenda
                </Link>
              </div>
            </>
          )}
        </section>
        <aside
          className="panel today-attention"
          aria-labelledby="attention-title"
        >
          <div className="section-heading">
            <h2 id="attention-title">Pendências</h2>
            {attentionCount > 0 && (
              <span className="quiet-label">{attentionCount}</span>
            )}
          </div>
          <p>
            Fila de trabalho, sem classificação de risco clínico.
          </p>
          {attentionCount ? (
            <ul>
              {data.preparations.map((item) => (
                <li key={item.id}>
                  <span className="today-pending-label" data-kind="preparo">Ação pendente</span>
                  <strong>{item.patients?.display_name ?? "Paciente"}</strong>
                  <p>Pré-consulta enviada. Confira as respostas e as prioridades declaradas pela pessoa.</p>
                  <Link href={`${base}/preparo?solicitacao=${item.id}#preparo-${item.id}`}>Checar pré-consulta</Link>
                </li>
              ))}
              {data.checkIns.map((item) => (
                <li key={item.id}>
                  <span className="today-pending-label" data-kind="checkin">Check-in</span>
                  <strong>{item.patients?.display_name ?? "Paciente"}</strong>
                  <p>Check-in enviado e aguardando revisão humana.</p>
                  <Link href={`${base}/acompanhamento#check-in-${item.id}`}>
                    Revisar relato
                  </Link>
                </li>
              ))}
              {data.drafts.map((p) => (
                  <li key={p.id}>
                    <span className="today-pending-label" data-kind="rascunho">Rascunho</span>
                    <strong>{p.patients?.display_name ?? "Paciente"}</strong>
                    <p>Atendimento iniciado, ainda não finalizado.</p>
                    <Link href={`${base}/atendimentos/${p.id}`}>
                      Retomar registro
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="empty">
              <h3>Nenhuma pendência</h3>
              <p>
                Pré-consultas, check-ins enviados e atendimentos em rascunho
                aparecerão aqui.
              </p>
            </div>
          )}
          {data.checkIns.length > 0 ? (
            <Link className="today-attention-more" href={`${base}/acompanhamento`}>
              Abrir acompanhamento
            </Link>
          ) : data.drafts.length > 0 ? (
            <Link className="today-attention-more" href={`${base}/atendimentos`}>
              Abrir atendimentos
            </Link>
          ) : null}
        </aside>
      </div>
      {shortcuts}
      <div className="today-schedule-wrap">
        <section
          className="panel today-schedule"
          aria-labelledby="today-schedule-title"
        >
          <div className="section-heading">
            <h2 id="today-schedule-title">Consultas de hoje</h2>
            <Link href={`${base}/agenda`}>Abrir agenda</Link>
          </div>
          {!data.appointments.length ? (
            <p>Nenhuma consulta agendada hoje.</p>
          ) : (
            <ol className="today-timeline">
              {data.appointments.map((a) => (
                <li
                  key={a.id}
                  className={a.id === next?.id ? "is-next" : undefined}
                >
                  <time dateTime={a.starts_at}>{time(a.starts_at)}</time>
                  <span className="patient-avatar" aria-hidden="true">
                    {initials(a.patients?.display_name ?? "Paciente")}
                  </span>
                  <div>
                    <Link
                      href={`${base}/agenda?data=${data.today}#consulta-${a.id}`}
                    >
                      <strong>{a.patients?.display_name ?? "Paciente"}</strong>
                    </Link>
                    <p>
                      {a.kind === "return" ? "Retorno" : "Consulta"} ·{" "}
                      {states[a.status]}
                    </p>
                  </div>
                  {a.id === next?.id && (
                    <span className={`badge appointment-status ${statusTone(a.status)}`}>
                      {a.status === "in_progress" ? "Em andamento" : "Próxima"}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          {data.truncated && (
            <p>Lista limitada. Abra a Agenda para consultar o período.</p>
          )}
        </section>
      </div>
    </>
  );
}
