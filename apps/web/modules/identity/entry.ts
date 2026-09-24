import type { ClinicAccess } from "./service";

// A patient with one active clinic has no choice to make at sign-in. Keep the
// selector for multiple clinics, staff roles, and accounts awaiting access.
export function singlePatientDestination(clinics: ClinicAccess[]): string | null {
  return clinics.length === 1 && clinics[0].role === "patient"
    ? `/clinicas/${clinics[0].id}/meu-cuidado/hoje`
    : null;
}
