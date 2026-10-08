export type PatientGoalInput = {
  expectedOutcome: string | null;
  firstPriority: string | null;
  source: "staff_assisted" | "patient_reported" | null;
  recordedByName: string | null;
  updatedAt: string | null;
  awaitingPatient?: boolean;
};

export function patientGoalFacts(input: PatientGoalInput) {
  const expectedOutcome = input.expectedOutcome?.trim() || null;
  const firstPriority = input.firstPriority?.trim() || null;
  if (!expectedOutcome && !firstPriority) return null;

  const origin = input.source === "staff_assisted"
    ? `Registrado com apoio da equipe${input.recordedByName?.trim() ? ` · ${input.recordedByName.trim()}` : ""}`
    : input.source === "patient_reported"
      ? "Relatado pelo paciente"
      : "Origem indisponível";
  const updatedAt = input.updatedAt && !Number.isNaN(Date.parse(input.updatedAt))
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(input.updatedAt))
    : null;

  return {
    title: input.awaitingPatient ? "Último objetivo registrado" : "Objetivo atual",
    expectedOutcome,
    firstPriority,
    origin,
    updatedAt,
  };
}
