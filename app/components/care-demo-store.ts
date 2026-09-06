'use client';

import { createContext,useContext } from 'react';
import { cycleKey,type CoreCareCommand } from '../lib/care-cycle-contract';
import type {
  CareAiPreparationReview,
  CareAiPreparationReviewInput,
  CareAuditEvent,
  CareCheckIn,
  CareCheckInInput,
  CareCheckInReview,
  CareConsultationClosure,
  CareConsultationClosureInput,
  CareConversationMessage,
  CareConversationMessageInput,
  CareConversationSender,
  CareDiaryEntry,
  CareDiaryEntryInput,
  CareFollowUpCadence,
  CareFollowUpConfiguration,
  CareFollowUpContact,
  CarePlanActionConfirmation,
  CarePlanDraftContent,
  CarePlanVersion,
  PreConsultationAnswers,
  PreConsultationReview,
  PreConsultationSubmission,
} from './care-demo-types';
import { EMPTY_PRECONSULTATION_DRAFT,getCareDemoScopeKey } from './care-scope';
import { selectCarePlans, selectConfirmedActionIds } from './care-workflow';
import { DEFAULT_ENCOUNTER_ID,DEFAULT_PATIENT_ID } from './demo-routes';
import { useSharedCare } from './shared-care-context';
export { EMPTY_PRECONSULTATION_DRAFT,getCareDemoScopeKey } from './care-scope';

export interface CareDemoState {
  draftsByEncounter: Record<string, PreConsultationAnswers>;
  submissions: PreConsultationSubmission[];
  reviews: PreConsultationReview[];
  consultationClosures: CareConsultationClosure[];
  carePlans: CarePlanVersion[];
  checkIns: CareCheckIn[];
  checkInReviews: CareCheckInReview[];
  followUpConfigurations: CareFollowUpConfiguration[];
  followUpContacts: CareFollowUpContact[];
  diaryEntries: CareDiaryEntry[];
  conversationMessages: CareConversationMessage[];
  actionConfirmations: CarePlanActionConfirmation[];
  aiPreparationReviews: CareAiPreparationReview[];
  auditEvents: CareAuditEvent[];
}

export interface CareDemoStoreValue extends CareDemoState {
  hydrated: boolean;
  savePreConsultationDraft: (
    patientId: string,
    encounterId: string,
    patch: Partial<PreConsultationAnswers>,
  ) => void;
  submitPreConsultation: (patientId: string, encounterId: string) => PreConsultationSubmission;
  submitCheckIn: (
    patientId: string,
    encounterId: string,
    input: CareCheckInInput,
  ) => CareCheckIn;
  reviewCheckIn: (
    patientId: string,
    encounterId: string,
    checkInId: string,
  ) => CareCheckInReview;
  configureFollowUp: (
    patientId: string,
    encounterId: string,
    planId: string,
    cadence: CareFollowUpCadence,
  ) => CareFollowUpConfiguration;
  recordFollowUpContact: (
    patientId: string,
    encounterId: string,
    configurationId: string,
  ) => CareFollowUpContact;
  submitDiaryEntry: (
    patientId: string,
    encounterId: string,
    input: CareDiaryEntryInput,
  ) => CareDiaryEntry;
  sendConversationMessage: (
    patientId: string,
    encounterId: string,
    sender: CareConversationSender,
    input: CareConversationMessageInput,
  ) => CareConversationMessage;
  startPreConsultationReview: (patientId: string, encounterId: string) => PreConsultationReview;
  savePreConsultationReview: (
    patientId: string,
    encounterId: string,
    content: string,
  ) => PreConsultationReview;
  approvePreConsultationReview: (
    patientId: string,
    encounterId: string,
    content: string,
  ) => PreConsultationReview;
  rejectPreConsultationReview: (
    patientId: string,
    encounterId: string,
    content: string,
    reason: string,
  ) => PreConsultationReview;
  recordConsultationClosure: (
    patientId: string,
    encounterId: string,
    input: CareConsultationClosureInput,
  ) => CareConsultationClosure;
  startCarePlan: (
    patientId: string,
    encounterId: string,
    template?: Partial<CarePlanDraftContent>,
  ) => CarePlanVersion;
  createCarePlanRevision: (
    patientId: string,
    encounterId: string,
    template?: Partial<CarePlanDraftContent>,
  ) => CarePlanVersion;
  saveCarePlan: (
    patientId: string,
    encounterId: string,
    planId: string,
    patch: Partial<CarePlanDraftContent>,
  ) => CarePlanVersion;
  approveCarePlan: (
    patientId: string,
    encounterId: string,
    planId: string,
  ) => CarePlanVersion;
  publishCarePlan: (
    patientId: string,
    encounterId: string,
    planId: string,
  ) => CarePlanVersion;
  confirmCarePlanAction: (
    patientId: string,
    encounterId: string,
    planId: string,
    actionId: string,
    completed: boolean,
  ) => CarePlanActionConfirmation;
  reviewAiPreparation: (
    patientId: string,
    encounterId: string,
    input: CareAiPreparationReviewInput,
  ) => CareAiPreparationReview;
}

export interface CareDemoLocalContextValue {
  hydrated: boolean;
  patientId: string;
  encounterId: string;
  draft: PreConsultationAnswers;
  latestSubmission: PreConsultationSubmission | null;
  submissions: PreConsultationSubmission[];
  reviews: PreConsultationReview[];
  activeReview: PreConsultationReview | null;
  reviewHistory: PreConsultationReview[];
  consultationClosures: CareConsultationClosure[];
  latestConsultationClosure: CareConsultationClosure | null;
  carePlans: CarePlanVersion[];
  checkIns: CareCheckIn[];
  latestCheckIn: CareCheckIn | null;
  checkInReviews: CareCheckInReview[];
  latestCheckInReview: CareCheckInReview | null;
  followUpConfigurations: CareFollowUpConfiguration[];
  activeFollowUpConfiguration: CareFollowUpConfiguration | null;
  followUpContacts: CareFollowUpContact[];
  latestFollowUpContact: CareFollowUpContact | null;
  diaryEntries: CareDiaryEntry[];
  conversationMessages: CareConversationMessage[];
  actionConfirmations: CarePlanActionConfirmation[];
  aiPreparationReviews: CareAiPreparationReview[];
  latestAiPreparationReview: CareAiPreparationReview | null;
  confirmedActionIds: string[];
  auditEvents: CareAuditEvent[];
  latestCarePlan: CarePlanVersion | null;
  activeCarePlan: CarePlanVersion | null;
  latestPublishedCarePlan: CarePlanVersion | null;
  savePreConsultationDraft: (patch: Partial<PreConsultationAnswers>) => void;
  submitPreConsultation: () => PreConsultationSubmission;
  submitCheckIn: (input: CareCheckInInput) => CareCheckIn;
  reviewCheckIn: (checkInId: string) => CareCheckInReview;
  configureFollowUp: (
    planId: string,
    cadence: CareFollowUpCadence,
  ) => CareFollowUpConfiguration;
  recordFollowUpContact: (configurationId: string) => CareFollowUpContact;
  submitDiaryEntry: (input: CareDiaryEntryInput) => CareDiaryEntry;
  sendConversationMessage: (
    sender: CareConversationSender,
    input: CareConversationMessageInput,
  ) => CareConversationMessage;
  startPreConsultationReview: () => PreConsultationReview;
  savePreConsultationReview: (content: string) => PreConsultationReview;
  approvePreConsultationReview: (content: string) => PreConsultationReview;
  rejectPreConsultationReview: (content: string, reason: string) => PreConsultationReview;
  recordConsultationClosure: (
    input: CareConsultationClosureInput,
  ) => CareConsultationClosure;
  startCarePlan: (template?: Partial<CarePlanDraftContent>) => CarePlanVersion;
  createCarePlanRevision: (template?: Partial<CarePlanDraftContent>) => CarePlanVersion;
  saveCarePlan: (planId: string, patch: Partial<CarePlanDraftContent>, expectedUpdatedAtIso: string) => CarePlanVersion;
  approveCarePlan: (planId: string, expectedUpdatedAtIso: string) => CarePlanVersion;
  publishCarePlan: (planId: string, expectedUpdatedAtIso: string) => CarePlanVersion;
  confirmCarePlanAction: (
    planId: string,
    actionId: string,
    completed: boolean,
  ) => CarePlanActionConfirmation;
  reviewAiPreparation: (
    input: CareAiPreparationReviewInput,
  ) => CareAiPreparationReview;
}

export type CareDemoContextValue = Omit<CareDemoLocalContextValue, CoreCareCommand> & {
  [K in CoreCareCommand]: (...args: Parameters<CareDemoLocalContextValue[K]>) => Promise<ReturnType<CareDemoLocalContextValue[K]>>;
};

export const CareDemoContext = createContext<CareDemoStoreValue | null>(null);

export function useCareDemo(
  patientId = DEFAULT_PATIENT_ID,
  encounterId = DEFAULT_ENCOUNTER_ID,
): CareDemoContextValue {
  const baseContext = useContext(CareDemoContext);
  const shared = useSharedCare();
  if (!baseContext) {
    throw new Error('useCareDemo deve ser usado dentro de CareDemoProvider.');
  }
  const cycle = shared.cycles[cycleKey(patientId, encounterId)];
  const context = { ...baseContext, ...(cycle?.care ?? {}), hydrated: baseContext.hydrated && shared.loaded };

  const scopeKey = getCareDemoScopeKey(patientId, encounterId);
  const submissions = context.submissions.filter(
    (submission) => submission.patientId === patientId && submission.encounterId === encounterId,
  );
  const latestSubmission = submissions.at(-1) ?? null;
  const reviews = context.reviews.filter(
    (review) => review.patientId === patientId && review.encounterId === encounterId,
  );
  const reviewHistory = latestSubmission
    ? reviews.filter(
        (review) =>
          review.submissionId === latestSubmission.id,
      )
    : [];
  const { carePlans, latestCarePlan, activeCarePlan, latestPublishedCarePlan } = selectCarePlans(context.carePlans, patientId, encounterId);
  const consultationClosures = (context.consultationClosures ?? [])
    .filter((closure) => closure.patientId === patientId && closure.encounterId === encounterId)
    .toSorted((left, right) => left.version - right.version);
  const latestConsultationClosure = consultationClosures.at(-1) ?? null;
  const checkIns = (context.checkIns ?? [])
    .filter((checkIn) => checkIn.patientId === patientId && checkIn.encounterId === encounterId)
    .toSorted((left, right) => left.submittedAtIso.localeCompare(right.submittedAtIso));
  const latestCheckIn = checkIns.at(-1) ?? null;
  const checkInReviews = (context.checkInReviews ?? [])
    .filter((review) => review.patientId === patientId && review.encounterId === encounterId)
    .toSorted((left, right) => left.reviewedAtIso.localeCompare(right.reviewedAtIso));
  const latestCheckInReview = latestCheckIn
    ? [...checkInReviews].reverse().find((review) => review.checkInId === latestCheckIn.id) ?? null
    : null;
  const followUpConfigurations = (context.followUpConfigurations ?? [])
    .filter((configuration) => configuration.patientId === patientId && configuration.encounterId === encounterId)
    .toSorted((left, right) => left.configuredAtIso.localeCompare(right.configuredAtIso));
  const activeFollowUpConfiguration = followUpConfigurations.at(-1) ?? null;
  const followUpContacts = (context.followUpContacts ?? [])
    .filter((contact) => contact.patientId === patientId && contact.encounterId === encounterId)
    .toSorted((left, right) => left.recordedAtIso.localeCompare(right.recordedAtIso));
  const latestFollowUpContact = followUpContacts.at(-1) ?? null;
  const diaryEntries = (context.diaryEntries ?? [])
    .filter((entry) => entry.patientId === patientId && entry.encounterId === encounterId)
    .toSorted((left, right) => left.submittedAtIso.localeCompare(right.submittedAtIso));
  const conversationMessages = (context.conversationMessages ?? [])
    .filter((message) => message.patientId === patientId && message.encounterId === encounterId)
    .toSorted((left, right) => left.sentAtIso.localeCompare(right.sentAtIso));
  const actionConfirmations = (context.actionConfirmations ?? [])
    .filter((confirmation) => confirmation.patientId === patientId && confirmation.encounterId === encounterId)
    .toSorted((left, right) => left.recordedAtIso.localeCompare(right.recordedAtIso));
  const aiPreparationReviews = (context.aiPreparationReviews ?? [])
    .filter((review) => review.patientId === patientId && review.encounterId === encounterId)
    .toSorted((left, right) => left.reviewedAtIso.localeCompare(right.reviewedAtIso));
  const latestAiPreparationReview = aiPreparationReviews.at(-1) ?? null;
  const confirmedActionIds = selectConfirmedActionIds(actionConfirmations, latestPublishedCarePlan?.id);
  const auditEvents = context.auditEvents
    .filter((event) => event.patientId === patientId && event.encounterId === encounterId)
    .toSorted((left, right) => left.occurredAtIso.localeCompare(right.occurredAtIso));

  return {
    hydrated: context.hydrated,
    patientId,
    encounterId,
    draft: context.draftsByEncounter[scopeKey] ?? EMPTY_PRECONSULTATION_DRAFT,
    latestSubmission,
    submissions,
    reviews,
    activeReview: reviewHistory.at(-1) ?? null,
    reviewHistory,
    consultationClosures,
    latestConsultationClosure,
    carePlans,
    latestCarePlan,
    activeCarePlan,
    latestPublishedCarePlan,
    checkIns,
    latestCheckIn,
    checkInReviews,
    latestCheckInReview,
    followUpConfigurations,
    activeFollowUpConfiguration,
    followUpContacts,
    latestFollowUpContact,
    diaryEntries,
    conversationMessages,
    actionConfirmations,
    aiPreparationReviews,
    latestAiPreparationReview,
    confirmedActionIds,
    auditEvents,
    savePreConsultationDraft: (patch) =>
      context.savePreConsultationDraft(patientId, encounterId, patch),
    submitPreConsultation: () => context.submitPreConsultation(patientId, encounterId),
    submitCheckIn: (input) => shared.mutate(patientId, encounterId, 'submitCheckIn', [input]),
    reviewCheckIn: (checkInId) => shared.mutate(patientId, encounterId, 'reviewCheckIn', [checkInId]),
    configureFollowUp: (planId, cadence) =>
      shared.mutate(patientId, encounterId, 'configureFollowUp', [planId, cadence]),
    recordFollowUpContact: (configurationId) =>
      shared.mutate(patientId, encounterId, 'recordFollowUpContact', [configurationId]),
    submitDiaryEntry: (input) => context.submitDiaryEntry(patientId, encounterId, input),
    sendConversationMessage: (sender, input) =>
      context.sendConversationMessage(patientId, encounterId, sender, input),
    startPreConsultationReview: () =>
      context.startPreConsultationReview(patientId, encounterId),
    savePreConsultationReview: (content) =>
      context.savePreConsultationReview(patientId, encounterId, content),
    approvePreConsultationReview: (content) =>
      context.approvePreConsultationReview(patientId, encounterId, content),
    rejectPreConsultationReview: (content, reason) =>
      context.rejectPreConsultationReview(patientId, encounterId, content, reason),
    recordConsultationClosure: (input) =>
      shared.mutate(patientId, encounterId, 'recordConsultationClosure', [input]),
    startCarePlan: (template) => shared.mutate(patientId, encounterId, 'startCarePlan', [template ?? null]),
    createCarePlanRevision: (template) =>
      shared.mutate(patientId, encounterId, 'createCarePlanRevision', [template ?? null]),
    saveCarePlan: (planId, patch, baseline) => shared.mutate(patientId, encounterId, 'saveCarePlan', [planId, patch, baseline]),
    approveCarePlan: (planId, baseline) => shared.mutate(patientId, encounterId, 'approveCarePlan', [planId, baseline]),
    publishCarePlan: (planId, baseline) => shared.mutate(patientId, encounterId, 'publishCarePlan', [planId, baseline]),
    confirmCarePlanAction: (planId, actionId, completed) =>
      shared.mutate(patientId, encounterId, 'confirmCarePlanAction', [planId, actionId, completed]),
    reviewAiPreparation: (input) =>
      context.reviewAiPreparation(patientId, encounterId, input),
  };
}
