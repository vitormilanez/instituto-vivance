export const onboardingQuestions = [
  { id: "goal", label: "O que procura melhorar" },
  { id: "history", label: "Quando começou e o que mudou" },
  { id: "routine", label: "Rotina e impacto no dia a dia" },
  { id: "treatments", label: "Tratamentos, medicamentos e tentativas anteriores" },
  { id: "questions", label: "Dúvidas para a consulta" },
] as const;

export function onboardingMeasurements(measures: {
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  measuredOn: string | null;
}): string {
  const number = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
  const values = [
    measures.weightKg !== null ? `Peso: ${number(measures.weightKg)} kg` : null,
    measures.heightCm !== null
      ? measures.heightCm > 0 && measures.heightCm < 3
        ? `Altura: ${number(measures.heightCm)} m`
        : `Altura: ${number(measures.heightCm)} cm`
      : null,
    measures.waistCm !== null ? `Cintura: ${number(measures.waistCm)} cm` : null,
  ].filter(Boolean);
  if (!values.length) return "Não informadas";
  const measuredOn = measures.measuredOn
    ? ` (${measures.measuredOn.split("-").reverse().join("/")})`
    : "";
  return values.join(" · ") + measuredOn;
}
