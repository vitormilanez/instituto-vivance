import { notFound, redirect } from "next/navigation";
import { AccessError, requireClinic } from "@/modules/identity/service";
import { tenantId as validId, InputError } from "@/lib/validation";
import { PatientShell } from "@/components/patient-shell";
import { ConsultationConsent } from "@/components/consultation-consent";
export const dynamic = "force-dynamic";
export default async function ConsultationConsentPage({ params }: { params: Promise<{ tenantId: string; appointmentId: string }> }) {
  const { tenantId, appointmentId } = await params;
  const access = await requireClinic(validId(tenantId), ["patient"]).catch(error => { if (error instanceof AccessError && error.status === 401) redirect("/login"); if (error instanceof AccessError || error instanceof InputError) notFound(); throw error; });
  validId(appointmentId);
  return <PatientShell clinic={access.clinic} active="consultas" title="Sua escolha para esta consulta"><ConsultationConsent tenantId={tenantId} appointmentId={appointmentId} /></PatientShell>;
}
