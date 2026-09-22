import type { Appointment } from "@/modules/agenda/service";

/**
 * An appointment that remains operationally open after its scheduled end must
 * not keep displacing the patient's real next action. The team can still see
 * and resolve its operational status in the agenda.
 */
export function patientNextAppointment(
  appointments: Appointment[],
  currentTime: string,
) {
  const currentAppointment = appointments.find(
    (appointment) =>
      appointment.status === "in_progress" && appointment.ends_at >= currentTime,
  );

  return (
    currentAppointment ??
    appointments.find(
      (appointment) =>
        appointment.status === "scheduled" && appointment.ends_at >= currentTime,
    ) ??
    null
  );
}
