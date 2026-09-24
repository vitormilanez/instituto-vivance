import test from "node:test";
import assert from "node:assert/strict";
import { onboardingMeasurements } from "../modules/onboarding/display.ts";

test("cadastro exibe altura em metros quando o valor legado foi salvo em metros", () => {
  assert.equal(onboardingMeasurements({
    weightKg: 78,
    heightCm: 1.73,
    waistCm: 60,
    measuredOn: "2026-09-22",
  }), "Peso: 78 kg · Altura: 1,73 m · Cintura: 60 cm (22/09/2026)");
});

test("cadastro mantém centímetros e não inventa medidas ausentes", () => {
  assert.equal(onboardingMeasurements({
    weightKg: null,
    heightCm: 173,
    waistCm: null,
    measuredOn: null,
  }), "Altura: 173 cm");
  assert.equal(onboardingMeasurements({
    weightKg: null,
    heightCm: null,
    waistCm: null,
    measuredOn: null,
  }), "Não informadas");
});
