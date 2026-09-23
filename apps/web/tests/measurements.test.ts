import assert from "node:assert/strict";
import test from "node:test";
import { patientMeasurementInput } from "../modules/measurements/validation.ts";

const request = "4f12a070-7a7d-4a56-804d-00f4b579a573";

test("accepts one or more patient-reported measurements; the logged-in patient is the source", () => {
  assert.deepEqual(
    patientMeasurementInput({
      weight_kg: "72.4",
      height_cm: null,
      waist_cm: 91.2,
      measured_on: "2026-09-15",
      client_request_id: request,
    }),
    {
      weightKg: 72.4,
      heightCm: null,
      waistCm: 91.2,
      measuredOn: "2026-09-15",
      requestId: request,
    },
  );
});

test("a weight alone is enough and an old form's confirmed flag is still accepted", () => {
  const base = { measured_on: "2026-09-15", client_request_id: request };
  assert.equal(patientMeasurementInput({ ...base, weight_kg: 81.3 }).weightKg, 81.3);
  assert.equal(patientMeasurementInput({ ...base, weight_kg: 81.3, confirmed: true }).weightKg, 81.3);
  assert.throws(() => patientMeasurementInput({ ...base, weight_kg: 81.3, source: "x" }));
});

test("rejects empty, future and out-of-range measurements", () => {
  const base = { measured_on: "2026-09-15", client_request_id: request };
  assert.throws(() => patientMeasurementInput(base));
  assert.throws(() => patientMeasurementInput({ ...base, weight_kg: 501 }));
  assert.throws(() => patientMeasurementInput({ ...base, weight_kg: 72, measured_on: "2099-01-01" }));
});
