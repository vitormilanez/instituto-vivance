import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { EncounterError, loadEncounter } from "@/modules/encounters/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { EncounterEditor } from "@/components/encounter-editor";
export const dynamic = "force-dynamic";
export default async function EncounterPage({
  params,
}: {
  params: Promise<{ tenantId: string; encounterId: string }>;
}) {
  const { tenantId, encounterId } = await params;
  const detail = await loadEncounter(tenantId, encounterId).catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/");
    if (
      e instanceof AccessError ||
      e instanceof EncounterError ||
      e instanceof InputError
    )
      notFound();
    throw e;
  });
  return (
    <ClinicShell clinic={detail.clinic} active="atendimentos">
      <EncounterEditor key={detail.encounter.id} initial={detail} />
    </ClinicShell>
  );
}
