import {
  getPatientOnboarding,
  OnboardingError,
} from "@/modules/onboarding/service";
import { notFound, redirect } from "next/navigation";
import { myPatientProfile } from "@/modules/patients/portal";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { findPatientSection } from "@/modules/workspace/navigation";
import { PatientShell } from "@/components/patient-shell";
import { PatientArea } from "@/components/patient-area";
import { PatientHome } from "@/components/patient-home";
import { patientRecentSent } from "@/modules/workspace/patient-sent";
import { DevelopmentNotice } from "@/components/module-ui";
import { listAppointments } from "@/modules/agenda/service";
import { clinicDate } from "@/modules/agenda/validation";
import { AppointmentList } from "@/components/agenda";
import { requestInstant } from "@/lib/request-time";
import { patientPublications } from "@/modules/care-plans/publication-service";
import { PublishedPlans } from "@/components/published-plans";
import { patientCheckIns } from "@/modules/check-ins/service";
import { PatientCheckIns } from "@/components/patient-check-ins";
import { PatientMealLogs } from "@/components/patient-meal-logs";
import { patientMeals } from "@/modules/meals/service";
import { patientLongitudinal } from "@/modules/longitudinal/service";
import { PatientLongitudinalWorkspace } from "@/components/longitudinal-workspace";
import { PatientMeasurements } from "@/components/patient-measurements";
import { patientMeasurementSummary } from "@/modules/measurements/service";
import { patientDocuments } from "@/modules/documents/service";
import { PatientDocumentsWorkspace } from "@/components/documents-workspace";
import { patientMessages } from "@/modules/messages/service";
import { PatientMessagesWorkspace } from "@/components/messages-workspace";
import { patientReportPublications } from "@/modules/reports/publication-service";
import { PublishedReports } from "@/components/published-reports";
import { patientPreparationPending, patientPreparationRequirement, patientReturnPreparations } from "@/modules/return-preparation/service";
import { PatientReturnPreparationWorkspace } from "@/components/return-preparation-workspace";
import { myPendingCareRequests } from "@/modules/care-requests/service";
export const dynamic = "force-dynamic";

export default async function PatientAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; section: string }>;
  searchParams: Promise<{ pagina?: string; preparo?: string; medico?: string | string[]; inicio?: string; fim?: string; cursor?: string }>;
}) {
  const { tenantId, section: slug } = await params;
  const section = findPatientSection(slug);
  if (!section) notFound();
  const { clinic, patient } = await myPatientProfile(tenantId).catch(
    (error) => {
      if (error instanceof AccessError && error.status === 401) redirect("/");
      if (error instanceof AccessError || error instanceof InputError)
        notFound();
      throw error;
    },
  );
  const requestDate = requestInstant();
  const now = requestDate.getTime();
  const currentTime = requestDate.toISOString();
  const query = await searchParams;
  // Tudo o que a página lê depende só do perfil e da seção: as leituras
  // rodam juntas. Em série, cada ida ao banco somava latência à anterior.
  const [
    onboarding,
    published,
    checkIns,
    meals,
    longitudinal,
    documents,
    messages,
    reports,
    preparations,
    preparationPending,
    requiredPreparation,
    latestMeasurement,
    careRequests,
    sent,
    appointments,
  ] = await Promise.all([
    // onboarding
    patient && slug === "hoje"
      ? getPatientOnboarding(tenantId).catch((error) => {
          if (error instanceof OnboardingError && error.status === 404)
            return null;
          throw error;
        })
      : null,
    // published
    patient && ["plano", "hoje"].includes(slug)
      ? patientPublications(
          tenantId,
          slug === "plano" ? query.pagina : undefined,
        )
      : null,
    // checkIns
    patient && ["diario", "hoje"].includes(slug)
      ? patientCheckIns(tenantId, query.pagina)
      : null,
    // meals
    patient && slug === "diario" ? patientMeals(tenantId) : null,
    // longitudinal
    patient && slug === "evolucao"
      ? patientLongitudinal(tenantId, {
          from: query.inicio,
          to: query.fim,
          cursor: query.cursor,
        }).catch((error) => {
          if (error instanceof InputError)
            redirect(`/clinicas/${tenantId}/meu-cuidado/evolucao`);
          throw error;
        })
      : null,
    // documents
    patient && slug === "documentos"
      ? patientDocuments(tenantId, query.pagina)
      : null,
    // messages
    slug === "conversas"
      ? patientMessages(tenantId, query.medico, query.pagina).catch(
          (error) => {
            if (error instanceof InputError)
              redirect(`/clinicas/${tenantId}/meu-cuidado/conversas`);
            throw error;
          },
        )
      : null,
    // reports
    patient && slug === "relatorios"
      ? patientReportPublications(tenantId, query.pagina)
      : null,
    // preparations
    patient && slug === "hoje"
      ? patientReturnPreparations(tenantId, query.preparo ? undefined : query.pagina, query.preparo).catch((error) => {
          if (error instanceof InputError) redirect(`/clinicas/${tenantId}/meu-cuidado/hoje`);
          throw error;
        })
      : null,
    // preparationPending
    patient && slug === "hoje" ? patientPreparationPending(tenantId) : undefined,
    // requiredPreparation
    patient && slug === "hoje"
    ? patientPreparationRequirement(tenantId)
    : null,
    // latestMeasurement: na Home e no formulário de peso (Evolução)
    patient && (slug === "hoje" || slug === "evolucao")
    ? patientMeasurementSummary(tenantId)
    : null,
    // careRequests: o que a equipe pediu vira tarefa no "Hoje"
    patient && slug === "hoje"
    ? myPendingCareRequests(tenantId)
    : [],
    // sent: o que a pessoa já enviou; falha vira ausência da seção
    patient && slug === "hoje"
    ? patientRecentSent(tenantId).catch(() => null)
    : null,
    // appointments
    slug === "consultas" || slug === "hoje"
      ? listAppointments(
          tenantId,
          clinicDate(new Date(now - 30 * 86400000)),
          clinicDate(new Date(now + 60 * 86400000)),
        )
      : null,
  ]);
  const latestPublication = published?.publications[0] ?? null;
  const unreadPublication =
    published?.publications.find((publication) => !publication.care_plan_receipts[0]) ??
    null;
  return (
    <PatientShell clinic={clinic} active={section.slug}>
      {patient ? (
        <header className="patient-portal-header">
          <span
            className="patient-avatar patient-avatar-large"
            aria-hidden="true"
          >
            {patient.display_name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h1>
              {section.slug === "hoje"
                ? `Olá, ${patient.display_name.split(/\s+/)[0]}.`
                : section.title}
            </h1>
            <p>
              {section.slug === "hoje"
                ? "Consultas e próximos passos do seu acompanhamento, em um só lugar."
                : section.description}
            </p>
          </div>
        </header>
      ) : (
        <div className="page-heading">
          <div>
            <h1>{section.title}</h1>
            <p>{section.description}</p>
          </div>
        </div>
      )}
      {!patient && (
        <p className="notice">
          A equipe ainda precisa vincular sua conta à sua ficha. Entre em
          contato com a clínica.
        </p>
      )}
      {slug === "relatorios" && reports ? (
        <PublishedReports initial={reports} />
      ) : slug === "conversas" && messages ? (
        <PatientMessagesWorkspace initial={messages} />
      ) : slug === "documentos" && documents ? (
        <PatientDocumentsWorkspace initial={documents} />
      ) : slug === "evolucao" && longitudinal ? (
        <>
          <PatientMeasurements
            tenant={tenantId}
            today={clinicDate()}
            last={
              latestMeasurement?.measure_label === "Peso"
                ? {
                    value: Number(latestMeasurement.measure_value),
                    reportedOn: latestMeasurement.reported_on,
                  }
                : null
            }
          />
          <PatientLongitudinalWorkspace
            initial={longitudinal}
            base={`/clinicas/${tenantId}/meu-cuidado`}
          />
        </>
      ) : slug === "diario" && checkIns && meals ? (
        <>
          <PatientMealLogs initial={meals} />
          <PatientCheckIns initial={checkIns} today={clinicDate()} />
        </>
      ) : slug === "plano" && published ? (
        <PublishedPlans initial={published} />
      ) : appointments ? (
        section.slug === "consultas" ? (
          <section className="panel patient-appointments-panel">
            <div className="section-heading">
              <div>
                <h2>Suas consultas</h2>
                <p>Últimos 30 dias e próximos 60 dias · horário de Brasília.</p>
              </div>
            </div>
            {appointments.truncated && (
              <p role="alert">
                A lista atingiu o limite de registros. Consulte a equipe.
              </p>
            )}
            <AppointmentList
              appointments={appointments.appointments}
              currentTime={currentTime}
            />
            <p className="module-footnote">
              Para marcar ou alterar um horário, entre em contato com a clínica.
            </p>
          </section>
        ) : (
          <>
            <PatientHome
              base={`/clinicas/${tenantId}/meu-cuidado`}
              tenantId={tenantId}
              today={clinicDate()}
              appointments={appointments.appointments}
              currentTime={currentTime}
              latestPublication={latestPublication}
              unreadPublication={unreadPublication}
              onboardingHref={
                onboarding?.status === "draft"
                  ? `/clinicas/${tenantId}/primeiros-passos`
                  : null
              }
              pendingCheckInId={
                checkIns?.checkIns.find((item) => item.status === "pending")?.id ??
                null
              }
              preparationPending={preparationPending}
              requiredPreparation={requiredPreparation}
              latestMeasurement={latestMeasurement}
              careRequests={careRequests}
              sent={sent}
            />
            {/* Na Home só aparece o preparo que ainda espera a pessoa (ou o que
                ela abriu pelo link). O que já foi enviado sai daqui: está
                confirmado em "Seus últimos envios". */}
            {preparations &&
              (preparations.focused ||
                preparations.preparations.some((item) =>
                  ["requested", "draft"].includes(item.status),
                )) && (
              <PatientReturnPreparationWorkspace
                initial={
                  preparations.focused
                    ? preparations
                    : {
                        ...preparations,
                        preparations: preparations.preparations.filter((item) =>
                          ["requested", "draft"].includes(item.status),
                        ),
                      }
                }
              />
            )}
          </>
        )
      ) : (
        <>
          {![
            "hoje",
            "plano",
            "cuidado",
            "diario",
            "evolucao",
            "documentos",
            "conversas",
            "relatorios",
          ].includes(section.slug) && <DevelopmentNotice />}
          <PatientArea
            section={section}
            base={`/clinicas/${tenantId}/meu-cuidado`}
          />
        </>
      )}
    </PatientShell>
  );
}
