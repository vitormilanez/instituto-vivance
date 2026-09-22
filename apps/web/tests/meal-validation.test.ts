import assert from "node:assert/strict";
import test from "node:test";
import { mealInput, mealTypeLabels } from "../modules/meals/validation.ts";

const key = "11111111-1111-4111-8111-111111111111";

test("meal registration preserves the report exactly as sent", () => {
  for (const description of [
    " Arroz, frango e salada. ",
    "  Café com leite\n",
    "\nPão, ovo e mamão\n\n",
    "Jantar: sopa de legumes\t",
    "Açaí, pão de queijo e suco de caju.",
  ])
    assert.deepEqual(
      mealInput({
        request_key: key,
        meal_type: "lunch",
        eaten_at: "2026-09-21T12:30:00.000Z",
        description,
      }),
      {
        requestKey: key,
        mealType: "lunch",
        eatenAt: "2026-09-21T12:30:00.000Z",
        description,
        photoDocument: null,
      },
      `a descrição "${JSON.stringify(description)}" foi alterada`,
    );
  assert.equal(mealTypeLabels.snack, "Lanche");
});

test("meal registration accepts only a well-formed photo document id", () => {
  const photo = "22222222-2222-4222-8222-222222222222";
  assert.equal(
    mealInput({
      request_key: key,
      meal_type: "lunch",
      eaten_at: "2026-09-21T12:30:00Z",
      description: "Com foto.",
      photo_document_id: photo,
    }).photoDocument,
    photo,
  );
  // Sem foto continua válido; o campo nulo explícito também.
  assert.equal(
    mealInput({
      request_key: key,
      meal_type: "lunch",
      eaten_at: "2026-09-21T12:30:00Z",
      description: "Sem foto.",
      photo_document_id: null,
    }).photoDocument,
    null,
  );
  for (const photo_document_id of ["", "not-a-uuid", 42, "22222222-2222-4222-8222-22222222222"])
    assert.throws(() =>
      mealInput({
        request_key: key,
        meal_type: "lunch",
        eaten_at: "2026-09-21T12:30:00Z",
        description: "Foto inválida.",
        photo_document_id,
      }),
    );
});

test("meal registration counts characters, not bytes, up to 2.000", () => {
  const note = (size: number) => "á".repeat(size);
  assert.equal(mealInput({
    request_key: key,
    meal_type: "dinner",
    eaten_at: "2026-09-21T12:30:00Z",
    description: note(2000),
  }).description, note(2000));
  assert.throws(() =>
    mealInput({
      request_key: key,
      meal_type: "dinner",
      eaten_at: "2026-09-21T12:30:00Z",
      description: note(2001),
    }),
  );
});

test("meal registration rejects forged fields, invalid types and blank notes", () => {
  for (const value of [
    { request_key: key, meal_type: "breakfast", eaten_at: "not-a-date", description: "Café" },
    { request_key: key, meal_type: "clinical_diagnosis", eaten_at: "2026-09-21T12:30:00Z", description: "Café" },
    { request_key: key, meal_type: "dinner", eaten_at: "2026-09-21T12:30:00Z", description: "" },
    { request_key: key, meal_type: "dinner", eaten_at: "2026-09-21T12:30:00Z", description: "   " },
    { request_key: key, meal_type: "dinner", eaten_at: "2026-09-21T12:30:00Z", description: "\n \t\n" },
    { request_key: key, meal_type: "dinner", eaten_at: "2026-09-21T12:30:00Z", description: "Jantar", extra: true },
  ]) assert.throws(() => mealInput(value));
});
