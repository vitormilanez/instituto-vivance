import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { agendaOptions, listAppointments } from "@/modules/agenda/service";
import { agendaDate, clinicDate } from "@/modules/agenda/validation";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { Agenda } from "@/components/agenda";
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
    return { date, options, ...result };
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
        canStart={context.clinic.role === "doctor"}
        {...context}
      />
    </ClinicShell>
  );
}
