import { clinicDate } from "./validation.ts";

type FocusableAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

// Shared read-only focus rule for Hoje and Agenda. The caller's authorized
// appointment list defines the professional scope; this never selects a row
// outside that list or changes the selected patient as a fallback.
export function focusedAppointment<T extends FocusableAppointment>(
  appointments: readonly T[],
  currentTime: string,
  date = clinicDate(new Date(currentTime)),
): T | null {
  const onDate = appointments
    .filter(
      (appointment) => clinicDate(new Date(appointment.starts_at)) === date,
    )
    .slice()
    .sort(
      (left, right) =>
        Date.parse(left.starts_at) - Date.parse(right.starts_at) ||
        left.id.localeCompare(right.id),
    );
  return (
    onDate.find((appointment) => appointment.status === "in_progress") ??
    onDate.find(
      (appointment) =>
        appointment.status === "scheduled" &&
        Date.parse(appointment.ends_at) > Date.parse(currentTime),
    ) ??
    null
  );
}
