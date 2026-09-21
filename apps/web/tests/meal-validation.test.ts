import assert from "node:assert/strict";
import test from "node:test";
import { mealInput, mealTypeLabels } from "../modules/meals/validation.ts";

const key = "11111111-1111-4111-8111-111111111111";

test("meal registration accepts a patient-owned note with a concrete meal type", () => {
  assert.deepEqual(mealInput({
    request_key: key,
    meal_type: "lunch",
    eaten_at: "2026-09-21T12:30:00.000Z",
    description: " Arroz, frango e salada. ",
  }), {
    requestKey: key,
    mealType: "lunch",
    eatenAt: "2026-09-21T12:30:00.000Z",
    description: "Arroz, frango e salada.",
  });
  assert.equal(mealTypeLabels.snack, "Lanche");
});

test("meal registration rejects forged fields, invalid types and empty notes", () => {
  for (const value of [
    { request_key: key, meal_type: "breakfast", eaten_at: "not-a-date", description: "Café" },
    { request_key: key, meal_type: "clinical_diagnosis", eaten_at: "2026-09-21T12:30:00Z", description: "Café" },
    { request_key: key, meal_type: "dinner", eaten_at: "2026-09-21T12:30:00Z", description: "" },
    { request_key: key, meal_type: "dinner", eaten_at: "2026-09-21T12:30:00Z", description: "Jantar", extra: true },
  ]) assert.throws(() => mealInput(value));
});
