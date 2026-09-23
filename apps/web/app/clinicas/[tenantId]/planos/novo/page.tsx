import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { CarePlanError, newPlanContext } from "@/modules/care-plans/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { CreateCarePlan } from "@/components/care-plan-editor";
export const dynamic = "force-dynamic";
export default async function NewPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ paciente?: string; atendimento?: string }>;
}) {
  const { tenantId } = await params,
    q = await searchParams;
  const context = await newPlanContext(tenantId, {
    patient_id: q.paciente,
    encounter_id: q.atendimento ?? null,
  }).catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/login");
    if (
      e instanceof AccessError ||
      e instanceof CarePlanError ||
      e instanceof InputError
    )
      notFound();
    throw e;
  });
  return (
    <ClinicShell clinic={context.clinic} active="planos">
      <Link className="back-link" href={`/clinicas/${tenantId}/planos`}>
        Voltar aos planos
      </Link>
      <header className="page-heading">
        <div>
          <h1>Novo plano de cuidado</h1>
          <p>{context.patientName}</p>
        </div>
      </header>
      <section className="panel">
        <h2>Começar um rascunho interno</h2>
        <p>
          Defina objetivos, ações, frequência, período e data de revisão. O
          plano ficará disponível apenas à equipe com vínculo de cuidado ativo.
        </p>
        <p>
          Revisão e aprovação são decisões do médico. Nenhum conteúdo será
          publicado ao paciente nesta etapa.
        </p>
        <CreateCarePlan
          tenantId={tenantId}
          patientId={context.patient_id}
          encounterId={context.encounter_id}
        />
      </section>
    </ClinicShell>
  );
}
