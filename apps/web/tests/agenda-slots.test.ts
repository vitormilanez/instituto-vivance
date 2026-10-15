import test from "node:test";
import assert from "node:assert/strict";
import { daySlots, slotOccupied } from "../modules/agenda/slots.ts";

const item = { doctor_id: "doctor", starts_at: "2026-10-16T12:15:00.000Z", ends_at: "2026-10-16T13:00:00.000Z", status: "scheduled" };
test("day slots preserve appointments outside the shortcuts and off the half-hour grid", () => {
  const times = daySlots("2026-10-16", [item, { ...item, starts_at: "2026-10-16T10:10:00.000Z" }, { ...item, starts_at: "2026-10-16T23:45:00.000Z" }]);
  assert.ok(times.includes("07:10"));
  assert.ok(times.includes("09:15"));
  assert.ok(times.includes("20:45"));
  assert.deepEqual(times, [...times].sort());
  assert.equal(times.length, new Set(times).size);
  assert.ok(daySlots("2026-10-16", [{ ...item, starts_at: "2026-10-16T02:00:00.000Z", ends_at: "2026-10-16T05:00:00.000Z" }]).includes("00:00"));
});
test("occupied slots respect doctor, half-open interval, cancelled bookings and spanning blocks", () => {
  assert.equal(slotOccupied("2026-10-16", "09:30", "doctor", [item]), true);
  assert.equal(slotOccupied("2026-10-16", "10:00", "doctor", [item]), false);
  assert.equal(slotOccupied("2026-10-16", "09:30", "other", [item]), false);
  assert.equal(slotOccupied("2026-10-16", "09:30", "doctor", [{ ...item, status: "cancelled" }]), false);
  assert.equal(slotOccupied("2026-10-16", "09:30", "doctor", [{ ...item, status: "active", starts_at: "2026-10-15T12:00:00.000Z" }]), true);
});
