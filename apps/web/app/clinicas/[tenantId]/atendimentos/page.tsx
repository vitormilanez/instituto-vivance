import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClinic, AccessError } from "@/modules/identity/service";
import { listEncounters } from "@/modules/encounters/service";
import { ClinicShell } from "@/components/clinic-shell";
import { EncounterDirectory } from "@/components/encounter-directory";
export const dynamic = "force-dynamic";
export default async function EncountersPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const access = await requireClinic(tenantId).catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/");
    if (e instanceof AccessError) notFound();
    throw e;
  });
  if (access.clinic.role === "admin")
    return (
      <ClinicShell clinic={access.clinic} active="atendimentos">
        <h1>Atendimentos</h1>
        <section className="panel">
          <h2>Acesso clínico restrito</h2>
          <p>
            O perfil administrativo organiza cadastros e horários, mas não
            acessa registros clínicos.
          </p>
          <Link href={`/clinicas/${tenantId}/agenda`}>Ir para a agenda</Link>
        </section>
      </ClinicShell>
    );
  const result = await listEncounters(tenantId);
  return (
    <ClinicShell clinic={result.clinic} active="atendimentos">
      <div className="page-heading">
        <div>
          <h1>Atendimentos</h1>
          <p>
            Rascunhos e registros dos pacientes com vínculo de cuidado ativo.
          </p>
        </div>
        {result.clinic.role === "doctor" && (
          <Link className="button" href={`/clinicas/${tenantId}/agenda`}>
            Abrir agenda
          </Link>
        )}
      </div>
      <EncounterDirectory tenantId={tenantId} initial={result} />
    </ClinicShell>
  );
}
