import { notFound, redirect } from "next/navigation";
import { myPatientProfile } from "@/modules/patients/portal";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { findPatientSection } from "@/modules/workspace/navigation";
import { PatientShell } from "@/components/patient-shell";
import { PatientArea } from "@/components/patient-area";
import { DevelopmentNotice } from "@/components/module-ui";
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
      <DevelopmentNotice />
      <PatientArea
        section={section}
        base={`/clinicas/${tenantId}/meu-cuidado`}
      />
    </PatientShell>
  );
}
