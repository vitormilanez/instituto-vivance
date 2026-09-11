import test from "node:test";
import assert from "node:assert/strict";
import {
  agendaDate,
  appointmentInput,
  appointmentPatch,
  clinicDate,
  localToInstant,
} from "../modules/agenda/validation.ts";
const base = {
  patient_id: "00000000-0000-0000-0000-000000000001",
  doctor_id: "00000000-0000-0000-0000-000000000002",
  starts_at: "2099-10-10T12:00:00.000Z",
  ends_at: "2099-10-10T12:30:00.000Z",
  kind: "consultation",
};
test("scheduling converts Brasilia input independently of device timezone", () => {
  assert.equal(
    localToInstant("2026-09-11", "09:00"),
    "2026-09-11T12:00:00.000Z",
  );
  assert.equal(clinicDate(new Date("2026-09-11T01:00:00Z")), "2026-09-10");
  assert.throws(() => localToInstant("2026-02-30", "09:00"));
  assert.throws(() => localToInstant("2026-09-11", "24:00"));
  assert.throws(() => agendaDate("2026-2-3"));
});
test("appointment input bounds duration, dates, identifiers and type", () => {
  assert.deepEqual(appointmentInput(base), base);
  for (const patch of [
    { starts_at: "2020-01-01T00:00:00.000Z" },
    { ends_at: base.starts_at },
    { ends_at: "2099-10-10T22:00:00.000Z" },
    { starts_at: "2099-02-30T12:00:00.000Z" },
    { doctor_id: "bad" },
    { kind: "fake" },
    { patient_id: null },
  ])
    assert.throws(() => appointmentInput({ ...base, ...patch }));
});
test("appointment input rejects actor, role, tenant and status injection", () => {
  for (const key of [
    "tenant_id",
    "created_by",
    "status",
    "version",
    "id",
    "role",
  ])
    assert.throws(() => appointmentInput({ ...base, [key]: "injected" }));
});
test("editing requires optimistic version and cancellation cannot carry mutations", () => {
  assert.deepEqual(appointmentPatch({ status: "cancelled", version: 1 }), {
    values: { status: "cancelled" },
    version: 1,
  });
  assert.deepEqual(appointmentPatch({ ...base, version: 2 }), {
    values: base,
    version: 2,
  });
  for (const version of [undefined, 0, -1, 1.5, "1"])
    assert.throws(() => appointmentPatch({ ...base, version }));
  assert.throws(() =>
    appointmentPatch({ ...base, status: "cancelled", version: 1 }),
  );
});
