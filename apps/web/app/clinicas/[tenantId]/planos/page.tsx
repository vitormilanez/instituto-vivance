import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { listPlans } from "@/modules/care-plans/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
export const dynamic = "force-dynamic";
const labels: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em revisão médica",
  approved: "Aprovado",
};
export default async function PlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { tenantId } = await params;
  const data = await listPlans(tenantId, (await searchParams).pagina).catch(
    (e) => {
      if (e instanceof AccessError && e.status === 401) redirect("/login");
      if (e instanceof AccessError || e instanceof InputError) notFound();
      throw e;
    },
  );
  const base = `/clinicas/${tenantId}`;
  return (
    <ClinicShell clinic={data.clinic} active="planos">
      <header className="page-heading">
        <div>
          <h1>Planos de cuidado</h1>
          <p>
            Objetivos e orientações construídos pelo médico, com revisão e
            histórico.
          </p>
        </div>
      </header>
      <section className="panel encounter-directory">
        <div className="section-heading">
          <div>
            <h2>Planos da equipe</h2>
            <p>
              Rascunhos são privados. Abra um plano para conferir sua publicação.
              Para criar, abra o atendimento do paciente.
            </p>
          </div>
          <Link href={`${base}/atendimentos`}>Abrir atendimentos</Link>
        </div>
        {data.plans.length ? (
          <div className="encounter-list">
            {data.plans.map((p) => (
              <article className="encounter-row" key={p.id}>
                <div className="encounter-row-main">
                  <strong>{p.title || "Plano sem título"}</strong>
                  <p>{p.patients?.display_name ?? "Paciente"}</p>
                  <small>
                    Revisão {p.revision} · {labels[p.status]}
                  </small>
                </div>
                <Link
                  className="encounter-row-action"
                  href={`${base}/planos/${p.id}`}
                >
                  Abrir plano
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>Nenhum plano nesta página</h3>
            <p>Os planos dos pacientes com vínculo ativo aparecerão aqui.</p>
          </div>
        )}
        <nav className="agenda-actions" aria-label="Páginas de planos">
          {data.page > 1 && (
            <Link href={`${base}/planos?pagina=${data.page - 1}`}>
              Anterior
            </Link>
          )}
          {data.hasNext && (
            <Link href={`${base}/planos?pagina=${data.page + 1}`}>Próxima</Link>
          )}
        </nav>
      </section>
    </ClinicShell>
  );
}
