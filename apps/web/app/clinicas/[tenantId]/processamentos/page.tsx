import { notFound, redirect } from "next/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import { ProcessingWorkspace } from "@/components/processing-workspace";
import { InputError } from "@/lib/validation";
import { AccessError } from "@/modules/identity/service";
import { processingJobs } from "@/modules/processing/service";

export const dynamic = "force-dynamic";

export default async function ProcessingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { tenantId } = await params;
  const { pagina } = await searchParams;
  const initial = await processingJobs(tenantId, pagina).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof InputError)
      redirect(`/clinicas/${tenantId}/processamentos`);
    if (error instanceof AccessError) notFound();
    throw error;
  });
  return (
    <ClinicShell clinic={initial.clinic} active="processamentos">
      <header className="page-heading">
        <div>
          <h1>Processamentos</h1>
          <p>
            Acompanhamento técnico privado de tarefas autorizadas do seu cuidado.
          </p>
        </div>
      </header>
      <ProcessingWorkspace initial={initial} />
    </ClinicShell>
  );
}
