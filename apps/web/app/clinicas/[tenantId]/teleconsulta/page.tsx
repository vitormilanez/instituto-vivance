import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { agendaOptions, listAppointments } from "@/modules/agenda/service";
import { clinicDate } from "@/modules/agenda/validation";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { TeleconsultationHub } from "@/components/teleconsultation-hub";
import { requestInstant } from "@/lib/request-time";
export const dynamic = "force-dynamic";

export default async function TeleconsultationPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const today = clinicDate();
  const now = requestInstant();
  const context = await (async () => {
    // Hoje e os próximos 30 dias: o suficiente para a fila de chamadas.
    const until = clinicDate(new Date(now.getTime() + 31 * 86_400_000));
    const [options, result] = await Promise.all([
      agendaOptions(tenantId),
      listAppointments(tenantId, today, until),
    ]);
    return {
      options,
      clinic: result.clinic,
      appointments: result.appointments.filter(
        (appointment) =>
          appointment.teleconsultation?.delivery_mode === "video" &&
          ["scheduled", "in_progress"].includes(appointment.status),
      ),
    };
  })().catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/login");
    if (e instanceof AccessError || e instanceof InputError) notFound();
    throw e;
  });
  if (context.clinic.role === "patient") notFound();
  return (
    <ClinicShell clinic={context.clinic} active="teleconsulta">
      <TeleconsultationHub
        tenantId={tenantId}
        today={today}
        role={context.clinic.role}
        options={context.options}
        appointments={context.appointments}
      />
    </ClinicShell>
  );
}
