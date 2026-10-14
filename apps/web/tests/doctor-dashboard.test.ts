import test from "node:test";
import assert from "node:assert/strict";
import { bucketTotal, dashboardDays, nextScheduledToday, shiftDay } from "../modules/workspace/doctor-dashboard.ts";

test("dashboard days use calendar days across month/year boundaries", () => {
  assert.deepEqual(dashboardDays("2026-01-03"), ["2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03"]);
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
});
test("next badge is only a future scheduled appointment today in clinic timezone", () => {
  const row = (id: string, status: string, starts_at: string) => ({ id, status, starts_at });
  const items = [row("late", "scheduled", "2026-10-14T14:00:00Z"), row("active", "in_progress", "2026-10-14T14:30:00Z"), row("cancelled", "cancelled", "2026-10-14T16:00:00Z"), row("later", "scheduled", "2026-10-14T21:00:00Z"), row("next", "scheduled", "2026-10-14T18:00:00Z"), row("tomorrow", "scheduled", "2026-10-15T10:00:00Z")];
  assert.equal(nextScheduledToday(items, "2026-10-14T15:00:00Z", "2026-10-14")?.id, "next");
  assert.equal(nextScheduledToday(items, "2026-10-15T02:00:00Z", "2026-10-14"), null);
  assert.equal(nextScheduledToday([], "2026-10-14T15:00:00Z", "2026-10-14"), null);
});
test("unavailable metrics never become zero", () => {
  assert.equal(bucketTotal(null), null);
  assert.equal(bucketTotal(undefined), null);
  assert.equal(bucketTotal([{ label: "Hoje", value: 0 }]), 0);
  assert.equal(bucketTotal([{ label: "Ontem", value: 3 }, { label: "Hoje", value: 1 }]), 4);
});
