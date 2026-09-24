import { TeleconsultationLink } from "./teleconsultation-link";
import Link from "next/link";
import type { Appointment } from "@/modules/agenda/service";
import { patientTodayTasks } from "@/modules/workspace/patient-today-tasks";
import { patientNextAppointment } from "@/modules/workspace/patient-appointment";
import {
  appointmentWhen,
  homeGreeting,
  patientFocus,
  quickLogs,
  sentLabels,
  sentWhen,
  type SentItem,
} from "@/modules/workspace/patient-home";
import { Icon, type IconName } from "./patient/icons";
import { StartPreparationButton } from "./patient/start-preparation";
import type { PatientCheckInState } from "@/modules/daily-check-ins/service";

const logIcons: Record<string, IconName> = {
  measurements: "scale",
  meal: "food",
  document: "file",
  message: "chat",
};

// A Home do paciente responde "o que eu faço agora?": uma ação em destaque,
// registrar a um toque, a próxima consulta, a orientação publicada e a
// confirmação do que já foi enviado. Nada de interpretação: só o que a pessoa
// fez e o que o médico publicou.
export function PatientHome({
  base,
  tenantId,
  today,
  now,
  justSent = null,
  checkIn = null,
  firstName,
  appointments,
  currentTime,
  latestPublication,
  unreadPublication,
  onboardingHref,
  pendingCheckInId,
  preparationPending,
  requiredPreparation,
  latestMeasurement,
  careRequests,
  sent,
}: {
  base: string;
  tenantId: string;
  today: string;
  now: Date;
  justSent?: string | null;
  checkIn?: PatientCheckInState | null;
  firstName: string | null;
  appointments: Appointment[];
  currentTime: string;
  latestPublication: { title: string; revision: number; published_at?: string | null } | null;
  unreadPublication: { title: string; revision: number } | null;
  onboardingHref: string | null;
  pendingCheckInId: string | null;
  preparationPending?: { count: number; first: { id: string; status: string } | null };
  requiredPreparation: {
    appointmentId: string;
    startsAt: string;
    doctorDisplayName: string;
  } | null;
  latestMeasurement: {
    measure_label: string;
    measure_value: number;
    measure_unit: string;
    reported_on: string;
  } | null;
  careRequests: { kind: string; requested_at: string }[];
  sent: SentItem[] | null;
}) {
  const next = patientNextAppointment(appointments, currentTime);
  const doctorName =
    next?.doctor_display_name ??
    [...appointments].reverse().find((item) => item.doctor_display_name)?.doctor_display_name ??
    null;
  const tasks = patientTodayTasks({
    base,
    onboardingHref,
    pendingCheckInId,
    hasRequiredPreparation: Boolean(requiredPreparation),
    preparationPending,
    unreadPlan: unreadPublication,
    hasMeasurement: Boolean(latestMeasurement),
    careRequests,
  });
  const { focus, rest } = patientFocus({
    base,
    consultationInProgress: next?.status === "in_progress",
    tasks,
  });
  const firstTask = tasks[0];
  // O check-in diário é a ação do dia: vem antes de tudo, exceto consulta em
  // andamento. Os pedidos continuam logo abaixo, em "Também para você".
  const dailyDue = Boolean(checkIn?.due) && focus.kind !== "consultation";
  const restTasks = dailyDue && focus.kind === "task" ? tasks : rest;
  const isCheckIn = !dailyDue && focus.kind === "task" && firstTask?.id.startsWith("check-in-");
  const isRequired = focus.kind === "task" && firstTask?.id === "required-preparation";
  const logs = quickLogs({ base, doctorName, latestMeasurement });
  const greeting = homeGreeting(now, firstName);
  const when = next ? appointmentWhen(next.starts_at, next.ends_at, today) : null;

  return (
    <div className="pv-stack">
      {justSent && (
        <p className="pv-status" role="status">
          <Icon name="check" size={20} />
          {justSent === "Lembrete ativado" ? `${justSent} ✓` : `${justSent} ✓ · Guardado no seu histórico.`}
        </p>
      )}
      <div className="pv-greeting">
        <p>{greeting.date}</p>
        <h1>{greeting.hello}</h1>
      </div>

      {dailyDue ? (
        <section className="pv-hero" aria-labelledby="pv-focus-title">
          <p className="pv-eyebrow">Agora · check-in de hoje</p>
          <h2 id="pv-focus-title" className="pv-big">Como você está reagindo ao tratamento?</h2>
          <p className="pv-lead">Com toques · cerca de 1 minuto</p>
          <Link className="pv-button is-gold" href={`${base}/checkin`}>
            Começar check-in
            <Icon name="arrow" size={22} />
          </Link>
        </section>
      ) : isCheckIn ? (
        <section className="pv-hero" aria-labelledby="pv-focus-title">
          <p className="pv-eyebrow">Agora · check-in</p>
          <h2 id="pv-focus-title" className="pv-big">Como você está reagindo ao tratamento?</h2>
          <p className="pv-lead">{focus.detail}</p>
          <Link className="pv-button is-gold" href={focus.href}>
            {focus.action}
            <Icon name="arrow" size={22} />
          </Link>
        </section>
      ) : focus.kind === "clear" ? (
        <section className="pv-card" aria-labelledby="pv-focus-title">
          <span className="pv-clear-icon" aria-hidden="true"><Icon name="check" /></span>
          <h2 id="pv-focus-title" className="pv-big">Tudo em dia por hoje</h2>
          <p className="pv-lead">
            {checkIn
              ? `Próximo check-in: ${checkIn.nextLabel}.`
              : "Não há nada pendente com você agora. Se quiser, registre seu peso ou uma refeição."}
          </p>
          {checkIn && checkIn.recentCount > 0 && (
            <p className="pv-card-foot">
              {checkIn.recentCount} {checkIn.recentCount === 1 ? "check-in" : "check-ins"} nas últimas 2 semanas
            </p>
          )}
        </section>
      ) : (
        <section className="pv-card pv-focus" aria-labelledby="pv-focus-title">
          <p className="pv-eyebrow">
            {focus.kind === "consultation"
              ? "Agora"
              : isRequired && requiredPreparation
                ? `Pedido de ${requiredPreparation.doctorDisplayName}`
                : "Seu próximo passo"}
          </p>
          <h2 id="pv-focus-title" className="pv-big">{focus.title}</h2>
          <p className="pv-lead">{focus.detail}</p>
          {isRequired ? (
            <StartPreparationButton base={base} tenantId={tenantId} label={focus.action} />
          ) : (
            <Link className="pv-button" href={focus.href}>
              {focus.action}
              <Icon name="arrow" size={22} />
            </Link>
          )}
        </section>
      )}

      {restTasks.length > 0 && (
        <section className="pv-section" aria-labelledby="pv-rest-title">
          <h2 id="pv-rest-title" className="pv-eyebrow">Também para você</h2>
          <ul className="pv-tasks">
            {restTasks.map((task) =>
              task.id === "required-preparation" ? (
                <li key={task.id} className="pv-card pv-task-card">
                  <strong>{task.title}</strong>
                  <small className="pv-muted">{task.detail}</small>
                  <StartPreparationButton base={base} tenantId={tenantId} label={task.action} />
                </li>
              ) : (
              <li key={task.id}>
                <Link href={task.href}>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.detail}</small>
                  </span>
                  <Icon name="chevR" size={20} />
                </Link>
              </li>
              ),
            )}
          </ul>
        </section>
      )}

      <section className="pv-section" aria-labelledby="pv-log-title">
        <h2 id="pv-log-title" className="pv-eyebrow">Registrar</h2>
        <ul className="pv-quick">
          {logs.map((log) => (
            <li key={log.id}>
              <Link href={log.href}>
                <Icon name={logIcons[log.id]} />
                <span>{log.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="pv-card" aria-labelledby="pv-next-title">
        <h2 id="pv-next-title" className="pv-eyebrow">Próxima consulta</h2>
        {next && when ? (
          <Link className="pv-row-link" href={`${base}/cuidado#consultas`}>
            <span className="pv-date-badge" aria-hidden="true">
              <b>{when.day}</b>
              <i>{when.month}</i>
            </span>
            <span>
              <strong>{when.line}</strong>
              <small>
                {next.status === "in_progress" ? "Acontecendo agora · " : ""}
                {next.doctor_display_name}
              </small>
            </span>
            <Icon name="chevR" size={22} />
          </Link>
        ) : (
          <p className="pv-lead">Ainda não marcada. A clínica avisa quando agendar.</p>
        )}
      </section>

      {next?.teleconsultation?.join_url && <section className="pv-card" aria-label="Acesso à teleconsulta">
        <h2 className="pv-eyebrow">Sua teleconsulta</h2>
        <p>Entre pelo link no horário combinado com seu médico.</p>
        <TeleconsultationLink url={next.teleconsultation.join_url} compact />
      </section>}

      {latestPublication && (
        <section className="pv-card" aria-labelledby="pv-plan-title">
          <h2 id="pv-plan-title" className="pv-eyebrow">Orientação do seu médico</h2>
          <Link className="pv-row-link" href={`${base}/cuidado#orientacoes`}>
            <span>
              <strong>{latestPublication.title}</strong>
              <small>{unreadPublication ? "Nova · toque para ler" : `Revisão ${latestPublication.revision}`}</small>
            </span>
            <Icon name="chevR" size={22} />
          </Link>
        </section>
      )}

      {sent && (
        <section className="pv-card" aria-labelledby="pv-sent-title">
          <h2 id="pv-sent-title" className="pv-eyebrow">Seus últimos envios</h2>
          {sent.length ? (
            <ul className="pv-list">
              {sent.slice(0, 3).map((item) => (
                <li key={`${item.kind}-${item.key}`}>
                  <strong>{sentLabels[item.kind]}</strong>
                  <time className="pv-sent-when" dateTime={item.at}>
                    <Icon name="check" size={16} />
                    Enviado {sentWhen(item.at, today)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pv-lead">
              Tudo o que você enviar aparece aqui, do jeito que enviou, com data e hora.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
