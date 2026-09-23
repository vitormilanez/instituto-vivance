import assert from "node:assert/strict";
import { test } from "node:test";
import { doctorReviewGroups } from "../modules/workspace/doctor-review.ts";
import type { DoctorReviewPatient } from "../modules/workspace/doctor-review.ts";

const patients: DoctorReviewPatient[] = [
  {
    patientId: "a",
    name: "Márcia Silva",
    items: [
      {
        id: "2",
        kind: "messages",
        at: "2026-09-22T10:00:00Z",
        seen: false,
        author: null,
        href: "/message",
      },
      {
        id: "1",
        kind: "documents",
        at: "2026-09-20T10:00:00Z",
        seen: true,
        author: null,
        href: "/document",
      },
    ],
  },
  {
    patientId: "b",
    name: "Bruno Alves",
    items: [
      {
        id: "3",
        kind: "daily_checkins",
        at: "2026-09-21T10:00:00Z",
        seen: null,
        author: null,
        href: "/checkin",
      },
      {
        id: "4",
        kind: "messages",
        at: "2026-09-21T11:00:00Z",
        seen: false,
        author: null,
        href: "/message-b",
      },
    ],
  },
];
const defaults = { kind: "all", status: "all", search: "" } as const;

test("review groups chronological arrivals without changing source ordering or links", () => {
  const groups = doctorReviewGroups(patients, defaults);
  assert.deepEqual(
    groups.map((group) => group.patientId),
    ["a", "b"],
  );
  assert.deepEqual(
    groups[0].items.map((item) => item.id),
    ["1", "2"],
  );
  assert.equal(groups[0].items[0].href, "/document");
  assert.equal(patients[0].items[0].id, "2");
});
test("review filters before ordering patients by oldest matching arrival", () => {
  const groups = doctorReviewGroups(patients, {
    ...defaults,
    status: "unopened",
  });
  assert.deepEqual(
    groups.map((group) => group.patientId),
    ["b", "a"],
  );
  assert.deepEqual(
    groups.flatMap((group) => group.items.map((item) => item.id)),
    ["4", "2"],
  );
});
test("unknown opening state stays unknown, never counted as opened or unopened", () => {
  for (const status of ["opened", "unopened"] as const) {
    assert.ok(
      doctorReviewGroups(patients, { ...defaults, status }).every((group) =>
        group.items.every((item) => item.seen !== null),
      ),
    );
  }
  assert.equal(
    doctorReviewGroups(patients, defaults).flatMap((group) => group.items)
      .length,
    4,
  );
});
test("review combines accent-insensitive patient search, kind and opening filters", () => {
  const groups = doctorReviewGroups(patients, {
    kind: "documents",
    status: "opened",
    search: " marcia ",
  });
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].items.map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(
    doctorReviewGroups(patients, { ...defaults, kind: "preparation" }),
    [],
  );
  assert.deepEqual(doctorReviewGroups([], defaults), []);
});
