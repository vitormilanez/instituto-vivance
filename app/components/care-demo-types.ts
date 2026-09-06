export interface CareDemoScope {
  patientId: string;
  encounterId: string;
}

export interface PreConsultationAnswers {
  consentGiven: boolean;
  aiAssistanceAllowed: boolean;
  objective: string;
  changes: string;
  questions: string;
  additionalContext: string;
}

export interface PreConsultationSubmission extends PreConsultationAnswers {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  submittedAt: string;
  submittedAtIso: string;
  consentVersion: 'pre-consulta-texto-v1';
  structuredDraft: string | null;
}

export type PreConsultationReviewStatus = 'draft' | 'approved' | 'rejected';

export interface PreConsultationReview {
  id: string;
  patientId: string;
  encounterId: string;
  submissionId: string;
  version: number;
  status: PreConsultationReviewStatus;
  content: string;
  sourceMode: 'assisted' | 'manual';
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  updatedAtIso: string;
  reviewedAt: string | null;
  reviewedAtIso: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export type CarePlanStatus = 'draft' | 'approved' | 'published' | 'superseded';
export type CarePlanSourceMode = 'manual' | 'assisted';

export type CareConsultationClosureItemKind =
  | 'patient-report'
  | 'patient-priority'
  | 'open-question'
  | 'hypothesis';

export interface CareConsultationClosureItem {
  id: string;
  title: string;
  kind: CareConsultationClosureItemKind;
  sourceExcerptId: string;
  sourceTime: string;
  sourceQuote: string;
  coverage: 'direct' | 'partial';
  limitation: string;
}

export interface CareConsultationClosureInput {
  sessionVersion: number;
  reviewVersion: number;
  content: string;
  items: CareConsultationClosureItem[];
  consentVersion: 'teleconsulta-transcricao-v1';
  serviceMode: 'deterministic-mock';
}

export interface CareConsultationClosure extends CareConsultationClosureInput {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  approvedBy: string;
  approvedAt: string;
  approvedAtIso: string;
}

export interface CarePlanAction {
  id: string;
  title: string;
  cadence: string;
  active: boolean;
  sourceItemId: string | null;
}

export interface CarePlanDraftContent {
  title: string;
  objective: string;
  introduction: string;
  actions: CarePlanAction[];
  monitoring: string;
  supportNotice: string;
  sourceDescription: string;
  sourceMode: CarePlanSourceMode;
  sourceReviewId: string | null;
  sourceClosureId: string | null;
  sourceClosureVersion: number | null;
  sourceItemIds: string[];
}

export interface CarePlanVersion extends CarePlanDraftContent {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  status: CarePlanStatus;
  authoredBy: string;
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  updatedAtIso: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approvedAtIso: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  publishedAtIso: string | null;
  supersededByVersion: number | null;
}

export type CareCheckInSleepQuality = 'poor' | 'regular' | 'good';
export type CareCheckInInputMode = 'voice' | 'text';
export type CareCheckInPlanExperience = 'easy' | 'partial' | 'difficult' | 'not-applicable';

export interface CareCheckInInput {
  energy: 1 | 2 | 3 | 4 | 5;
  sleepQuality: CareCheckInSleepQuality;
  newSymptom: boolean;
  inputMode?: CareCheckInInputMode;
  originalText?: string;
  aiSummary?: string[];
  aiAssistanceAllowed?: boolean;
  planExperience?: CareCheckInPlanExperience;
  audioRef?: string | null;
  audioDurationSeconds?: number | null;
}

export interface CareCheckIn extends CareCheckInInput {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  inputMode: CareCheckInInputMode;
  originalText: string;
  aiSummary: string[];
  aiAssistanceAllowed: boolean;
  planExperience: CareCheckInPlanExperience;
  audioRef: string | null;
  audioDurationSeconds: number | null;
  submittedAt: string;
  submittedAtIso: string;
}

export interface CareCheckInReview {
  id: string;
  patientId: string;
  encounterId: string;
  checkInId: string;
  checkInVersion: number;
  reviewedBy: string;
  reviewedAt: string;
  reviewedAtIso: string;
}

export type CareFollowUpCadence = 'daily' | 'every-three-days' | 'three-times-week' | 'weekly';

export interface CareFollowUpConfiguration {
  id: string;
  patientId: string;
  encounterId: string;
  planId: string;
  planVersion: number;
  version: number;
  cadence: CareFollowUpCadence;
  configuredBy: string;
  configuredAt: string;
  configuredAtIso: string;
  retentionMode: 'session-only' | 'shared-care';
  contactMode: 'manual-only';
}

export interface CareFollowUpContact {
  id: string;
  patientId: string;
  encounterId: string;
  configurationId: string;
  configurationVersion: number;
  reason: 'check-in-not-recorded';
  recordedBy: string;
  recordedAt: string;
  recordedAtIso: string;
}

export type CareGuidedScore = 1 | 2 | 3 | 4 | 5;

export interface CareDiaryEntryInput {
  mealType: 'dinner';
  satiety: CareGuidedScore;
  digestiveComfort: CareGuidedScore;
  planEase: CareGuidedScore;
  analysisViewed: boolean;
}

export interface CareDiaryEntry extends CareDiaryEntryInput {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  attachmentRef: '/meals/jantar-omelete.jpg';
  sharedWithCareTeam: true;
  sharingConsentVersion: 'diario-contexto-v1';
  submittedAt: string;
  submittedAtIso: string;
}

export type CareConversationContext = 'care-plan' | 'check-in' | 'diary' | 'general';
export type CareConversationSender = 'patient' | 'doctor';

export interface CareConversationMessageInput {
  context: CareConversationContext;
  body: string;
}

export interface CareConversationMessage extends CareConversationMessageInput {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  sender: CareConversationSender;
  sentAt: string;
  sentAtIso: string;
  retentionMode: 'session-only' | 'durable';
}

export interface CarePlanActionConfirmation {
  id: string;
  patientId: string;
  encounterId: string;
  planId: string;
  planVersion: number;
  actionId: string;
  completed: boolean;
  recordedAt: string;
  recordedAtIso: string;
}

export type CareAiPreparationDecision = 'included' | 'dismissed';
export type CareAiPreparationDismissalReason =
  | 'duplicate'
  | 'already-reviewed'
  | 'insufficient-source'
  | 'not-useful';

export interface CareAiPreparationSourceRef {
  id: string;
  version: number;
  label: string;
}

export interface CareAiPreparationReviewItem {
  id: string;
  label: string;
  decision: CareAiPreparationDecision;
  sourceIds: string[];
  dismissalReason: CareAiPreparationDismissalReason | null;
}

export interface CareAiPreparationReviewInput {
  authorizationMode: 'mock-scenario' | 'patient-consent';
  templateVersion: 'preparo-consulta-v1';
  serviceMode: 'deterministic-mock';
  sourceRefs: CareAiPreparationSourceRef[];
  items: CareAiPreparationReviewItem[];
}

export interface CareAiPreparationReview extends CareAiPreparationReviewInput {
  id: string;
  patientId: string;
  encounterId: string;
  version: number;
  sourceFingerprint: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewedAtIso: string;
}

export type CareAuditAction =
  | 'check-in-submitted'
  | 'check-in-reviewed'
  | 'follow-up-configured'
  | 'follow-up-contact-recorded'
  | 'diary-entry-submitted'
  | 'conversation-message-sent'
  | 'pre-consultation-submitted'
  | 'pre-consultation-review-started'
  | 'pre-consultation-review-approved'
  | 'pre-consultation-review-rejected'
  | 'consultation-closure-approved'
  | 'care-plan-created'
  | 'care-plan-approved'
  | 'care-plan-published'
  | 'ai-preparation-reviewed';

export type CareAuditActor = 'patient' | 'doctor' | 'system';

export interface CareAuditEvent {
  id: string;
  patientId: string;
  encounterId: string;
  action: CareAuditAction;
  actor: CareAuditActor;
  actorLabel: string;
  occurredAt: string;
  occurredAtIso: string;
  relatedId: string;
  relatedVersion: number;
  summary: string;
  consentVersion: 'pre-consulta-texto-v1' | 'teleconsulta-transcricao-v1' | null;
  aiAssistanceAllowed: boolean | null;
}
