type AppointmentState = { status: string; ends_at: string };

const statuses: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "scheduled" },
  in_progress: { label: "Em atendimento", className: "in-progress" },
  completed: { label: "Realizada", className: "completed" },
  cancelled: { label: "Cancelado", className: "cancelled" },
  no_show: { label: "Falta", className: "no-show" },
};

// Passage of time is a presentation concern, never proof of attendance.
export function needsAppointmentOutcome(appointment: AppointmentState, now: string) {
  return appointment.status === "scheduled" &&
    Date.parse(appointment.ends_at) <= Date.parse(now);
}

export function appointmentPresentation(appointment: AppointmentState, now: string, staff = false) {
  if (staff && needsAppointmentOutcome(appointment, now)) {
    return { label: "Resultado pendente", className: "outcome-pending" };
  }
  return statuses[appointment.status] ?? { label: "Estado indisponível", className: "unknown" };
}
