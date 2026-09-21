export type PatientIntakeContext = {
  id: string;
  tenantId: string;
  patientId: string;
  questionnaireVersion: "vivance-acolhimento-v1";
  status: "draft" | "completed";
  reason: string;
  expectedOutcome: string;
  firstPriority: string;
  source: "staff_assisted" | "patient_reported";
  recordedBy: string;
  recordedByName: string;
  version: number;
  completedAt: string | null;
  updatedAt: string;
};
