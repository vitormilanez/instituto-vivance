export const consultationSummaryCategories = [
  "discussed",
  "patient_goals",
  "difficulties",
  "conditions_and_history",
  "medications_and_supplements",
  "goals",
  "actions_and_followup",
  "uncertainties",
] as const;

export type ConsultationSummaryCategory = typeof consultationSummaryCategories[number];
export type ConsultationSpeaker = "patient" | "doctor" | "unknown";
export type ConsultationAssertion =
  | "patient_report"
  | "doctor_statement"
  | "agreed_action"
  | "hypothesis"
  | "uncertainty";

export type ConsultationSourceSegment = {
  id: string;
  text: string;
  capturedAt: string;
  startSeconds: number;
  endSeconds: number;
  speaker: ConsultationSpeaker;
};

export type ConsultationSummaryEvidence = {
  sourceId: string;
  quote: string;
};

export type ConsultationSummaryItem = {
  text: string;
  assertion: ConsultationAssertion;
  evidence: ConsultationSummaryEvidence[];
};

export type ConsultationSummary = {
  contractVersion: "consultation-summary-v1";
  mode: "model_generated" | "extractive";
  categories: Record<ConsultationSummaryCategory, ConsultationSummaryItem[]>;
  incomplete: boolean;
  limitations: string[];
};

export type ConsultationSummaryValidation = {
  valid: boolean;
  acceptedItems: number;
  removedItems: number;
  issues: string[];
};

export type ConsultationSummaryGenerationMetadata = {
  provider: "anthropic" | "none";
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  validation: ConsultationSummaryValidation;
  usedFallback: boolean;
  failureReason?:
    | "disabled"
    | "provider_unavailable"
    | "provider_incomplete"
    | "invalid_provider_output";
};

export type ConsultationSummaryGeneration = {
  summary: ConsultationSummary;
  metadata: ConsultationSummaryGenerationMetadata;
};
