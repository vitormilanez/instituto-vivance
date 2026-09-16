import assert from "node:assert/strict";
import test from "node:test";
import { patientMeasurementInput } from "../modules/measurements/validation.ts";

const request = "4f12a070-7a7d-4a56-804d-00f4b579a573";

test("accepts one or more patient-reported measurements with a confirmed source", () => {
  assert.deepEqual(
    patientMeasurementInput({
      weight_kg: "72.4",
      height_cm: null,
      waist_cm: 91.2,
      measured_on: "2026-09-15",
      client_request_id: request,
      confirmed: true,
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

test("rejects empty, unconfirmed, future and out-of-range measurements", () => {
  const base = { measured_on: "2026-09-15", client_request_id: request, confirmed: true };
  assert.throws(() => patientMeasurementInput(base));
  assert.throws(() => patientMeasurementInput({ ...base, weight_kg: 72, confirmed: false }));
  assert.throws(() => patientMeasurementInput({ ...base, weight_kg: 501 }));
  assert.throws(() => patientMeasurementInput({ ...base, weight_kg: 72, measured_on: "2099-01-01" }));
});
