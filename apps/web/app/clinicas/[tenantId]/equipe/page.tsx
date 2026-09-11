import { notFound, redirect } from "next/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import { TeamWorkspace } from "@/components/team-workspace";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { loadTeamWorkspace } from "@/modules/team/service";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{
    paciente?: string | string[];
    profissional?: string | string[];
  }>;
}) {
  const { tenantId } = await params;
  const context = await loadTeamWorkspace(tenantId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const query = await searchParams;
  const selectedPatient = context.patients.some(
    (patient) => patient.id === query.paciente,
  )
    ? (query.paciente as string)
    : undefined;
  const selectedProfessional = context.members.some(
    (member) => member.user_id === query.profissional,
  )
    ? (query.profissional as string)
    : undefined;
  return (
    <ClinicShell clinic={context.clinic} active="team">
      <div className="page-heading">
        <div>
          <h1>Equipe e vínculos de cuidado</h1>
          <p>
            {context.clinic.role === "admin"
              ? "Organize acessos e atribuições sem abrir o conteúdo clínico dos pacientes."
              : "Revise as atribuições e aceite apenas as responsabilidades que você assumirá."}
          </p>
        </div>
      </div>
      <TeamWorkspace
        tenantId={tenantId}
        role={context.clinic.role}
        members={context.members}
        patients={context.patients}
        relationships={context.relationships}
        selectedPatient={selectedPatient}
        selectedProfessional={selectedProfessional}
        truncated={context.truncated}
      />
    </ClinicShell>
  );
}
