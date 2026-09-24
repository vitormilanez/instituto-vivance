import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  instantStart,
  normalizeMeetUrl,
  teleconsultationBookingInput,
} from "../modules/teleconsultations/validation.ts";

const patient = "11111111-1111-4111-8111-111111111111";
const doctor = "22222222-2222-4222-8222-222222222222";
const meet = "https://meet.google.com/abc-defg-hij";

test("instant teleconsultation starts on the next whole minute, always in the future", () => {
  const now = Date.parse("2026-09-24T01:00:10.000Z");
  assert.equal(instantStart(now), "2026-09-24T01:01:00.000Z");
  const late = Date.parse("2026-09-24T01:00:45.000Z");
  assert.equal(instantStart(late), "2026-09-24T01:02:00.000Z");
  for (const offset of [0, 1, 29_999, 30_000, 59_999]) {
    const at = Date.parse("2026-09-24T01:00:00.000Z") + offset;
    assert.ok(Date.parse(instantStart(at)) - at >= 30_000);
  }
});

test("Meet links copied with account parameters are stored in canonical form", () => {
  assert.equal(normalizeMeetUrl(`${meet}?authuser=0`), meet);
  assert.equal(normalizeMeetUrl(` meet.google.com/ABC-DEFG-HIJ?pli=1 `), meet);
  assert.equal(normalizeMeetUrl("http://meet.google.com/abc-defg-hij"), meet);
  // Outros domínios não são reescritos e continuam recusados pela validação.
  assert.equal(
    normalizeMeetUrl("https://meet.google.com.evil.test/abc-defg-hij"),
    "https://meet.google.com.evil.test/abc-defg-hij",
  );
});

test("booking accepts an existing patient now, with explicit care acceptance", () => {
  const booking = teleconsultationBookingInput({
    when: "now",
    patient_id: patient,
    doctor_id: doctor,
    kind: "consultation",
    join_url: `${meet}?authuser=0`,
    duration_minutes: 30,
    accept_care: true,
  });
  assert.deepEqual(booking.patient, { id: patient });
  assert.equal(booking.joinUrl, meet);
  assert.equal(booking.startsAt, null);
  assert.throws(
    () =>
      teleconsultationBookingInput({
        when: "now",
        patient_id: patient,
        doctor_id: doctor,
        join_url: meet,
        duration_minutes: 30,
      }),
    /responsável/,
  );
});

test("booking schedules a new patient and rejects ambiguous or unsafe input", () => {
  const booking = teleconsultationBookingInput({
    when: "scheduled",
    new_patient: { display_name: "Paciente Teste", birth_date: "" },
    doctor_id: doctor,
    kind: "return",
    join_url: meet,
    duration_minutes: 45,
    starts_at: "2026-10-01T13:00:00.000Z",
  });
  assert.deepEqual(booking.patient, {
    new: { display_name: "Paciente Teste", birth_date: null },
  });
  assert.equal(booking.startsAt, "2026-10-01T13:00:00.000Z");
  const base = {
    when: "scheduled",
    patient_id: patient,
    doctor_id: doctor,
    join_url: meet,
    duration_minutes: 30,
    starts_at: "2026-10-01T13:00:00.000Z",
  };
  for (const bad of [
    { ...base, new_patient: { display_name: "Outro" } },
    { ...base, patient_id: undefined },
    { ...base, join_url: "https://zoom.us/j/123" },
    { ...base, join_url: "https://meet.google.com.evil.test/abc-defg-hij" },
    { ...base, duration_minutes: 2 },
    { ...base, starts_at: "amanhã" },
    { ...base, when: "later" },
    { ...base, extra: true },
  ])
    assert.throws(() => teleconsultationBookingInput(bad));
});

test("booking keeps the existing steps: RLS session, agenda, Meet link and encounter RPC", () => {
  const service = readFileSync(
    new URL("../modules/teleconsultations/booking.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(service, /service_role|createAdminClient|SERVICE_ROLE/);
  assert.match(service, /createAppointment\(/);
  assert.match(service, /saveAppointmentTeleconsultation\(/);
  assert.match(service, /startEncounter\(/);
  assert.match(service, /clinic\.role !== "doctor" \|\| input\.doctorId !== user\.id/);
});

test("Teleconsulta is a menu destination for doctors and staff", () => {
  const doctorShell = readFileSync(
    new URL("../components/doctor-shell.tsx", import.meta.url),
    "utf8",
  );
  const clinicShell = readFileSync(
    new URL("../components/clinic-shell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(doctorShell, /label: "Teleconsulta"/);
  assert.match(clinicShell, /key: "teleconsulta"/);
});
