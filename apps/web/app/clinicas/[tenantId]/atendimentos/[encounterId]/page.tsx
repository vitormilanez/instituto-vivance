import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { EncounterError, loadEncounter } from "@/modules/encounters/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { EncounterEditor } from "@/components/encounter-editor";
import { getSubmittedPatientOnboarding } from "@/modules/onboarding/service";
import { encounterPreparation } from "@/modules/return-preparation/service";
export const dynamic = "force-dynamic";
export default async function EncounterPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; encounterId: string }>;
  searchParams: Promise<{
    versoes_antes_de?: string;
    adendos_antes_de?: string;
  }>;
}) {
  const { tenantId, encounterId } = await params;
  const page = await searchParams;
  const detail = await loadEncounter(tenantId, encounterId, {
    beforeVersion: page.versoes_antes_de,
    beforeAddendum: page.adendos_antes_de,
  }).catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/");
    if (
      e instanceof AccessError ||
      e instanceof EncounterError ||
      e instanceof InputError
    )
      notFound();
    throw e;
  });
  const onboarding = await getSubmittedPatientOnboarding(
    tenantId,
    detail.encounter.patient_id,
  );
  const preparation = await encounterPreparation(tenantId, detail.encounter.appointment_id);
  return (
    <ClinicShell clinic={detail.clinic} active="atendimentos">
      <EncounterEditor
        key={`${detail.encounter.id}:${page.versoes_antes_de ?? "latest"}:${page.adendos_antes_de ?? "latest"}`}
        initial={detail}
        onboarding={onboarding}
        preparation={preparation}
      />
    </ClinicShell>
  );
}
