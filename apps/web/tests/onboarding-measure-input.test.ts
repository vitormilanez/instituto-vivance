import test from "node:test";
import assert from "node:assert/strict";
import { parseMeasure, formatMeasure } from "../modules/onboarding/measure-input.ts";
test("height accepts Brazilian metres and persists centimetres", () => {
  assert.equal(parseMeasure("1,75", "heightCm"), 175);
  assert.equal(parseMeasure("1.82", "heightCm"), 182);
  assert.equal(formatMeasure(175, "heightCm"), "1,75");
  assert.equal(parseMeasure("175", "heightCm"), undefined);
});
test("optional measurements and decimals keep their units", () => {
  assert.equal(parseMeasure("", "waistCm"), null);
  assert.equal(parseMeasure("75,2", "weightKg"), 75.2);
  assert.equal(parseMeasure("90", "waistCm"), 90);
  for (const value of ["abc", "1,", "-75", "1,2,3", "Infinity"]) assert.equal(parseMeasure(value, "weightKg"), undefined);
});
