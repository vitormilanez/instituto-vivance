import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { agendaOptions, listAppointments } from "@/modules/agenda/service";
import { agendaDate, clinicDate } from "@/modules/agenda/validation";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { Agenda } from "@/components/agenda";
import { requestInstant } from "@/lib/request-time";
import { appointmentPreparationStates } from "@/modules/return-preparation/service";
export const dynamic = "force-dynamic";
export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { tenantId } = await params;
  const today = clinicDate();
  const currentTime = requestInstant().toISOString();
  const load = async () => {
    const date = agendaDate((await searchParams).data ?? today);
    const [year, month] = date.split("-").map(Number);
    const until = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const options = await agendaOptions(tenantId);
    const result = await listAppointments(
      tenantId,
      `${date.slice(0, 7)}-01`,
      until,
    );
    const preparationStates = result.clinic.role === "doctor"
      ? await appointmentPreparationStates(tenantId, result.appointments.map((item) => item.id))
      : {};
    return { date, options, preparationStates, ...result };
  };
  const context = await load().catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/");
    if (e instanceof AccessError || e instanceof InputError) notFound();
    throw e;
  });
  return (
    <ClinicShell clinic={context.clinic} active="agenda">
      <Agenda
        tenantId={tenantId}
        today={today}
        currentTime={currentTime}
        canStart={context.clinic.role === "doctor"}
        canManage={["admin", "doctor", "nurse"].includes(
          context.clinic.role,
        )}
        {...context}
      />
    </ClinicShell>
  );
}
