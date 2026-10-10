export type InvitationChannel = "email" | "whatsapp";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type InvitationDeliveryStatus = "requested" | "not_applicable" | "failed";
export type OnboardingStatus = "draft" | "submitted";
export type HealthStatus = "" | "yes" | "no" | "unknown" | "discuss";
export type HealthAnswer = { status: HealthStatus; details: string };
export type HealthContext = {
  medications: HealthAnswer;
  conditions: HealthAnswer;
  allergies: HealthAnswer;
  surgeries: HealthAnswer;
  familyHistory: HealthAnswer;
};
export function emptyHealthContext(): HealthContext {
  return Object.fromEntries(["medications", "conditions", "allergies", "surgeries", "familyHistory"]
    .map((key) => [key, { status: "", details: "" }])) as HealthContext;
}
export type OnboardingStep =
  | "profile"
  | "measurements"
  | "questions"
  | "exams"
  | "medications"
  | "history"
  | "family"
  | "goal"
  | "review";

export type PatientInvitation = {
  id: string;
  tenantId: string;
  displayName: string;
  channel: InvitationChannel;
  status: InvitationStatus;
  doctorId: string;
  expiresAt: string;
  createdAt: string;
  delivery: { status: InvitationDeliveryStatus };
};

export type OnboardingRecord = {
  tenantId: string;
  patientId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  skippedSteps: OnboardingStep[];
  examDocumentIds: string[];
  version: number;
  questionnaireVersion: "vivance-preconsulta-v1";
  profile: { photoDocumentId: string | null; birthDate: string | null };
  measurements: {
    weightKg: number | null;
    heightCm: number | null;
    waistCm: number | null;
    measuredOn: string | null;
  };
  answers: {
    goal: string;
    history: string;
    routine: string;
    treatments: string;
    questions: string;
  };
  healthContext: HealthContext;
  shareConsent: boolean;
  submittedAt: string | null;
  updatedAt: string;
};
