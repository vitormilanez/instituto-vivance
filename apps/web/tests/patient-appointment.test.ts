import assert from "node:assert/strict";
import test from "node:test";
import type { Appointment } from "../modules/agenda/service.ts";
import { patientNextAppointment } from "../modules/workspace/patient-appointment.ts";

function appointment(
  id: string,
  status: "scheduled" | "in_progress" | "completed",
  endsAt: string,
): Appointment {
  return {
    id,
    status,
    ends_at: endsAt,
    starts_at: "2026-09-21T12:00:00.000Z",
    kind: "consultation",
    patient_id: "patient",
    doctor_id: "doctor",
    doctor_display_name: "Dra. Vivance",
    version: 1,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    no_show_at: null,
    patients: { display_name: "Paciente" },
  };
}

test("patient today ignores an operationally open appointment that already ended", () => {
  const next = patientNextAppointment(
    [
      appointment("stale", "in_progress", "2026-09-15T15:00:00.000Z"),
      appointment("upcoming", "scheduled", "2026-09-24T15:00:00.000Z"),
    ],
    "2026-09-21T15:00:00.000Z",
  );

  assert.equal(next?.id, "upcoming");
});

test("patient today keeps an appointment currently in progress as the next consultation", () => {
  const next = patientNextAppointment(
    [
      appointment("current", "in_progress", "2026-09-21T15:30:00.000Z"),
      appointment("upcoming", "scheduled", "2026-09-24T15:00:00.000Z"),
    ],
    "2026-09-21T15:00:00.000Z",
  );

  assert.equal(next?.id, "current");
});
