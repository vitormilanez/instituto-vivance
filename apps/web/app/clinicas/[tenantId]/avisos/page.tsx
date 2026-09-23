import { notFound, redirect } from "next/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import { NotificationsWorkspace } from "@/components/notifications-workspace";
import { PatientShell } from "@/components/patient-shell";
import { AccessError } from "@/modules/identity/service";
import { inAppNotifications } from "@/modules/notifications/service";
import { InputError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function NoticesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { tenantId } = await params;
  const query = await searchParams;
  const initial = await inAppNotifications(tenantId, query.pagina).catch(
    (error) => {
      if (error instanceof AccessError && error.status === 401) redirect("/login");
      if (error instanceof InputError)
        redirect(`/clinicas/${tenantId}/avisos`);
      if (error instanceof AccessError) notFound();
      throw error;
    },
  );
  const content = (
    <>
      <header className="page-heading">
        <div>
          <h1>Avisos</h1>
          <p>
            Atualizações pessoais dentro da Vivance. O resumo nunca exibe
            conteúdo clínico.
          </p>
        </div>
      </header>
      <NotificationsWorkspace initial={initial} />
    </>
  );
  return initial.clinic.role === "patient" ? (
    <PatientShell clinic={initial.clinic} active="avisos" title="Avisos" heading="page" backHref={`/clinicas/${initial.clinic.id}/meu-cuidado/hoje`}>
      {content}
    </PatientShell>
  ) : (
    <ClinicShell clinic={initial.clinic} active="notifications">
      {content}
    </ClinicShell>
  );
}
