import type { PatientCareContext } from "@/modules/workspace/today";

export type PatientHeaderFacts = {
  relationshipLabel: string;
  encounterHref: string | null;
  encounterLabel: string | null;
  nextAppointmentHref: string | null;
  nextAppointmentLabel: string | null;
  planHref: string | null;
  planLabel: string | null;
};

const clinicDate = (value: string) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const appointmentLabel = (value: string) => {
  const date = new Date(value);
  const day = date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const time = date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} às ${time}`;
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
  const nextAppointment = care.nextAppointment;
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
    nextAppointmentHref: nextAppointment
      ? `/clinicas/${tenantId}/agenda?data=${clinicDate(nextAppointment.starts_at)}#consulta-${nextAppointment.id}`
      : null,
    nextAppointmentLabel: nextAppointment
      ? appointmentLabel(nextAppointment.starts_at)
      : null,
    planHref: plan ? `/clinicas/${tenantId}/planos/${plan.plan_id}` : null,
    planLabel: plan ? `${plan.title} · revisão ${plan.revision}` : null,
  };
}
