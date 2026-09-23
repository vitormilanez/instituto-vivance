import Link from "next/link";
import type { Appointment } from "@/modules/agenda/service";
import { patientTodayTasks } from "@/modules/workspace/patient-today-tasks";
import { patientNextAppointment } from "@/modules/workspace/patient-appointment";
import {
  patientFocus,
  quickLogs,
  sentLabels,
  sentWhen,
  type SentItem,
} from "@/modules/workspace/patient-home";
import { PatientRequiredPreparation } from "./return-preparation-workspace";
import { sentenceCase } from "@/lib/format";

// Ícones de traço 1.6, 24px — a mesma família da barra do celular.
const logIcons: Record<string, string> = {
  measurements: "M4 20h16M6 20V9m6 11V4m6 16v-7",
  meal: "M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v8a2 2 0 0 1-2 2M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9",
  document: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  message: "M4 5h16v11H9l-5 4z",
};
function LogIcon({ id }: { id: string }) {
  return (
    <span className="phome-log-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d={logIcons[id]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// A Home do paciente: uma ação em destaque, o resto da fila curto, atalhos
// para registrar e a confirmação do que já foi enviado. Os outros destinos
// continuam no menu — aqui não se repete a navegação.
export function PatientHome({
  base,
  tenantId,
  today,
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
  appointments: Appointment[];
  currentTime: string;
  latestPublication: { title: string; revision: number } | null;
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
  const logs = quickLogs({ base, doctorName, latestMeasurement });

  return (
    <div className="phome">
      <section
        className={`phome-focus${focus.kind === "clear" ? " is-clear" : ""}`}
        aria-labelledby="phome-focus-title"
      >
        <p className="phome-eyebrow">
          {focus.kind === "clear" ? "Seu acompanhamento" : "Seu próximo passo"}
        </p>
        <h2 id="phome-focus-title">{focus.title}</h2>
        <p>{focus.detail}</p>
        <Link className="button" href={focus.href}>
          {focus.action}
        </Link>
      </section>

      {requiredPreparation && (
        <PatientRequiredPreparation
          base={base}
          tenantId={tenantId}
          appointment={requiredPreparation}
        />
      )}

      {rest.length > 0 && (
        <section className="phome-section" aria-labelledby="phome-rest-title">
          <h2 id="phome-rest-title">Também para você</h2>
          <ul className="phome-tasks">
            {rest.map((task) => (
              <li key={task.id}>
                <Link href={task.href}>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.detail}</small>
                  </span>
                  <span className="phome-go" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="phome-section" aria-labelledby="phome-log-title">
        <h2 id="phome-log-title">Registrar agora</h2>
        <ul className="phome-logs">
          {logs.map((log) => (
            <li key={log.id}>
              <Link href={log.href}>
                <LogIcon id={log.id} />
                <strong>{log.title}</strong>
                <small>{log.hint}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="phome-section phome-care" aria-labelledby="phome-care-title">
        <h2 id="phome-care-title">Seu acompanhamento</h2>
        <dl>
          <div>
            <dt>Próxima consulta</dt>
            <dd>
              {next ? (
                <>
                  <strong>
                    {sentenceCase(
                      new Date(next.starts_at).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }),
                    )}
                    {", "}
                    {new Date(next.starts_at).toLocaleTimeString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                  <span>
                    {next.kind === "return" ? "Retorno" : "Consulta"} · {next.doctor_display_name}
                  </span>
                </>
              ) : (
                <span>Ainda não marcada. A clínica avisa quando agendar.</span>
              )}
            </dd>
            <Link href={`${base}/consultas`}>Ver consultas</Link>
          </div>
          <div>
            <dt>Orientações médicas</dt>
            <dd>
              {latestPublication ? (
                <>
                  <strong>{latestPublication.title}</strong>
                  <span>
                    {unreadPublication ? "Nova orientação para ler" : `Revisão ${latestPublication.revision}`}
                  </span>
                </>
              ) : (
                <span>Aparecem aqui quando o seu médico publicar.</span>
              )}
            </dd>
            <Link href={`${base}/plano`}>Ver orientações</Link>
          </div>
        </dl>
      </section>

      {sent && (
        <section className="phome-section" aria-labelledby="phome-sent-title">
          <h2 id="phome-sent-title">Seus últimos envios</h2>
          {sent.length ? (
            <>
              <ul className="phome-sent">
                {sent.map((item) => (
                  <li key={`${item.kind}-${item.key}`}>
                    <span className="phome-sent-check" aria-hidden="true">✓</span>
                    <span>
                      <strong>{sentLabels[item.kind]}</strong>
                      {item.detail ? <small>{item.detail}</small> : null}
                    </span>
                    <time dateTime={item.at}>Enviado {sentWhen(item.at, today)}</time>
                  </li>
                ))}
              </ul>
              <p className="phome-note">
                Chegou para a sua equipe. Este não é um canal de urgência.
              </p>
            </>
          ) : (
            <p className="phome-note">
              Quando você registrar algo, aparece aqui para você saber que chegou.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
