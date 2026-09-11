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
import { patientLongitudinal } from "@/modules/longitudinal/service";
import { PatientLongitudinalWorkspace } from "@/components/longitudinal-workspace";
import { patientDocuments } from "@/modules/documents/service";
import { PatientDocumentsWorkspace } from "@/components/documents-workspace";
import { patientMessages } from "@/modules/messages/service";
import { PatientMessagesWorkspace } from "@/components/messages-workspace";
export const dynamic = "force-dynamic";

export default async function PatientAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; section: string }>;
  searchParams: Promise<{ pagina?: string; medico?: string | string[] }>;
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
  const published =
    patient && ["plano", "hoje"].includes(slug)
      ? await patientPublications(
          tenantId,
          slug === "plano" ? query.pagina : undefined,
        )
      : null;
  const checkIns =
    patient && slug === "diario"
      ? await patientCheckIns(tenantId, query.pagina)
      : null;
  const longitudinal =
    patient && slug === "evolucao"
      ? await patientLongitudinal(tenantId)
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
  const appointments =
    slug === "consultas" || slug === "hoje"
      ? await listAppointments(
          tenantId,
          clinicDate(new Date(now - 30 * 86400000)),
          clinicDate(new Date(now + 60 * 86400000)),
        )
      : null;
  return (
    <PatientShell clinic={clinic} active={section.group}>
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
          <div className="patient-portal-clinic">
            <span>Seu cuidado com</span>
            <strong>{clinic.name}</strong>
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
      {slug === "conversas" && messages ? (
        <PatientMessagesWorkspace initial={messages} />
      ) : slug === "documentos" && documents ? (
        <PatientDocumentsWorkspace initial={documents} />
      ) : slug === "evolucao" && longitudinal ? (
        <PatientLongitudinalWorkspace
          initial={longitudinal}
          base={`/clinicas/${tenantId}/meu-cuidado`}
        />
      ) : slug === "diario" && checkIns ? (
        <PatientCheckIns initial={checkIns} today={clinicDate()} />
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
          <PatientArea
            section={section}
            base={`/clinicas/${tenantId}/meu-cuidado`}
            appointments={appointments.appointments}
            currentTime={currentTime}
            latestPublication={published?.publications[0] ?? null}
          />
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
          ].includes(section.slug) && <DevelopmentNotice />}
          <PatientArea
            section={section}
            base={`/clinicas/${tenantId}/meu-cuidado`}
            currentTime={currentTime}
          />
        </>
      )}
    </PatientShell>
  );
}
