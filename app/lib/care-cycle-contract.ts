import type { CareDemoState,CareDemoStoreValue } from '../components/care-demo-store';
import type { ClinicalExamDocument,ClinicalExamField } from '../components/clinical-intelligence-model';

export const sharedCareKeys = ['carePlans', 'checkIns', 'checkInReviews', 'actionConfirmations', 'consultationClosures', 'followUpConfigurations', 'followUpContacts'] as const;
export type SharedCare = Pick<CareDemoState, typeof sharedCareKeys[number]>;
export const coreCareCommands = ['submitCheckIn', 'reviewCheckIn', 'startCarePlan', 'createCarePlanRevision', 'saveCarePlan', 'approveCarePlan', 'publishCarePlan', 'confirmCarePlanAction', 'configureFollowUp', 'recordFollowUpContact', 'recordConsultationClosure'] as const;
export type CoreCareCommand = typeof coreCareCommands[number];
export type CoreResult<K extends CoreCareCommand> = ReturnType<CareDemoStoreValue[K]>;

export interface CareFile {
  id: string; name: string; mediaType: string; size: number;
}
export interface CareSubmission {
  id: string; patientId: string; encounterId: string;
  kind: 'text' | 'audio' | 'photo' | 'pdf'; title: string; originalText: string;
  attachment: CareFile | null; receivedAt: string; receivedBy: string;
  status: 'received' | 'reviewed' | 'published';
  reviewVersion: number; reviewedAt: string | null; reviewedBy: string | null;
  reviewText: string | null; feedbackDraft: string | null;
  publishedFeedback: string | null; publishedAt: string | null;
}
export interface CareCycle {
  relationshipId?: string;
  patientId: string; encounterId: string; revision: number;
  care: SharedCare; exams: ClinicalExamDocument[]; submissions: CareSubmission[];
}
export type CycleCommand = CoreCareCommand | 'sharePatientExam' | 'approveExam' | 'submitInformation' | 'reviewInformation' | 'publishFeedback';
export interface CycleMutation {
  relationshipId?: string;
  patientId: string; encounterId: string; revision: number; requestId: string;
  command: CycleCommand; args: unknown[];
}
export type ExamReviewInput = { examId: string; fields: ClinicalExamField[] };
export const cycleKey = (patientId: string, encounterId: string) => `${patientId}::${encounterId}`;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function validCycleMutation(value: unknown): value is CycleMutation {
  return isRecord(value) && typeof value.patientId === 'string' && /^(?:pac-demo-\d{3}|pac-[0-9a-f-]{36})$/u.test(value.patientId)
    && typeof value.encounterId === 'string' && /^(?:enc-demo-\d{3}|enc-pac-[0-9a-f-]{36})$/u.test(value.encounterId)
    && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0
    && typeof value.requestId === 'string' && /^[a-zA-Z0-9-]{16,80}$/u.test(value.requestId)
    && [...coreCareCommands, 'sharePatientExam', 'approveExam', 'submitInformation', 'reviewInformation', 'publishFeedback'].includes(value.command as CycleCommand)
    && Array.isArray(value.args) && value.args.length <= 4;
}

export function patientCycleView(cycle: CareCycle): CareCycle {
  return {
    ...cycle,
    care: { ...cycle.care,
      carePlans: cycle.care.carePlans.filter((plan) => plan.status === 'published' || plan.status === 'superseded'),
      consultationClosures: [],
    },
    submissions: cycle.submissions.map((item) => ({ ...item, reviewText: null, feedbackDraft: null })),
  };
}
