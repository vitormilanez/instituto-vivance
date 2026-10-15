import type { ClinicAccess } from "./service";

// A patient with one active clinic has no choice to make at sign-in. Keep the
// selector for multiple clinics, staff roles, and accounts awaiting access.
export function singlePatientDestination(clinics: ClinicAccess[]): string | null {
  return clinics.length === 1 && clinics[0].role === "patient"
    ? `/clinicas/${clinics[0].id}/meu-cuidado/hoje`
    : null;
}

/**
 * A single active patient clinic is an unambiguous entry point. Keep this
 * decision independent from the database so login and the selector use the
 * same matrix without changing authorization.
 */
export function singleClinicDestination(clinics: ClinicAccess[]): string | null {
  if (clinics.length !== 1) return null;
  const clinic = clinics[0];
  if (clinic.role === "patient") return `/clinicas/${clinic.id}/meu-cuidado/hoje`;
  if (["admin", "doctor", "nurse"].includes(clinic.role)) return `/clinicas/${clinic.id}`;
  return null;
}

export function entryDestination(
  clinics: ClinicAccess[],
  onboardingStatus?: "draft" | "submitted" | null,
): string | null {
  const destination = singleClinicDestination(clinics);
  if (!destination) return null;
  return clinics[0].role === "patient" && onboardingStatus === "draft"
    ? `/clinicas/${clinics[0].id}/primeiros-passos`
    : destination;
}
