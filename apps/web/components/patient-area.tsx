import Link from "next/link";
import type { PatientSection } from "@/modules/workspace/navigation";
import { patientSections } from "@/modules/workspace/navigation";
import type { Appointment } from "@/modules/agenda/service";
import { patientNextStep } from "@/modules/workspace/patient-next-step";
import { EmptyModule, FutureButton } from "./module-ui";

const actions = [
  { label: "Orientações médicas", text: "Seu plano de cuidado", slug: "plano" },
  {
    label: "Mensagem para o médico",
    text: "Conversa direta e assíncrona",
    slug: "conversas",
  },
  {
    label: "Tratamento",
    text: "Orientações sobre medicamentos",
    slug: "medicamentos",
  },
  {
    label: "Minha evolução",
    text: "Seu histórico ao longo do tempo",
    slug: "evolucao",
  },
  { label: "Meu diário", text: "Como você está se sentindo", slug: "diario" },
  {
    label: "Meus documentos",
    text: "Arquivos compartilhados com a clínica",
    slug: "documentos",
  },
  {
    label: "Próximo retorno",
    text: "Consultas com a clínica",
    slug: "consultas",
  },
  {
    label: "Meus relatórios",
    text: "Sínteses compartilhadas pelo médico",
    slug: "relatorios",
  },
] as const;

export function PatientArea({
  section,
  base,
  appointments = [],
  currentTime,
  latestPublication = null,
  onboardingHref,
  pendingCheckInId,
}: {
  section: PatientSection;
  base: string;
  appointments?: Appointment[];
  currentTime: string;
  latestPublication?: { title: string; revision: number } | null;
  onboardingHref?: string | null;
  pendingCheckInId?: string | null;
}) {
  const nextAppointment = appointments.find(
    (appointment) =>
      appointment.status === "in_progress" ||
      (appointment.status === "scheduled" &&
        appointment.ends_at >= currentTime),
  );
  const latestCompleted = [...appointments]
    .reverse()
    .find((appointment) => appointment.status === "completed");
  const nextStep = patientNextStep({
    base,
    onboardingHref,
    publishedPlanTitle: latestPublication?.title,
    hasConsultationInProgress: Boolean(
      appointments.some((appointment) => appointment.status === "in_progress"),
    ),
    hasUpcomingConsultation: Boolean(nextAppointment),
    pendingCheckInId,
  });
  if (section.slug === "hoje")
    return (
      <>
        <section className="panel patient-next-step" aria-labelledby="next-step-title">
          <span className="quiet-label">Seu próximo passo</span>
          <h2 id="next-step-title">{nextStep.title}</h2>
          <p>{nextStep.detail}</p>
          <Link className="button" href={nextStep.href}>
            {nextStep.action}
          </Link>
        </section>
        <div className="patient-overview">
          <section className="patient-next-appointment">
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
                  {new Date(nextAppointment.starts_at).toLocaleDateString(
                    "pt-BR",
                    {
                      timeZone: "America/Sao_Paulo",
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    },
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
          <section className="panel patient-followup-card">
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
          <h2>Outras áreas do seu cuidado</h2>
          <div className="quick-actions">
            {actions.map((action) => (
              <Link
                className="quick-action"
                href={`${base}/${action.slug}`}
                key={action.slug}
              >
                <strong>{action.label}</strong>
                <span>{action.text}</span>
                <span className="action-state">
                  {action.slug === "plano"
                    ? "Abrir orientações"
                    : action.slug === "diario"
                      ? "Abrir check-ins"
                      : action.slug === "evolucao"
                        ? "Abrir evolução"
                      : action.slug === "documentos"
                        ? "Abrir documentos"
                        : action.slug === "conversas"
                          ? "Abrir conversas"
                          : "Conhecer a área"}
                </span>
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
