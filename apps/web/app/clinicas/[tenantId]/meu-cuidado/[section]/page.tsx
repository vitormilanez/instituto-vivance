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
import { PatientAlertSigns } from "@/components/patient/alert-signs";
import { clinicPatientInfo } from "@/modules/clinic-info/service";
import { alertSigns as noClinicInfo } from "@/modules/workspace/alert-signs";
import { PatientMealQuick } from "@/components/patient/meal-quick";
import { PatientMyCare } from "@/components/patient/my-care";
import { CheckInFlow } from "@/components/patient/check-in-flow";
import { WelcomeFlow } from "@/components/patient/welcome-flow";
import { myReminderPreference } from "@/modules/reminders/service";
import { reminderLabel } from "@/modules/reminders/model";
import { PreparationFlow } from "@/components/patient/preparation-flow";
import { preparationSummary } from "@/modules/workspace/preparation-summary";
import { patientCheckInState } from "@/modules/daily-check-ins/service";
import { PatientArea } from "@/components/patient-area";
import { PatientHome } from "@/components/patient-home";
import { clinicLocalDateTime, consultationLabel, justSentLabel } from "@/modules/workspace/patient-home";
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
import { PatientEvolution } from "@/components/patient/evolution";
import { evolutionPeriod } from "@/modules/workspace/patient-evolution";
import { PatientMeasurements } from "@/components/patient-measurements";
import { patientMeasurementSummary } from "@/modules/measurements/service";
import { patientDocuments } from "@/modules/documents/service";
import { PatientDocumentsWorkspace } from "@/components/documents-workspace";
import { patientMessages } from "@/modules/messages/service";
import { PatientMessagesWorkspace } from "@/components/messages-workspace";
import { patientReportPublications } from "@/modules/reports/publication-service";
import { PublishedReports } from "@/components/published-reports";
import { patientPreparationPending, patientPreparationRequirement, patientReturnPreparations } from "@/modules/return-preparation/service";
import { myPendingCareRequests } from "@/modules/care-requests/service";
export const dynamic = "force-dynamic";

export default async function PatientAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; section: string }>;
  searchParams: Promise<{ periodo?: string; enviado?: string; pagina?: string; preparo?: string; medico?: string | string[]; inicio?: string; fim?: string; cursor?: string }>;
}) {
  const { tenantId, section: slug } = await params;
  const section = findPatientSection(slug);
  if (!section) notFound();
  const { clinic, patient } = await myPatientProfile(tenantId).catch(
    (error) => {
      if (error instanceof AccessError && error.status === 401) redirect("/login");
      if (error instanceof AccessError || error instanceof InputError)
        notFound();
      throw error;
    },
  );
  const requestDate = requestInstant();
  const now = requestDate.getTime();
  const currentTime = requestDate.toISOString();
  const query = await searchParams;
  const evolution = evolutionPeriod(query.periodo, clinicDate());
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
    checkIn,
    reminder,
    clinicInfo,
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
    patient && ["plano", "hoje", "cuidado"].includes(slug)
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
    patient && ["diario", "refeicao"].includes(slug) ? patientMeals(tenantId) : null,
    // longitudinal
    patient && slug === "evolucao"
      ? patientLongitudinal(tenantId, {
          from: evolution.from,
        }).catch((error) => {
          if (error instanceof InputError)
            redirect(`/clinicas/${tenantId}/meu-cuidado/evolucao`);
          throw error;
        })
      : null,
    // documents
    patient && ["documentos", "cuidado"].includes(slug)
      ? patientDocuments(tenantId, slug === "documentos" ? query.pagina : undefined)
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
    patient && slug === "preconsulta"
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
    patient && ["hoje", "evolucao", "peso", "checkin"].includes(slug)
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
    ["consultas", "hoje", "cuidado", "preconsulta"].includes(slug)
      ? listAppointments(
          tenantId,
          clinicDate(new Date(now - 30 * 86400000)),
          clinicDate(new Date(now + 60 * 86400000)),
        )
      : null,
    // checkIn: estado do check-in diário (null se a tabela ainda não existe)
    patient && (section.group !== "acao" || ["checkin", "boas-vindas", "lembretes"].includes(slug))
      ? patientCheckInState(tenantId).catch(() => null)
      : null,
    // reminder: null = recurso indisponível; undefined = ainda sem boas-vindas
    patient && ["hoje", "cuidado", "boas-vindas", "lembretes"].includes(slug)
      ? myReminderPreference(tenantId).catch(() => null)
      : null,
    // clinicInfo: telefone da clínica e sinais de alerta aprovados
    ["alerta", "consultas", "cuidado"].includes(slug)
      ? clinicPatientInfo(tenantId).catch(() => noClinicInfo)
      : noClinicInfo,
  ]);
  // Primeiro acesso: antes da Home, as boas-vindas (uma vez só).
  if (slug === "hoje" && patient && reminder === undefined)
    redirect(`/clinicas/${tenantId}/meu-cuidado/boas-vindas`);
  // Pré-consulta: a pedida pelo link ou a primeira que ainda espera a pessoa.
  const preparationItem =
    slug === "preconsulta"
      ? (preparations?.preparations.find((item) => (query.preparo ? item.id === query.preparo : ["requested", "draft"].includes(item.status))) ?? null)
      : null;
  const lastConsultationDay =
    appointments?.appointments
      .filter((item) => item.status === "completed" && item.ends_at < currentTime)
      .map((item) => clinicDate(new Date(item.ends_at)))
      .sort()
      .at(-1) ?? clinicDate(new Date(now - 30 * 86400000));
  const preparationRows =
    preparationItem && ["requested", "draft"].includes(preparationItem.status)
      ? await preparationSummary(tenantId, lastConsultationDay).catch(() => [])
      : [];
  const latestPublication = published?.publications[0] ?? null;
  const unreadPublication =
    published?.publications.find((publication) => !publication.care_plan_receipts[0]) ??
    null;
  const base = `/clinicas/${tenantId}/meu-cuidado`;
  const firstName = patient?.display_name.split(/\s+/)[0] ?? null;
  const lastWeight =
    latestMeasurement?.measure_label === "Peso"
      ? { value: Number(latestMeasurement.measure_value), reportedOn: latestMeasurement.reported_on }
      : null;
  const shellTitle =
    section.group === "cuidado" && section.slug !== "cuidado" ? "Meu cuidado" : section.title;
  return (
    <PatientShell
      clinic={clinic}
      active={section.slug}
      title={shellTitle}
      heading={section.slug === "hoje" ? "page" : "bar"}
      backHref={slug === "boas-vindas" ? "" : slug === "lembretes" ? `${base}/cuidado` : undefined}
      checkInHref={checkIn?.due ? `${base}/checkin` : null}
    >
      {!patient && (
        <p className="pv-notice">
          A equipe ainda precisa vincular sua conta à sua ficha. Entre em
          contato com a clínica.
        </p>
      )}
      {slug === "peso" && patient ? (
        <PatientMeasurements tenant={tenantId} today={clinicDate()} base={base} last={lastWeight} />
      ) : slug === "cuidado" && patient && published && appointments ? (
        <PatientMyCare
          base={base}
          clinicId={tenantId}
          today={clinicDate()}
          currentTime={currentTime}
          publications={published.publications}
          appointments={appointments.appointments}
          documents={documents?.documents ?? null}
          reminderLabel={reminder === null ? null : reminderLabel(reminder ?? null, checkIn?.frequencyDays ?? 1)}
          clinicPhone={clinicInfo.clinicPhone}
        />
      ) : slug === "alerta" ? (
        <PatientAlertSigns content={clinicInfo} />
      ) : (slug === "boas-vindas" || slug === "lembretes") && patient ? (
        <WelcomeFlow
          tenantId={tenantId}
          base={base}
          firstName={firstName}
          doctorName={null}
          frequencyDays={checkIn?.frequencyDays ?? 1}
          initialTime={reminder?.reminder_time?.slice(0, 5) ?? "09:00"}
          mode={slug === "boas-vindas" ? "welcome" : "reminder"}
        />
      ) : slug === "preconsulta" && patient ? (
        preparationItem && ["requested", "draft"].includes(preparationItem.status) ? (
          <PreparationFlow
            item={preparationItem}
            tenantId={tenantId}
            base={base}
            summary={preparationRows}
            whenLabel={consultationLabel(preparationItem.appointments.starts_at, clinicDate())}
          />
        ) : (
          <div className="pv-card">
            <p className="pv-big is-small">
              {preparationItem ? "Esta pré-consulta já foi enviada" : "Nenhuma pré-consulta esperando você"}
            </p>
            <p className="pv-lead">
              {preparationItem
                ? "Suas respostas ficaram registradas do jeito que você escreveu."
                : "Quando seu médico pedir, ela aparece em Hoje."}
            </p>
          </div>
        )
      ) : slug === "checkin" && patient ? (
        checkIn ? (
          <CheckInFlow
            tenantId={tenantId}
            base={base}
            today={clinicDate()}
            doctorName={null}
            lastWeight={lastWeight?.value ?? null}
            applicationEnabled={checkIn.applicationEnabled}
            nextLabel={checkIn.frequencyDays === 1 ? "amanhã" : `em ${checkIn.frequencyDays} dias`}
          />
        ) : (
          <p className="pv-notice">O check-in ainda não está disponível. Tente de novo mais tarde.</p>
        )
      ) : slug === "refeicao" && meals?.patientId ? (
        <PatientMealQuick tenantId={tenantId} patientId={meals.patientId} base={base} nowLocal={clinicLocalDateTime(requestDate)} />
      ) : section.group === "cuidado" && section.slug !== "cuidado" ? (
        <h2 className="pv-h2 pv-subtitle">{section.title}</h2>
      ) : null}
      {slug === "relatorios" && reports ? (
        <PublishedReports initial={reports} />
      ) : slug === "conversas" && messages ? (
        <PatientMessagesWorkspace initial={messages} />
      ) : slug === "documentos" && documents ? (
        <PatientDocumentsWorkspace initial={documents} />
      ) : slug === "evolucao" && longitudinal ? (
        <PatientEvolution data={longitudinal} base={base} period={evolution.key} checkIn={checkIn} />
      ) : slug === "diario" && checkIns && meals ? (
        <>
          <PatientMealLogs initial={meals} />
          <PatientCheckIns initial={checkIns} today={clinicDate()} />
        </>
      ) : slug === "plano" && published ? (
        <PublishedPlans initial={published} />
      ) : appointments && ["hoje", "consultas"].includes(slug) ? (
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
              {clinicInfo.clinicPhone ? (
                <>
                  Para marcar ou alterar um horário, fale com a clínica:{" "}
                  <a href={`tel:${clinicInfo.clinicPhone.tel}`}>{clinicInfo.clinicPhone.display}</a>
                  {clinicInfo.clinicPhone.hours ? ` · ${clinicInfo.clinicPhone.hours}` : ""}.
                </>
              ) : (
                "Para marcar ou alterar um horário, entre em contato com a clínica."
              )}
            </p>
          </section>
        ) : (
          <>
            <PatientHome
              base={base}
              tenantId={tenantId}
              now={requestDate}
              justSent={justSentLabel(query.enviado)}
              checkIn={checkIn}
              firstName={firstName}
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
          </>
        )
      ) : ["peso", "alerta", "refeicao", "cuidado", "checkin", "preconsulta", "boas-vindas", "lembretes"].includes(section.slug) ? null : (
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
