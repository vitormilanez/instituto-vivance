import type { OnboardingStep } from "./types";

export type OnboardingProgressStep = "welcome" | OnboardingStep;

export function onboardingProgress(
  step: OnboardingProgressStep,
  questionIndex: number,
  skipQuestions: boolean,
) {
  if (skipQuestions) {
    const values: Record<OnboardingProgressStep, number> = {
      welcome: 0,
      profile: 1,
      measurements: 2,
      questions: 2,
      exams: 3,
      review: 4,
    };
    return { value: values[step], max: 4 };
  }

  const values: Record<Exclude<OnboardingProgressStep, "questions">, number> = {
    welcome: 0,
    profile: 1,
    measurements: 2,
    exams: 8,
    review: 9,
  };
  return step === "questions"
    ? { value: 3 + Math.max(0, Math.min(questionIndex, 4)), max: 9 }
    : { value: values[step], max: 9 };
}
