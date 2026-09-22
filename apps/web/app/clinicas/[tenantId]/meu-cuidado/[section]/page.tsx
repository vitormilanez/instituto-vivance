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
  const onboarding =
    patient && slug === "hoje"
      ? await getPatientOnboarding(tenantId).catch((error) => {
          if (error instanceof OnboardingError && error.status === 404)
            return null;
          throw error;
        })
      : null;
  const requestDate = requestInstant();
  const now = requestDate.getTime();
  const currentTime = requestDate.toISOString();
  const query = await searchParams;
  const published =
    patient && ["plano", "hoje"].includes(slug)
      ? await patientPublications(
          tenantId,
          slug === "plano" ? query.pagina : undefined,
        )
      : null;
  const latestPublication = published?.publications[0] ?? null;
  const unreadPublication =
    published?.publications.find((publication) => !publication.care_plan_receipts[0]) ??
    null;
  const checkIns =
    patient && ["diario", "hoje"].includes(slug)
      ? await patientCheckIns(tenantId, query.pagina)
      : null;
  const meals = patient && slug === "diario" ? await patientMeals(tenantId) : null;
  const longitudinal =
    patient && slug === "evolucao"
      ? await patientLongitudinal(tenantId, {
          from: query.inicio,
          to: query.fim,
          cursor: query.cursor,
        }).catch((error) => {
          if (error instanceof InputError)
            redirect(`/clinicas/${tenantId}/meu-cuidado/evolucao`);
          throw error;
        })
      : null;
  const documents =
    patient && slug === "documentos"
      ? await patientDocuments(tenantId, query.pagina)
      : null;
  const messages =
    slug === "conversas"
      ? await patientMessages(tenantId, query.medico, query.pagina).catch(
          (error) => {
            if (error instanceof InputError)
              redirect(`/clinicas/${tenantId}/meu-cuidado/conversas`);
            throw error;
          },
        )
      : null;
  const reports =
    patient && slug === "relatorios"
      ? await patientReportPublications(tenantId, query.pagina)
      : null;
  const preparations =
    patient && slug === "hoje"
      ? await patientReturnPreparations(tenantId, query.preparo ? undefined : query.pagina, query.preparo).catch((error) => {
          if (error instanceof InputError) redirect(`/clinicas/${tenantId}/meu-cuidado/hoje`);
          throw error;
        })
      : null;
  const preparationPending = patient && slug === "hoje" ? await patientPreparationPending(tenantId) : undefined;
  const requiredPreparation = patient && slug === "hoje"
    ? await patientPreparationRequirement(tenantId)
    : null;
  const latestMeasurement = patient && slug === "hoje"
    ? await patientMeasurementSummary(tenantId)
    : null;
  const appointments =
    slug === "consultas" || slug === "hoje"
      ? await listAppointments(
          tenantId,
          clinicDate(new Date(now - 30 * 86400000)),
          clinicDate(new Date(now + 60 * 86400000)),
        )
      : null;
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
          <PatientMeasurements tenant={tenantId} today={clinicDate()} />
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
            <PatientArea
              section={section}
              base={`/clinicas/${tenantId}/meu-cuidado`}
              tenantId={tenantId}
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
              pendingReturnPreparationId={
                preparationPending?.first?.id ?? null
              }
              preparationPending={preparationPending}
              requiredPreparation={requiredPreparation}
              latestMeasurement={latestMeasurement}
            />
            {preparations && preparations.preparations.length > 0 && (
              <PatientReturnPreparationWorkspace initial={preparations} />
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
            tenantId={tenantId}
            currentTime={currentTime}
          />
        </>
      )}
    </PatientShell>
  );
}
