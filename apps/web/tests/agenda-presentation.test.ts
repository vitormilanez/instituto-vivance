import test from "node:test";
import assert from "node:assert/strict";
import { appointmentPresentation, needsAppointmentOutcome } from "../modules/agenda/presentation.ts";

const scheduled = { status: "scheduled", ends_at: "2026-09-25T11:34:00.000Z" };
test("overdue appointments request an outcome at the exact end, without changing persisted status", () => {
  assert.equal(needsAppointmentOutcome(scheduled, "2026-09-25T11:33:59.999Z"), false);
  assert.equal(needsAppointmentOutcome(scheduled, scheduled.ends_at), true);
  assert.equal(appointmentPresentation(scheduled, "2026-09-25T13:00:00Z", true).label, "Resultado pendente");
  assert.equal(scheduled.status, "scheduled");
  assert.equal(appointmentPresentation(scheduled, "2026-09-25T13:00:00Z").label, "Agendado");
});
test("outcomes are not inferred over an explicit clinical or administrative state", () => {
  for (const status of ["in_progress", "completed", "no_show", "cancelled"]) {
    assert.equal(needsAppointmentOutcome({ ...scheduled, status }, "2026-09-25T13:00:00Z"), false);
  }
  assert.equal(appointmentPresentation({ ...scheduled, status: "completed" }, "2026-09-25T13:00:00Z", true).label, "Realizada");
});
test("equivalent instants respect Brasilia regardless of ISO offset format", () => {
  assert.equal(needsAppointmentOutcome(scheduled, "2026-09-25T08:34:00-03:00"), true);
  assert.equal(needsAppointmentOutcome({ ...scheduled, ends_at: "invalid" }, "2026-09-25T13:00:00Z"), false);
});
