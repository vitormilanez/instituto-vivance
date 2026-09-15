import type { PatientCareContext } from "@/modules/workspace/today";

export type PatientHeaderFacts = {
  relationshipLabel: string;
  encounterHref: string | null;
  encounterLabel: string | null;
  planHref: string | null;
  planLabel: string | null;
};

// patientCareContext only ever returns a value once an active care
// relationship is confirmed, so relationshipId is always present here —
// there is no "linked but unconfirmed" state to represent honestly.
export function patientHeaderFacts(
  care: PatientCareContext | null,
  tenantId: string,
): PatientHeaderFacts | null {
  if (!care) return null;
  const encounter = care.encounter;
  const plan = care.publications[0];
  return {
    relationshipLabel: "Vínculo ativo",
    encounterHref: encounter
      ? `/clinicas/${tenantId}/atendimentos/${encounter.id}`
      : null,
    encounterLabel: encounter
      ? `Finalizada em ${new Date(encounter.finalized_at!).toLocaleDateString(
          "pt-BR",
          { timeZone: "America/Sao_Paulo" },
        )}`
      : null,
    planHref: plan ? `/clinicas/${tenantId}/planos/${plan.plan_id}` : null,
    planLabel: plan ? `${plan.title} · revisão ${plan.revision}` : null,
  };
}
