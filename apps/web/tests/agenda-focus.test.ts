import test from "node:test";
import assert from "node:assert/strict";
import { focusedAppointment } from "../modules/agenda/focus.ts";

const appointment = (
  id: string,
  status: string,
  startsAt: string,
  endsAt = "2026-09-12T16:30:00.000Z",
) => ({ id, status, starts_at: startsAt, ends_at: endsAt });

test("shared focus prioritizes an in-progress appointment on the Brasilia date", () => {
  const now = "2026-09-12T15:00:00.000Z";
  const appointments = [
    appointment("scheduled-first", "scheduled", "2026-09-12T14:00:00.000Z"),
    appointment("active", "in_progress", "2026-09-12T17:00:00.000Z"),
  ];
  assert.equal(
    focusedAppointment(appointments, now, "2026-09-12")?.id,
    "active",
  );
});

test("shared focus uses the first still-valid scheduled appointment chronologically", () => {
  const now = "2026-09-12T15:00:00.000Z";
  const appointments = [
    appointment("later", "scheduled", "2026-09-12T19:00:00.000Z"),
    appointment("expired", "scheduled", "2026-09-12T13:00:00.000Z", "2026-09-12T14:59:59.000Z"),
    appointment("first", "scheduled", "2026-09-12T16:00:00.000Z"),
    appointment("completed", "completed", "2026-09-12T12:00:00.000Z"),
    appointment("cancelled", "cancelled", "2026-09-12T18:00:00.000Z"),
    appointment("no-show", "no_show", "2026-09-12T18:30:00.000Z"),
  ];
  assert.equal(
    focusedAppointment(appointments, now, "2026-09-12")?.id,
    "first",
  );
});

test("shared focus never promotes an appointment from another Brasilia date", () => {
  const now = "2026-09-12T02:30:00.000Z";
  const appointments = [
    appointment("previous-local-day", "in_progress", "2026-09-12T01:00:00.000Z"),
    appointment("closed", "completed", "2026-09-12T18:00:00.000Z"),
  ];
  assert.equal(focusedAppointment(appointments, now, "2026-09-12"), null);
});
