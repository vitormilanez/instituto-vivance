import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessError, requireClinic } from "@/modules/identity/service";
import { tenantId as validId, InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { ConsultationSession } from "@/components/consultation-session";
import { getAppointmentTeleconsultation } from "@/modules/teleconsultations/service";
import { BrowserTranscriptPanel } from "@/components/browser-transcript-panel";

export const dynamic = "force-dynamic";
export default async function ConsultationPage({ params }: { params: Promise<{ tenantId: string; appointmentId: string }> }) {
  const { tenantId, appointmentId } = await params;
  const context = await (async () => {
    const access = await requireClinic(validId(tenantId), ["doctor"]);
    const [appointment, encounters, call] = await Promise.all([
      access.client.from("appointments").select("id,version,status,patients!appointments_tenant_id_patient_id_fkey(display_name)").eq("tenant_id", tenantId).eq("id", validId(appointmentId)).maybeSingle(),
      access.client.from("encounters").select("id").eq("tenant_id", tenantId).eq("appointment_id", appointmentId).maybeSingle(),
      getAppointmentTeleconsultation(tenantId, appointmentId),
    ]);
    if (appointment.error || !appointment.data || encounters.error) notFound();
    return { ...access, appointment: appointment.data, encounterId: encounters.data?.id ?? null, call };
  })().catch(error => { if (error instanceof AccessError && error.status === 401) redirect("/login"); if (error instanceof AccessError || error instanceof InputError) notFound(); throw error; });
  return <ClinicShell clinic={context.clinic} active="teleconsulta"><p><Link href={`/clinicas/${tenantId}/teleconsulta`}>Voltar à Teleconsulta</Link></p><ConsultationSession key={appointmentId} tenantId={tenantId} appointmentId={appointmentId} patientName={context.appointment.patients?.display_name ?? "Paciente"} appointmentVersion={context.appointment.version} encounterId={context.encounterId} joinUrl={["scheduled", "in_progress"].includes(context.appointment.status) ? context.call?.join_url : null} /><details className="cs-original"><summary>Textos anteriores desta consulta</summary><BrowserTranscriptPanel readOnly tenantId={tenantId} appointmentId={appointmentId} /></details></ClinicShell>;
}
