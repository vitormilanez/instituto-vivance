import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClinic, AccessError } from "@/modules/identity/service";
import { listEncounters } from "@/modules/encounters/service";
import { ClinicShell } from "@/components/clinic-shell";
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
      <section className="panel">
        <h2>Registros clínicos</h2>
        {result.encounters.length ? (
          <ul className="list">
            {result.encounters.map((e) => (
              <li key={e.id}>
                <strong>{e.patients?.display_name ?? "Paciente"}</strong>
                <p>
                  {e.status === "draft" ? "Em rascunho" : "Finalizado"} ·
                  Atualizado em{" "}
                  {new Date(e.updated_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
                <Link href={`/clinicas/${tenantId}/atendimentos/${e.id}`}>
                  {e.status === "draft" && e.doctor_id === result.userId
                    ? "Continuar atendimento"
                    : "Consultar registro"}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <h3>Nenhum atendimento disponível</h3>
            <p>
              {result.clinic.role === "doctor"
                ? "Na agenda, abra uma consulta e confirme o início do atendimento."
                : "Os registros aparecerão após a atribuição de um vínculo de cuidado ativo."}
            </p>
          </div>
        )}
        {result.truncated && <p>Exibindo os 100 registros mais recentes.</p>}
      </section>
    </ClinicShell>
  );
}
