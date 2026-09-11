import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { CarePlanError, loadPlan } from "@/modules/care-plans/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { CarePlanEditor } from "@/components/care-plan-editor";
export const dynamic = "force-dynamic";
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; planId: string }>;
  searchParams: Promise<{ pagina?: string; publicacoes_pagina?:string }>;
}) {
  const p = await params,
    q = await searchParams;
  const detail = await loadPlan(p.tenantId, p.planId, q.pagina,q.publicacoes_pagina).catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/");
    if (
      e instanceof AccessError ||
      e instanceof CarePlanError ||
      e instanceof InputError
    )
      notFound();
    throw e;
  });
  return (
    <ClinicShell clinic={detail.clinic} active="planos">
      <CarePlanEditor
        key={`${detail.plan.id}:${detail.plan.version}:${q.pagina ?? 1}:${q.publicacoes_pagina??1}`}
        initial={detail}
      />
    </ClinicShell>
  );
}
