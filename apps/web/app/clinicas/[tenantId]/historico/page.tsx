import { notFound, redirect } from "next/navigation";
import { listAudit } from "@/modules/audit/service";
import { AccessError, requireClinic } from "@/modules/identity/service";
import { InputError, tenantId as parseId } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
export const dynamic = "force-dynamic";

export default async function Audit({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const load = async () => {
    const { clinic } = await requireClinic(parseId(tenantId), ["admin"]);
    return { clinic, events: await listAudit(tenantId) };
  };
  const context = await load().catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const labels: Record<string, string> = {
    appointments: "Agendamento",
    patient_accounts: "Acesso do paciente",
    patients: "Paciente",
    tenants: "Clínica",
    memberships: "Vínculo de acesso",
  };
  return (
    <ClinicShell clinic={context.clinic} active="audit">
      <div className="page-heading">
        <div>
          <h1>Histórico de ações</h1>
          <p>Últimas 50 alterações registradas nesta clínica.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Atividade administrativa</h2>
        {context.events.length === 0 ? (
          <div className="empty">
            <h3>Nenhuma alteração registrada</h3>
            <p>
              As alterações aparecerão aqui quando os cadastros forem criados ou
              atualizados.
            </p>
          </div>
        ) : (
          <ul className="list audit-list">
            {context.events.map((e) => (
              <li key={e.id}>
                <strong>
                  {e.entity_type === "appointments" &&
                  e.changed_fields.includes("status") &&
                  e.action === "update"
                    ? "Cancelamento"
                    : e.action === "insert"
                      ? "Cadastro"
                      : "Atualização"}{" "}
                  · {labels[e.entity_type] ?? "Registro"}
                </strong>
                <small>
                  {new Date(e.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </small>
                <details>
                  <summary>Detalhes do registro</summary>
                  <p>
                    Responsável:{" "}
                    {e.actor_user_id ?? "Configuração administrativa"}
                  </p>
                  <p>Identificador: {e.entity_id}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ClinicShell>
  );
}
