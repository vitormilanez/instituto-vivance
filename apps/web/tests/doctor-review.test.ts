import assert from "node:assert/strict";
import { test } from "node:test";
import { doctorReviewCounts, doctorReviewGroups, doctorReviewSelection, doctorReviewStateLabel } from "../modules/workspace/doctor-review.ts";
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

test("review detail resolves only authorized inbox items and respects patient scope", () => {
  assert.equal(doctorReviewSelection(patients, {})?.item.id, "1");
  assert.equal(doctorReviewSelection(patients, { paciente: "b" })?.item.id, "3");
  assert.equal(doctorReviewSelection(patients, { item: "messages:2" })?.patient.patientId, "a");
  assert.equal(doctorReviewSelection(patients, { item: "messages:2", paciente: "b" }), undefined);
  assert.equal(doctorReviewSelection(patients, { item: "documents:2" }), undefined);
  assert.equal(doctorReviewSelection(patients, { item: "messages:unknown" }), undefined);
  assert.equal(doctorReviewSelection(patients, { paciente: "unknown" }), undefined);
  assert.equal(doctorReviewSelection([], {}), undefined);
});

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

test("explicit clinical review takes precedence over opening and keeps filter totals consistent", () => {
  const reviewable: DoctorReviewPatient[] = [{
    patientId: "a", name: "Márcia Silva", items: [
      { id: "not-opened", kind: "preparation", at: "2026-09-21T10:00:00Z", seen: false, reviewed: false, author: null, href: "/prep" },
      { id: "opened", kind: "documents", at: "2026-09-21T11:00:00Z", seen: true, reviewed: false, author: null, href: "/doc" },
      { id: "reviewed", kind: "checkins", at: "2026-09-21T12:00:00Z", seen: false, reviewed: true, author: null, href: "/checkin" },
      { id: "unknown", kind: "documents", at: "2026-09-21T13:00:00Z", seen: true, reviewed: null, author: null, href: "/doc-unknown" },
    ],
  }];
  const counts = doctorReviewCounts(doctorReviewGroups(reviewable, defaults));
  assert.deepEqual(counts, { total: 4, unopened: 1, opened: 1, reviewed: 1, unknown: 1 });
  for (const status of ["unopened", "opened", "reviewed", "unknown"] as const) {
    const filtered = doctorReviewGroups(reviewable, { ...defaults, status });
    assert.equal(doctorReviewCounts(filtered).total, counts[status]);
  }
  assert.equal(doctorReviewStateLabel(reviewable[0].items[1]), "Já aberto · revisão não registrada");
  assert.equal(doctorReviewStateLabel(reviewable[0].items[2]), "Revisão registrada");
  assert.equal(doctorReviewStateLabel(reviewable[0].items[3]), "Revisão não confirmada");
});
