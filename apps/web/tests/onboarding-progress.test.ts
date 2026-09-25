import assert from "node:assert/strict";
import test from "node:test";
import { onboardingProgress } from "../modules/onboarding/progress.ts";

test("progresso do onboarding avança em unidades inteiras sem saltar perguntas", () => {
  const steps = [
    onboardingProgress("welcome", 0, false),
    onboardingProgress("profile", 0, false),
    onboardingProgress("measurements", 0, false),
    ...Array.from({ length: 5 }, (_, index) => onboardingProgress("questions", index, false)),
    onboardingProgress("exams", 0, false),
    onboardingProgress("review", 0, false),
  ];
  assert.deepEqual(steps.map(({ value }) => value), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(steps.every(({ max }) => max === 9));
});

test("progresso sem pré-consulta mantém as quatro etapas visíveis", () => {
  assert.deepEqual(
    ["welcome", "profile", "measurements", "exams", "review"].map((step) =>
      onboardingProgress(step as "welcome" | "profile" | "measurements" | "exams" | "review", 0, true).value,
    ),
    [0, 1, 2, 3, 4],
  );
});
