import Link from "next/link";
import type { PatientSection } from "@/modules/workspace/navigation";
import { patientSections } from "@/modules/workspace/navigation";
import type { Appointment } from "@/modules/agenda/service";
import { patientNextStep } from "@/modules/workspace/patient-next-step";
import { patientTodayTasks } from "@/modules/workspace/patient-today-tasks";
import { patientNextAppointment } from "@/modules/workspace/patient-appointment";
import { PatientRequiredPreparation } from "./return-preparation-workspace";
import { EmptyModule, FutureButton } from "./module-ui";
import { sentenceCase } from "@/lib/format";

const actions = [
  {
    label: "Orientações médicas",
    text: "Seu plano de cuidado",
    slug: "plano",
    available: true,
  },
  {
    label: "Mensagem para o médico",
    text: "Conversa direta e assíncrona",
    slug: "conversas",
    available: true,
  },
  {
    label: "Tratamento",
    text: "Orientações sobre medicamentos",
    slug: "medicamentos",
    available: false,
  },
  {
    label: "Minha evolução",
    text: "Seu histórico ao longo do tempo",
    slug: "evolucao",
    available: true,
  },
  {
    label: "Meu diário",
    text: "Registre refeições e como você está",
    slug: "diario",
    available: true,
  },
  {
    label: "Meus documentos",
    text: "Enviar exames, fotos e documentos para a clínica",
    slug: "documentos",
    available: true,
  },
  {
    label: "Próximo retorno",
    text: "Consultas com a clínica",
    slug: "consultas",
    available: true,
  },
  {
    label: "Meus relatórios",
    text: "Sínteses compartilhadas pelo médico",
    slug: "relatorios",
    available: true,
  },
] as const;

function actionState(action: (typeof actions)[number]) {
  if (!action.available) return "Em desenvolvimento";
  switch (action.slug) {
    case "plano":
      return "Abrir orientações";
    case "diario":
      return "Registrar refeição ou check-in";
    case "evolucao":
      return "Abrir evolução";
    case "documentos":
      return "Enviar ou abrir documentos";
    case "conversas":
      return "Abrir conversas";
    case "consultas":
      return "Ver consultas";
    default:
      return "Ver relatórios";
  }
}

export function PatientArea({
  section,
  base,
  tenantId,
  appointments = [],
  currentTime,
  latestPublication = null,
  unreadPublication = null,
  onboardingHref,
  pendingCheckInId,
  pendingReturnPreparationId,
  preparationPending,
  requiredPreparation,
  latestMeasurement,
  careRequests = [],
}: {
  section: PatientSection;
  base: string;
  tenantId: string;
  appointments?: Appointment[];
  currentTime: string;
  latestPublication?: { title: string; revision: number } | null;
  unreadPublication?: { title: string; revision: number } | null;
  onboardingHref?: string | null;
  pendingCheckInId?: string | null;
  pendingReturnPreparationId?: string | null;
  preparationPending?: { count: number; first: { id: string; status: string } | null };
  requiredPreparation?: {
    appointmentId: string;
    startsAt: string;
    doctorDisplayName: string;
  } | null;
  latestMeasurement?: {
    measure_label: string;
    measure_value: number;
    measure_unit: string;
    reported_on: string;
  } | null;
  careRequests?: { kind: string; requested_at: string }[];
}) {
  const nextAppointment = patientNextAppointment(appointments, currentTime);
  const latestCompleted = [...appointments]
    .reverse()
    .find((appointment) => appointment.status === "completed");
  const nextStep = patientNextStep({
    base,
    onboardingHref,
    unreadPlanTitle: unreadPublication?.title,
    hasConsultationInProgress: nextAppointment?.status === "in_progress",
    hasUpcomingConsultation: Boolean(nextAppointment),
    hasRequiredPreparation: Boolean(requiredPreparation),
    pendingCheckInId,
    pendingReturnPreparationId,
  });
  const todayTasks = patientTodayTasks({
    base,
    onboardingHref,
    pendingCheckInId,
    hasRequiredPreparation: Boolean(requiredPreparation),
    preparationPending,
    unreadPlan: unreadPublication,
    hasMeasurement: Boolean(latestMeasurement),
    careRequests,
  });
  if (section.slug === "hoje")
    return (
      <>
        <section
          className="panel patient-next-step"
          aria-labelledby="next-step-title"
        >
          <div className="patient-next-step-copy">
            <h2 id="next-step-title">
              <span className="sr-only">Seu próximo passo: </span>
              {nextStep.title}
            </h2>
            <p>{nextStep.detail}</p>
          </div>
          <Link className="button" href={nextStep.href}>
            {nextStep.action}
          </Link>
        </section>
        {requiredPreparation && (
          <PatientRequiredPreparation
            base={base}
            tenantId={tenantId}
            appointment={requiredPreparation}
          />
        )}
        {todayTasks.length > 0 && (
          <section className="panel patient-pending-tasks" aria-labelledby="patient-pending-tasks-title">
            <div className="section-heading">
              <div>
                <h2 id="patient-pending-tasks-title">O que precisa de você</h2>
                <p>Ações disponíveis para você concluir no seu tempo.</p>
              </div>
              <span className="quiet-label">{todayTasks.length} {todayTasks.length === 1 ? "pendência" : "pendências"}</span>
            </div>
            <ol className="patient-pending-task-list">
              {todayTasks.map((task) => (
                <li key={task.id}>
                  <Link href={task.href}>
                    <strong>{task.title}</strong>
                    <span>{task.detail}</span>
                    <span className="action-state">{task.action}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
        <div className="patient-overview">
          <section
            className={`patient-next-appointment${nextAppointment ? "" : " is-empty"}`}
          >
            <div className="patient-card-heading">
              <h2>Próxima consulta</h2>
              {nextAppointment && (
                <span
                  className={`appointment-status ${
                    nextAppointment.status === "in_progress"
                      ? "in-progress"
                      : "scheduled"
                  }`}
                >
                  {nextAppointment.status === "in_progress"
                    ? "Em atendimento"
                    : "Agendada"}
                </span>
              )}
            </div>
            {nextAppointment ? (
              <div className="patient-appointment-content">
                <strong>
                  {sentenceCase(
                    new Date(nextAppointment.starts_at).toLocaleDateString(
                      "pt-BR",
                      {
                        timeZone: "America/Sao_Paulo",
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      },
                    ),
                  )}
                </strong>
                <span className="patient-appointment-time">
                  {new Date(nextAppointment.starts_at).toLocaleTimeString(
                    "pt-BR",
                    {
                      timeZone: "America/Sao_Paulo",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
                <p>
                  {nextAppointment.kind === "return" ? "Retorno" : "Consulta"}
                  {" · "}
                  {nextAppointment.doctor_display_name}
                </p>
              </div>
            ) : (
              <div className="patient-appointment-empty">
                <h3>Nenhuma próxima consulta registrada</h3>
                <p>Quando a equipe agendar um horário, ele aparecerá aqui.</p>
              </div>
            )}
            <Link className="text-action" href={`${base}/consultas`}>
              Ver todos os horários
            </Link>
          </section>
          <section
            className={`panel patient-followup-card${
              latestCompleted || latestPublication ? "" : " is-empty"
            }`}
          >
            <h2>Seu acompanhamento</h2>
            {latestCompleted ? (
              <div className="patient-last-appointment">
                <span>Último atendimento</span>
                <strong>
                  {new Date(latestCompleted.starts_at).toLocaleDateString(
                    "pt-BR",
                    { timeZone: "America/Sao_Paulo", dateStyle: "long" },
                  )}
                </strong>
                <p>{latestCompleted.doctor_display_name}</p>
              </div>
            ) : (
              <div className="patient-last-appointment">
                <span>Seu histórico</span>
                <strong>Ainda não há atendimento concluído</strong>
                <p>Seu histórico será formado a partir das consultas reais.</p>
              </div>
            )}
            <div className="patient-followup-note">
              <strong>Orientações médicas</strong>
              <p>
                {latestPublication
                  ? `${latestPublication.title} · Revisão ${latestPublication.revision} publicada.`
                  : "Nenhum plano publicado disponível. Quando o médico publicar suas orientações, elas aparecerão aqui."}
              </p>
            </div>
            <Link className="text-action" href={`${base}/plano`}>
              Ver orientações médicas
            </Link>
          </section>
        </div>
        <section className="patient-shortcuts">
          <div className="section-heading patient-shortcuts-heading">
            <div>
              <h2>Outras áreas do seu cuidado</h2>
              <p>Registre refeições, acompanhe seus dados e acesse os canais disponíveis na clínica.</p>
            </div>
          </div>
          <div className="quick-actions">
            <Link className={`quick-action measurement-action${latestMeasurement ? "" : " is-pending"}`} href={`${base}/evolucao#atualizar-medidas`}>
              <strong>Atualizar medidas</strong>
              <span>{latestMeasurement ? `${latestMeasurement.measure_label}: ${latestMeasurement.measure_value} ${latestMeasurement.measure_unit}` : "Registre peso, altura ou circunferência abdominal"}</span>
              <span className="action-state">{latestMeasurement ? `Último registro em ${latestMeasurement.reported_on.split("-").reverse().join("/")}` : "Ação pendente"}</span>
            </Link>
            {actions.map((action) => (
              <Link
                className={`quick-action${action.slug === "plano" && unreadPublication ? " is-pending" : ""}${action.available ? "" : " unavailable"}`}
                href={`${base}/${action.slug}`}
                key={action.slug}
              >
                <strong>{action.label}</strong>
                <span>{action.slug === "plano" && latestPublication ? `${latestPublication.title} · Revisão ${latestPublication.revision}` : action.text}</span>
                <span className="action-state">{action.slug === "plano" && unreadPublication ? "1 nova orientação" : actionState(action)}</span>
              </Link>
            ))}
          </div>
        </section>
      </>
    );
  return (
    <>
      <nav className="module-tabs" aria-label="Áreas do meu cuidado">
        {patientSections
          .filter((item) => item.group === "cuidado")
          .map((item) => (
            <Link
              href={`${base}/${item.slug}`}
              key={item.slug}
              aria-current={item.slug === section.slug ? "page" : undefined}
            >
              {item.title}
            </Link>
          ))}
      </nav>
      <p className="patient-care-tabs-hint">
        Deslize para ver todas as áreas do seu cuidado.
      </p>
      {section.slug === "cuidado" ? (
        <section className="panel">
          <h2>Seu cuidado, organizado</h2>
          <ul className="care-directory">
            {patientSections
              .filter(
                (item) => item.group === "cuidado" && item.slug !== "cuidado",
              )
              .map((item) => (
                <li key={item.slug}>
                  <Link href={`${base}/${item.slug}`}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </Link>
                  <span className="quiet-label">
                    {["plano", "consultas", "diario", "evolucao", "documentos", "relatorios"].includes(
                      item.slug,
                    )
                      ? "Disponível"
                      : "Em desenvolvimento"}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>{section.title}</h2>
            {section.slug === "diario" ? (
              <FutureButton>Registrar atualização</FutureButton>
            ) : section.slug === "documentos" ? (
              <FutureButton>Enviar documento</FutureButton>
            ) : null}
          </div>
          <EmptyModule
            title={
              section.slug === "plano"
                ? "Suas orientações aparecerão aqui"
                : section.slug === "medicamentos"
                  ? "Seu tratamento aparecerá aqui"
                  : section.slug === "diario"
                    ? "Seu diário será construído aqui"
                    : section.slug === "consultas"
                      ? "Suas consultas aparecerão aqui"
                      : section.slug === "relatorios"
                        ? "Seus relatórios aparecerão aqui"
                      : "Seus arquivos aparecerão aqui"
            }
          >
            {section.slug === "medicamentos" || section.slug === "plano"
              ? "Esta área ainda não está conectada. Continue seguindo as orientações recebidas diretamente da equipe da clínica."
              : section.slug === "consultas"
                ? "Entre em contato com a clínica para marcar ou alterar seu retorno."
                : "O envio e a consulta de registros serão liberados após a integração. Nenhum dado de exemplo é exibido aqui."}
          </EmptyModule>
        </section>
      )}
    </>
  );
}
