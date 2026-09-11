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
export const dynamic = "force-dynamic";

export default async function PatientAreaPage({
  params,
}: {
  params: Promise<{ tenantId: string; section: string }>;
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
  const now = new Date().getTime();
  const appointments =
    slug === "consultas"
      ? await listAppointments(
          tenantId,
          clinicDate(new Date(now - 30 * 86400000)),
          clinicDate(new Date(now + 60 * 86400000)),
        )
      : null;
  return (
    <PatientShell clinic={clinic} active={section.group}>
      <div className="page-heading">
        <div>
          <h1>{section.title}</h1>
          <p>
            {section.slug === "hoje" && patient
              ? `${patient.display_name}, este é seu espaço de cuidado.`
              : section.description}
          </p>
        </div>
      </div>
      {!patient && (
        <p className="notice">
          A equipe ainda precisa vincular sua conta à sua ficha. Entre em
          contato com a clínica.
        </p>
      )}
      {appointments ? (
        <section className="panel">
          <h2>Suas consultas</h2>
          <p>
            Últimos 30 dias e próximos 60 dias. Horário de Brasília. Para
            alterações, entre em contato com a clínica.
          </p>
          {appointments.truncated && (
            <p role="alert">
              A lista atingiu o limite de registros. Consulte a equipe.
            </p>
          )}
          <AppointmentList appointments={appointments.appointments} />
        </section>
      ) : (
        <>
          <DevelopmentNotice />
          <PatientArea
            section={section}
            base={`/clinicas/${tenantId}/meu-cuidado`}
          />
        </>
      )}
    </PatientShell>
  );
}
