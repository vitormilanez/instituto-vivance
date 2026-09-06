import type { CareDemoState } from './care-demo-store';
import type {
  CareAiPreparationDismissalReason,
  CareAiPreparationReview,
  CareAiPreparationReviewItem,
  CareAiPreparationSourceRef,
  CareAuditAction,
  CareAuditActor,
  CareAuditEvent,
  CareCheckIn,
  CareCheckInReview,
  CareCheckInSleepQuality,
  CareConsultationClosure,
  CareConsultationClosureItem,
  CareConsultationClosureItemKind,
  CareConversationContext,
  CareConversationMessage,
  CareConversationSender,
  CareDemoScope,
  CareDiaryEntry,
  CareFollowUpCadence,
  CareFollowUpConfiguration,
  CareFollowUpContact,
  CareGuidedScore,
  CarePlanAction,
  CarePlanActionConfirmation,
  CarePlanDraftContent,
  CarePlanSourceMode,
  CarePlanStatus,
  CarePlanVersion,
  PreConsultationAnswers,
  PreConsultationReview,
  PreConsultationSubmission,
} from './care-demo-types';
import { EMPTY_PRECONSULTATION_DRAFT,getCareDemoScopeKey } from './care-scope';
import { DEFAULT_ENCOUNTER_ID,DEFAULT_PATIENT_ID,getDemoPatient } from './demo-routes';

export const STORAGE_KEY = 'instituto-vivans-demo-care-v2';
export const LEGACY_STORAGE_KEY = 'instituto-vivans-demo-care-v1';
export const DEFAULT_SCOPE: CareDemoScope = {
  patientId: DEFAULT_PATIENT_ID,
  encounterId: DEFAULT_ENCOUNTER_ID,
};

export function getInitialCarePlans(): CarePlanVersion[] {
  return [
    {
      id: 'plan-demo-001',
      patientId: DEFAULT_PATIENT_ID,
      encounterId: DEFAULT_ENCOUNTER_ID,
      version: 1,
      status: 'published',
      title: 'Plano de cuidado compartilhado',
      objective: 'Cuidar da regularidade do sono e manter os registros que ajudam a conversa de acompanhamento.',
      introduction: 'Este é um plano demonstrativo publicado depois de revisão médica. Ele organiza o combinado em passos simples para a paciente.',
      actions: [
        { id: 'plan-demo-001-action-1', title: 'Registrar como foi o sono ao acordar', cadence: 'Diariamente, quando for possível', active: true, sourceItemId: null },
        { id: 'plan-demo-001-action-2', title: 'Registrar uma foto ou relato do jantar', cadence: 'Em 3 dias desta semana', active: true, sourceItemId: null },
        { id: 'plan-demo-001-action-3', title: 'Guardar uma dúvida para a próxima conversa', cadence: 'Até a próxima consulta', active: true, sourceItemId: null },
      ],
      monitoring: 'Os registros ficam disponíveis para revisão na próxima conversa; eles não são interpretados automaticamente como decisão clínica.',
      supportNotice: 'Se algo mudar ou surgir uma dúvida, use o canal combinado com sua equipe. O protótipo não classifica urgência.',
      sourceDescription: 'Resumo demonstrativo da primeira consulta',
      sourceMode: 'manual',
      sourceReviewId: null,
      sourceClosureId: null,
      sourceClosureVersion: null,
      sourceItemIds: [],
      authoredBy: 'Dr. Guilherme Martins · médico responsável',
      createdAt: '12 ago · 11:14',
      createdAtIso: '2026-08-12T11:14:00-03:00',
      updatedAt: '12 ago · 11:14',
      updatedAtIso: '2026-08-12T11:14:00-03:00',
      approvedBy: 'Dr. Guilherme Martins · médico responsável',
      approvedAt: '12 ago · 11:14',
      approvedAtIso: '2026-08-12T11:14:00-03:00',
      publishedBy: 'Dr. Guilherme Martins · médico responsável',
      publishedAt: '12 ago · 11:16',
      publishedAtIso: '2026-08-12T11:16:00-03:00',
      supersededByVersion: null,
    },
  ];
}

export function getInitialCheckIns(): CareCheckIn[] {
  return [
    {
      id: 'check-in-demo-marina-008',
      patientId: DEFAULT_PATIENT_ID,
      encounterId: DEFAULT_ENCOUNTER_ID,
      version: 8,
      energy: 4,
      sleepQuality: 'regular',
      newSymptom: true,
      inputMode: 'voice',
      originalText: 'Estou me sentindo bem. Minha fome diminuiu e consegui seguir melhor os horários. Senti um enjoo leve depois do almoço em dois dias. Dormi mais ou menos seis horas e meia. Não percebi outra mudança.',
      aiSummary: [
        'Marina relata bem-estar geral estável e redução percebida da fome.',
        'Refere dois episódios de enjoo leve após o almoço e cerca de seis horas e meia de sono.',
        'O relato deve ser conferido antes de qualquer interpretação clínica.',
      ],
      aiAssistanceAllowed: true,
      planExperience: 'partial',
      audioRef: 'audio-checkin-demo-marina-008',
      audioDurationSeconds: 34,
      submittedAt: '04 set · 08:42',
      submittedAtIso: '2026-09-04T08:42:00-03:00',
    },
  ];
}

export function mergeInitialCheckIns(checkIns: CareCheckIn[]) {
  const byId = new Map(getInitialCheckIns().map((checkIn) => [checkIn.id, checkIn]));
  for (const checkIn of checkIns) byId.set(checkIn.id, checkIn);
  return [...byId.values()].toSorted((left, right) =>
    left.submittedAtIso.localeCompare(right.submittedAtIso));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isoTimestampFromOpaqueId(id: string) {
  const timestamp = Number(id.match(/(\d{13})$/)?.[1]);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : '2026-08-26T00:00:00-03:00';
}

export function normalizeAnswers(value: unknown): PreConsultationAnswers | null {
  if (!isRecord(value)) return null;

  return {
    consentGiven: typeof value.consentGiven === 'boolean' ? value.consentGiven : false,
    aiAssistanceAllowed:
      typeof value.aiAssistanceAllowed === 'boolean' ? value.aiAssistanceAllowed : false,
    objective: typeof value.objective === 'string' ? value.objective : '',
    changes: typeof value.changes === 'string' ? value.changes : '',
    questions: typeof value.questions === 'string' ? value.questions : '',
    additionalContext:
      typeof value.additionalContext === 'string' ? value.additionalContext : '',
  };
}

export function normalizeSubmission(
  value: unknown,
  fallbackScope?: CareDemoScope,
): PreConsultationSubmission | null {
  if (!isRecord(value)) return null;
  const answers = normalizeAnswers(value);
  const patientId = typeof value.patientId === 'string' ? value.patientId : fallbackScope?.patientId;
  const encounterId =
    typeof value.encounterId === 'string' ? value.encounterId : fallbackScope?.encounterId;

  if (
    !answers ||
    typeof value.id !== 'string' ||
    !patientId ||
    !encounterId ||
    typeof value.version !== 'number' ||
    typeof value.submittedAt !== 'string'
  ) {
    return null;
  }

  return {
    ...answers,
    id: value.id,
    patientId,
    encounterId,
    version: value.version,
    submittedAt: value.submittedAt,
    submittedAtIso:
      typeof value.submittedAtIso === 'string'
        ? value.submittedAtIso
        : isoTimestampFromOpaqueId(value.id),
    consentVersion: 'pre-consulta-texto-v1',
    structuredDraft: typeof value.structuredDraft === 'string' ? value.structuredDraft : null,
  };
}

export function normalizeReview(
  value: unknown,
  fallbackScope?: CareDemoScope,
): PreConsultationReview | null {
  if (!isRecord(value)) return null;
  const patientId = typeof value.patientId === 'string' ? value.patientId : fallbackScope?.patientId;
  const encounterId =
    typeof value.encounterId === 'string' ? value.encounterId : fallbackScope?.encounterId;
  const status =
    value.status === 'draft' || value.status === 'approved' || value.status === 'rejected'
      ? value.status
      : null;
  const sourceMode =
    value.sourceMode === 'assisted' || value.sourceMode === 'manual' ? value.sourceMode : null;

  if (
    typeof value.id !== 'string' ||
    !patientId ||
    !encounterId ||
    typeof value.submissionId !== 'string' ||
    typeof value.version !== 'number' ||
    !status ||
    typeof value.content !== 'string' ||
    !sourceMode ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  const createdAtIso =
    typeof value.createdAtIso === 'string'
      ? value.createdAtIso
      : isoTimestampFromOpaqueId(value.id);
  const updatedAtIso =
    typeof value.updatedAtIso === 'string' ? value.updatedAtIso : createdAtIso;

  return {
    id: value.id,
    patientId,
    encounterId,
    submissionId: value.submissionId,
    version: value.version,
    status,
    content: value.content,
    sourceMode,
    createdAt: value.createdAt,
    createdAtIso,
    updatedAt: value.updatedAt,
    updatedAtIso,
    reviewedAt: typeof value.reviewedAt === 'string' ? value.reviewedAt : null,
    reviewedAtIso:
      typeof value.reviewedAtIso === 'string'
        ? value.reviewedAtIso
        : typeof value.reviewedAt === 'string'
          ? updatedAtIso
          : null,
    reviewedBy: typeof value.reviewedBy === 'string' ? value.reviewedBy : null,
    rejectionReason: typeof value.rejectionReason === 'string' ? value.rejectionReason : null,
  };
}

export function normalizeCarePlanAction(value: unknown): CarePlanAction | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.cadence !== 'string' ||
    typeof value.active !== 'boolean'
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    cadence: value.cadence,
    active: value.active,
    sourceItemId: typeof value.sourceItemId === 'string' ? value.sourceItemId : null,
  };
}

export function isCareConsultationClosureItemKind(
  value: unknown,
): value is CareConsultationClosureItemKind {
  return value === 'patient-report' ||
    value === 'patient-priority' ||
    value === 'open-question' ||
    value === 'hypothesis';
}

export function normalizeConsultationClosureItem(value: unknown): CareConsultationClosureItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !isCareConsultationClosureItemKind(value.kind) ||
    typeof value.sourceExcerptId !== 'string' ||
    typeof value.sourceTime !== 'string' ||
    typeof value.sourceQuote !== 'string' ||
    (value.coverage !== 'direct' && value.coverage !== 'partial') ||
    typeof value.limitation !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    kind: value.kind,
    sourceExcerptId: value.sourceExcerptId,
    sourceTime: value.sourceTime,
    sourceQuote: value.sourceQuote,
    coverage: value.coverage,
    limitation: value.limitation,
  };
}

export function normalizeConsultationClosure(value: unknown): CareConsultationClosure | null {
  if (!isRecord(value)) return null;
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item) => {
        const normalized = normalizeConsultationClosureItem(item);
        return normalized ? [normalized] : [];
      })
    : [];

  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.version !== 'number' ||
    typeof value.sessionVersion !== 'number' ||
    typeof value.reviewVersion !== 'number' ||
    typeof value.content !== 'string' ||
    items.length === 0 ||
    value.consentVersion !== 'teleconsulta-transcricao-v1' ||
    value.serviceMode !== 'deterministic-mock' ||
    typeof value.approvedBy !== 'string' ||
    typeof value.approvedAt !== 'string' ||
    typeof value.approvedAtIso !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    version: value.version,
    sessionVersion: value.sessionVersion,
    reviewVersion: value.reviewVersion,
    content: value.content,
    items,
    consentVersion: 'teleconsulta-transcricao-v1',
    serviceMode: 'deterministic-mock',
    approvedBy: value.approvedBy,
    approvedAt: value.approvedAt,
    approvedAtIso: value.approvedAtIso,
  };
}

export function normalizeCarePlan(value: unknown): CarePlanVersion | null {
  if (!isRecord(value)) return null;
  const status: CarePlanStatus | null =
    value.status === 'draft' ||
    value.status === 'approved' ||
    value.status === 'published' ||
    value.status === 'superseded'
      ? value.status
      : null;
  const sourceMode: CarePlanSourceMode | null =
    value.sourceMode === 'manual' || value.sourceMode === 'assisted' ? value.sourceMode : null;
  const actions = Array.isArray(value.actions)
    ? value.actions.flatMap((action) => {
        const normalized = normalizeCarePlanAction(action);
        return normalized ? [normalized] : [];
      })
    : [];

  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.version !== 'number' ||
    !status ||
    typeof value.title !== 'string' ||
    typeof value.objective !== 'string' ||
    typeof value.introduction !== 'string' ||
    !sourceMode ||
    typeof value.monitoring !== 'string' ||
    typeof value.supportNotice !== 'string' ||
    typeof value.sourceDescription !== 'string' ||
    typeof value.authoredBy !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  const createdAtIso =
    typeof value.createdAtIso === 'string' ? value.createdAtIso : isoTimestampFromOpaqueId(value.id);
  const updatedAtIso = typeof value.updatedAtIso === 'string' ? value.updatedAtIso : createdAtIso;

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    version: value.version,
    status,
    title: value.title,
    objective: value.objective,
    introduction: value.introduction,
    actions,
    monitoring: value.monitoring,
    supportNotice: value.supportNotice,
    sourceDescription: value.sourceDescription,
    sourceMode,
    sourceReviewId: typeof value.sourceReviewId === 'string' ? value.sourceReviewId : null,
    sourceClosureId: typeof value.sourceClosureId === 'string' ? value.sourceClosureId : null,
    sourceClosureVersion: typeof value.sourceClosureVersion === 'number' ? value.sourceClosureVersion : null,
    sourceItemIds: Array.isArray(value.sourceItemIds)
      ? value.sourceItemIds.filter((itemId): itemId is string => typeof itemId === 'string')
      : [],
    authoredBy: value.authoredBy,
    createdAt: value.createdAt,
    createdAtIso,
    updatedAt: value.updatedAt,
    updatedAtIso,
    approvedBy: typeof value.approvedBy === 'string' ? value.approvedBy : null,
    approvedAt: typeof value.approvedAt === 'string' ? value.approvedAt : null,
    approvedAtIso:
      typeof value.approvedAtIso === 'string'
        ? value.approvedAtIso
        : typeof value.approvedAt === 'string'
          ? updatedAtIso
          : null,
    publishedBy: typeof value.publishedBy === 'string' ? value.publishedBy : null,
    publishedAt: typeof value.publishedAt === 'string' ? value.publishedAt : null,
    publishedAtIso:
      typeof value.publishedAtIso === 'string'
        ? value.publishedAtIso
        : typeof value.publishedAt === 'string'
          ? updatedAtIso
          : null,
    supersededByVersion:
      typeof value.supersededByVersion === 'number' ? value.supersededByVersion : null,
  };
}

export function isCareCheckInSleepQuality(value: unknown): value is CareCheckInSleepQuality {
  return value === 'poor' || value === 'regular' || value === 'good';
}

export function isCareCheckInInputMode(value: unknown): value is CareCheckIn['inputMode'] {
  return value === 'voice' || value === 'text';
}

export function isCareCheckInPlanExperience(value: unknown): value is CareCheckIn['planExperience'] {
  return value === 'easy'
    || value === 'partial'
    || value === 'difficult'
    || value === 'not-applicable';
}

export function normalizeCheckIn(value: unknown): CareCheckIn | null {
  if (!isRecord(value)) return null;
  const energy = typeof value.energy === 'number' && Number.isInteger(value.energy) && value.energy >= 1 && value.energy <= 5
    ? value.energy as CareCheckIn['energy']
    : null;

  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.version !== 'number' ||
    !energy ||
    !isCareCheckInSleepQuality(value.sleepQuality) ||
    typeof value.newSymptom !== 'boolean' ||
    typeof value.submittedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    version: value.version,
    energy,
    sleepQuality: value.sleepQuality,
    newSymptom: value.newSymptom,
    inputMode: isCareCheckInInputMode(value.inputMode) ? value.inputMode : 'text',
    originalText: typeof value.originalText === 'string' ? value.originalText : '',
    aiSummary: Array.isArray(value.aiSummary)
      ? value.aiSummary.filter((item): item is string => typeof item === 'string')
      : [],
    aiAssistanceAllowed: typeof value.aiAssistanceAllowed === 'boolean'
      ? value.aiAssistanceAllowed
      : false,
    planExperience: isCareCheckInPlanExperience(value.planExperience)
      ? value.planExperience
      : 'not-applicable',
    audioRef: typeof value.audioRef === 'string' ? value.audioRef : null,
    audioDurationSeconds: typeof value.audioDurationSeconds === 'number'
      && Number.isFinite(value.audioDurationSeconds)
      && value.audioDurationSeconds >= 0
      ? value.audioDurationSeconds
      : null,
    submittedAt: value.submittedAt,
    submittedAtIso: typeof value.submittedAtIso === 'string'
      ? value.submittedAtIso
      : isoTimestampFromOpaqueId(value.id),
  };
}

export function normalizeActionConfirmation(value: unknown): CarePlanActionConfirmation | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.planId !== 'string' ||
    typeof value.planVersion !== 'number' ||
    typeof value.actionId !== 'string' ||
    typeof value.completed !== 'boolean' ||
    typeof value.recordedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    planId: value.planId,
    planVersion: value.planVersion,
    actionId: value.actionId,
    completed: value.completed,
    recordedAt: value.recordedAt,
    recordedAtIso: typeof value.recordedAtIso === 'string'
      ? value.recordedAtIso
      : isoTimestampFromOpaqueId(value.id),
  };
}

export function normalizeCheckInReview(value: unknown): CareCheckInReview | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.checkInId !== 'string' ||
    typeof value.checkInVersion !== 'number' ||
    typeof value.reviewedBy !== 'string' ||
    typeof value.reviewedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    checkInId: value.checkInId,
    checkInVersion: value.checkInVersion,
    reviewedBy: value.reviewedBy,
    reviewedAt: value.reviewedAt,
    reviewedAtIso: typeof value.reviewedAtIso === 'string'
      ? value.reviewedAtIso
      : isoTimestampFromOpaqueId(value.id),
  };
}

export function isFollowUpCadence(value: unknown): value is CareFollowUpCadence {
  return value === 'daily' || value === 'every-three-days' || value === 'three-times-week' || value === 'weekly';
}

export function normalizeFollowUpConfiguration(value: unknown): CareFollowUpConfiguration | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.planId !== 'string' ||
    typeof value.planVersion !== 'number' ||
    typeof value.version !== 'number' ||
    !isFollowUpCadence(value.cadence) ||
    typeof value.configuredBy !== 'string' ||
    typeof value.configuredAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    planId: value.planId,
    planVersion: value.planVersion,
    version: value.version,
    cadence: value.cadence,
    configuredBy: value.configuredBy,
    configuredAt: value.configuredAt,
    configuredAtIso: typeof value.configuredAtIso === 'string'
      ? value.configuredAtIso
      : isoTimestampFromOpaqueId(value.id),
    retentionMode: 'session-only',
    contactMode: 'manual-only',
  };
}

export function normalizeFollowUpContact(value: unknown): CareFollowUpContact | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.configurationId !== 'string' ||
    typeof value.configurationVersion !== 'number' ||
    value.reason !== 'check-in-not-recorded' ||
    typeof value.recordedBy !== 'string' ||
    typeof value.recordedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    configurationId: value.configurationId,
    configurationVersion: value.configurationVersion,
    reason: value.reason,
    recordedBy: value.recordedBy,
    recordedAt: value.recordedAt,
    recordedAtIso: typeof value.recordedAtIso === 'string'
      ? value.recordedAtIso
      : isoTimestampFromOpaqueId(value.id),
  };
}

export function isGuidedScore(value: unknown): value is CareGuidedScore {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function normalizeDiaryEntry(value: unknown): CareDiaryEntry | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.version !== 'number' ||
    value.mealType !== 'dinner' ||
    !isGuidedScore(value.satiety) ||
    !isGuidedScore(value.digestiveComfort) ||
    !isGuidedScore(value.planEase) ||
    typeof value.analysisViewed !== 'boolean' ||
    typeof value.submittedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    version: value.version,
    mealType: value.mealType,
    satiety: value.satiety,
    digestiveComfort: value.digestiveComfort,
    planEase: value.planEase,
    analysisViewed: value.analysisViewed,
    attachmentRef: '/meals/jantar-omelete.jpg',
    sharedWithCareTeam: true,
    sharingConsentVersion: 'diario-contexto-v1',
    submittedAt: value.submittedAt,
    submittedAtIso: typeof value.submittedAtIso === 'string'
      ? value.submittedAtIso
      : isoTimestampFromOpaqueId(value.id),
  };
}

export function isConversationContext(value: unknown): value is CareConversationContext {
  return value === 'care-plan' || value === 'check-in' || value === 'diary' || value === 'general';
}

export function isConversationSender(value: unknown): value is CareConversationSender {
  return value === 'patient' || value === 'doctor';
}

export function getConversationContextLabel(context: CareConversationContext) {
  if (context === 'care-plan') return 'plano de cuidado';
  if (context === 'check-in') return 'check-in';
  if (context === 'diary') return 'diário';
  return 'outro assunto';
}

export function normalizeConversationMessage(value: unknown): CareConversationMessage | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.version !== 'number' ||
    !isConversationSender(value.sender) ||
    !isConversationContext(value.context) ||
    typeof value.body !== 'string' ||
    !value.body.trim() ||
    typeof value.sentAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    version: value.version,
    sender: value.sender,
    context: value.context,
    body: value.body.trim(),
    sentAt: value.sentAt,
    sentAtIso: typeof value.sentAtIso === 'string'
      ? value.sentAtIso
      : isoTimestampFromOpaqueId(value.id),
    retentionMode: 'session-only',
  };
}

export function isAiPreparationDismissalReason(
  value: unknown,
): value is CareAiPreparationDismissalReason {
  return value === 'duplicate' ||
    value === 'already-reviewed' ||
    value === 'insufficient-source' ||
    value === 'not-useful';
}

export function normalizeAiPreparationSourceRef(value: unknown): CareAiPreparationSourceRef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.version !== 'number' ||
    typeof value.label !== 'string' ||
    !value.label.trim()
  ) {
    return null;
  }

  return {
    id: value.id,
    version: value.version,
    label: value.label,
  };
}

export function normalizeAiPreparationReviewItem(value: unknown): CareAiPreparationReviewItem | null {
  if (!isRecord(value)) return null;
  const decision = value.decision === 'included' || value.decision === 'dismissed'
    ? value.decision
    : null;
  const sourceIds = Array.isArray(value.sourceIds)
    ? value.sourceIds.filter((sourceId): sourceId is string => typeof sourceId === 'string' && Boolean(sourceId.trim()))
    : [];
  const dismissalReason = value.dismissalReason === null || value.dismissalReason === undefined
    ? null
    : isAiPreparationDismissalReason(value.dismissalReason)
      ? value.dismissalReason
      : undefined;

  if (
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.label !== 'string' ||
    !value.label.trim() ||
    !decision ||
    sourceIds.length === 0 ||
    dismissalReason === undefined ||
    (decision === 'dismissed' && dismissalReason === null) ||
    (decision === 'included' && dismissalReason !== null)
  ) {
    return null;
  }

  return {
    id: value.id,
    label: value.label,
    decision,
    sourceIds,
    dismissalReason,
  };
}

export function normalizeAiPreparationReview(value: unknown): CareAiPreparationReview | null {
  if (!isRecord(value)) return null;
  const authorizationMode = value.authorizationMode === 'mock-scenario' || value.authorizationMode === 'patient-consent'
    ? value.authorizationMode
    : null;
  const sourceRefs = Array.isArray(value.sourceRefs)
    ? value.sourceRefs.flatMap((sourceRef) => {
        const normalized = normalizeAiPreparationSourceRef(sourceRef);
        return normalized ? [normalized] : [];
      })
    : [];
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item) => {
        const normalized = normalizeAiPreparationReviewItem(item);
        return normalized ? [normalized] : [];
      })
    : [];

  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    typeof value.version !== 'number' ||
    !authorizationMode ||
    value.templateVersion !== 'preparo-consulta-v1' ||
    value.serviceMode !== 'deterministic-mock' ||
    sourceRefs.length === 0 ||
    items.length === 0 ||
    typeof value.sourceFingerprint !== 'string' ||
    typeof value.reviewedBy !== 'string' ||
    typeof value.reviewedAt !== 'string' ||
    typeof value.reviewedAtIso !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    version: value.version,
    authorizationMode,
    templateVersion: 'preparo-consulta-v1',
    serviceMode: 'deterministic-mock',
    sourceRefs,
    items,
    sourceFingerprint: value.sourceFingerprint,
    reviewedBy: value.reviewedBy,
    reviewedAt: value.reviewedAt,
    reviewedAtIso: value.reviewedAtIso,
  };
}

export function isCareAuditAction(value: unknown): value is CareAuditAction {
  return [
    'check-in-submitted',
    'check-in-reviewed',
    'follow-up-configured',
    'follow-up-contact-recorded',
    'diary-entry-submitted',
    'conversation-message-sent',
    'pre-consultation-submitted',
    'pre-consultation-review-started',
    'pre-consultation-review-approved',
    'pre-consultation-review-rejected',
    'consultation-closure-approved',
    'care-plan-created',
    'care-plan-approved',
    'care-plan-published',
    'ai-preparation-reviewed',
  ].includes(value as CareAuditAction);
}

export function isCareAuditActor(value: unknown): value is CareAuditActor {
  return value === 'patient' || value === 'doctor' || value === 'system';
}

export function normalizeAuditEvent(value: unknown): CareAuditEvent | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.patientId !== 'string' ||
    typeof value.encounterId !== 'string' ||
    !isCareAuditAction(value.action) ||
    !isCareAuditActor(value.actor) ||
    typeof value.actorLabel !== 'string' ||
    typeof value.occurredAt !== 'string' ||
    typeof value.occurredAtIso !== 'string' ||
    typeof value.relatedId !== 'string' ||
    typeof value.relatedVersion !== 'number' ||
    typeof value.summary !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    patientId: value.patientId,
    encounterId: value.encounterId,
    action: value.action,
    actor: value.actor,
    actorLabel: value.actorLabel,
    occurredAt: value.occurredAt,
    occurredAtIso: value.occurredAtIso,
    relatedId: value.relatedId,
    relatedVersion: value.relatedVersion,
    summary: value.summary,
    consentVersion: value.consentVersion === 'pre-consulta-texto-v1' ||
      value.consentVersion === 'teleconsulta-transcricao-v1'
      ? value.consentVersion
      : null,
    aiAssistanceAllowed: typeof value.aiAssistanceAllowed === 'boolean'
      ? value.aiAssistanceAllowed
      : null,
  };
}

export function getPatientAuditLabel(patientId: string) {
  return `${getDemoPatient(patientId)?.name ?? 'Paciente demonstrativo'} · paciente`;
}

export function getAuditEventsFromHistory(
  submissions: PreConsultationSubmission[],
  reviews: PreConsultationReview[],
  carePlans: CarePlanVersion[],
  checkIns: CareCheckIn[],
  checkInReviews: CareCheckInReview[] = [],
  followUpConfigurations: CareFollowUpConfiguration[] = [],
  followUpContacts: CareFollowUpContact[] = [],
  diaryEntries: CareDiaryEntry[] = [],
  conversationMessages: CareConversationMessage[] = [],
  aiPreparationReviews: CareAiPreparationReview[] = [],
  consultationClosures: CareConsultationClosure[] = [],
): CareAuditEvent[] {
  const checkInEvents = checkIns.map<CareAuditEvent>((checkIn) => ({
    id: `audit-derived-${checkIn.id}-submitted`,
    patientId: checkIn.patientId,
    encounterId: checkIn.encounterId,
    action: 'check-in-submitted',
    actor: 'patient',
    actorLabel: getPatientAuditLabel(checkIn.patientId),
    occurredAt: checkIn.submittedAt,
    occurredAtIso: checkIn.submittedAtIso,
    relatedId: checkIn.id,
    relatedVersion: checkIn.version,
    summary: 'Check-in de acompanhamento registrado.',
    consentVersion: null,
    aiAssistanceAllowed: null,
  }));

  const checkInReviewEvents = checkInReviews.map<CareAuditEvent>((review) => ({
    id: `audit-derived-${review.id}-reviewed`,
    patientId: review.patientId,
    encounterId: review.encounterId,
    action: 'check-in-reviewed',
    actor: 'doctor',
    actorLabel: review.reviewedBy,
    occurredAt: review.reviewedAt,
    occurredAtIso: review.reviewedAtIso,
    relatedId: review.checkInId,
    relatedVersion: review.checkInVersion,
    summary: 'Leitura humana da fonte do check-in registrada.',
    consentVersion: null,
    aiAssistanceAllowed: null,
  }));

  const followUpConfigurationEvents = followUpConfigurations.map<CareAuditEvent>((configuration) => ({
    id: `audit-derived-${configuration.id}-configured`,
    patientId: configuration.patientId,
    encounterId: configuration.encounterId,
    action: 'follow-up-configured',
    actor: 'doctor',
    actorLabel: configuration.configuredBy,
    occurredAt: configuration.configuredAt,
    occurredAtIso: configuration.configuredAtIso,
    relatedId: configuration.id,
    relatedVersion: configuration.version,
    summary: 'Cadência demonstrativa de acompanhamento configurada.',
    consentVersion: null,
    aiAssistanceAllowed: null,
  }));

  const followUpContactEvents = followUpContacts.map<CareAuditEvent>((contact) => ({
    id: `audit-derived-${contact.id}-contact`,
    patientId: contact.patientId,
    encounterId: contact.encounterId,
    action: 'follow-up-contact-recorded',
    actor: 'doctor',
    actorLabel: contact.recordedBy,
    occurredAt: contact.recordedAt,
    occurredAtIso: contact.recordedAtIso,
    relatedId: contact.configurationId,
    relatedVersion: contact.configurationVersion,
    summary: 'Contato humano demonstrativo registrado; nenhuma notificação real foi enviada.',
    consentVersion: null,
    aiAssistanceAllowed: null,
  }));

  const diaryEvents = diaryEntries.map<CareAuditEvent>((entry) => ({
    id: `audit-derived-${entry.id}-submitted`,
    patientId: entry.patientId,
    encounterId: entry.encounterId,
    action: 'diary-entry-submitted',
    actor: 'patient',
    actorLabel: getPatientAuditLabel(entry.patientId),
    occurredAt: entry.submittedAt,
    occurredAtIso: entry.submittedAtIso,
    relatedId: entry.id,
    relatedVersion: entry.version,
    summary: 'Contexto guiado do diário compartilhado com a equipe.',
    consentVersion: null,
    aiAssistanceAllowed: null,
  }));

  const conversationEvents = conversationMessages.map<CareAuditEvent>((message) => ({
    id: `audit-derived-${message.id}-sent`,
    patientId: message.patientId,
    encounterId: message.encounterId,
    action: 'conversation-message-sent',
    actor: message.sender,
    actorLabel: message.sender === 'patient'
      ? getPatientAuditLabel(message.patientId)
      : 'Dr. Guilherme Martins · médico responsável',
    occurredAt: message.sentAt,
    occurredAtIso: message.sentAtIso,
    relatedId: message.id,
    relatedVersion: message.version,
    summary: `Mensagem contextualizada em “${getConversationContextLabel(message.context)}” registrada sem copiar seu conteúdo para a auditoria.`,
    consentVersion: null,
    aiAssistanceAllowed: null,
  }));

  const aiPreparationEvents = aiPreparationReviews.map<CareAuditEvent>((review) => {
    const includedCount = review.items.filter((item) => item.decision === 'included').length;
    const dismissedCount = review.items.length - includedCount;
    return {
      id: `audit-derived-${review.id}-reviewed`,
      patientId: review.patientId,
      encounterId: review.encounterId,
      action: 'ai-preparation-reviewed',
      actor: 'doctor',
      actorLabel: review.reviewedBy,
      occurredAt: review.reviewedAt,
      occurredAtIso: review.reviewedAtIso,
      relatedId: review.id,
      relatedVersion: review.version,
      summary: `Pauta assistida revisada: ${includedCount} ${includedCount === 1 ? 'item incluído' : 'itens incluídos'} e ${dismissedCount} ${dismissedCount === 1 ? 'descartado' : 'descartados'}.`,
      consentVersion: null,
      aiAssistanceAllowed: true,
    };
  });

  const consultationClosureEvents = consultationClosures.map<CareAuditEvent>((closure) => ({
    id: `audit-derived-${closure.id}-approved`,
    patientId: closure.patientId,
    encounterId: closure.encounterId,
    action: 'consultation-closure-approved',
    actor: 'doctor',
    actorLabel: closure.approvedBy,
    occurredAt: closure.approvedAt,
    occurredAtIso: closure.approvedAtIso,
    relatedId: closure.id,
    relatedVersion: closure.version,
    summary: `Fechamento da teleconsulta aprovado com ${closure.items.length} ${closure.items.length === 1 ? 'item rastreável' : 'itens rastreáveis'}.`,
    consentVersion: closure.consentVersion,
    aiAssistanceAllowed: true,
  }));

  const submissionEvents = submissions.map<CareAuditEvent>((submission) => ({
    id: `audit-derived-${submission.id}-submitted`,
    patientId: submission.patientId,
    encounterId: submission.encounterId,
    action: 'pre-consultation-submitted',
    actor: 'patient',
    actorLabel: getPatientAuditLabel(submission.patientId),
    occurredAt: submission.submittedAt,
    occurredAtIso: submission.submittedAtIso,
    relatedId: submission.id,
    relatedVersion: submission.version,
    summary: 'Pré-consulta enviada com ciência registrada.',
    consentVersion: submission.consentVersion,
    aiAssistanceAllowed: submission.aiAssistanceAllowed,
  }));

  const reviewEvents = reviews.flatMap<CareAuditEvent>((review) => {
    const events: CareAuditEvent[] = [{
      id: `audit-derived-${review.id}-started`,
      patientId: review.patientId,
      encounterId: review.encounterId,
      action: 'pre-consultation-review-started',
      actor: 'doctor',
      actorLabel: 'Dr. Guilherme Martins · médico responsável',
      occurredAt: review.createdAt,
      occurredAtIso: review.createdAtIso,
      relatedId: review.id,
      relatedVersion: review.version,
      summary: 'Uma nova versão do preparo médico foi aberta para revisão.',
      consentVersion: null,
      aiAssistanceAllowed: null,
    }];

    if (review.status === 'draft') return events;

    const occurredAt = review.reviewedAt ?? review.updatedAt;
    const occurredAtIso = review.reviewedAtIso ?? review.updatedAtIso;
    events.push({
      id: `audit-derived-${review.id}-${review.status}`,
      patientId: review.patientId,
      encounterId: review.encounterId,
      action: review.status === 'approved'
        ? 'pre-consultation-review-approved'
        : 'pre-consultation-review-rejected',
      actor: 'doctor',
      actorLabel: 'Dr. Guilherme Martins · médico responsável',
      occurredAt,
      occurredAtIso,
      relatedId: review.id,
      relatedVersion: review.version,
      summary: review.status === 'approved'
        ? 'Preparo revisado e aprovado para apoiar a consulta.'
        : 'Preparo rejeitado; a versão original foi preservada.',
      consentVersion: null,
      aiAssistanceAllowed: null,
    });
    return events;
  });

  const planEvents = carePlans.flatMap<CareAuditEvent>((plan) => {
    const events: CareAuditEvent[] = [{
      id: `audit-derived-${plan.id}-created`,
      patientId: plan.patientId,
      encounterId: plan.encounterId,
      action: 'care-plan-created',
      actor: 'doctor',
      actorLabel: plan.authoredBy,
      occurredAt: plan.createdAt,
      occurredAtIso: plan.createdAtIso,
      relatedId: plan.id,
      relatedVersion: plan.version,
      summary: `Rascunho da versão ${plan.version} do plano criado.`,
      consentVersion: null,
      aiAssistanceAllowed: null,
    }];

    if (plan.approvedAt && plan.approvedAtIso) {
      events.push({
        id: `audit-derived-${plan.id}-approved`,
        patientId: plan.patientId,
        encounterId: plan.encounterId,
        action: 'care-plan-approved',
        actor: 'doctor',
        actorLabel: plan.approvedBy ?? plan.authoredBy,
        occurredAt: plan.approvedAt,
        occurredAtIso: plan.approvedAtIso,
        relatedId: plan.id,
        relatedVersion: plan.version,
        summary: `Versão ${plan.version} do plano aprovada pelo médico.`,
        consentVersion: null,
        aiAssistanceAllowed: null,
      });
    }

    if (plan.publishedAt && plan.publishedAtIso) {
      events.push({
        id: `audit-derived-${plan.id}-published`,
        patientId: plan.patientId,
        encounterId: plan.encounterId,
        action: 'care-plan-published',
        actor: 'doctor',
        actorLabel: plan.publishedBy ?? plan.authoredBy,
        occurredAt: plan.publishedAt,
        occurredAtIso: plan.publishedAtIso,
        relatedId: plan.id,
        relatedVersion: plan.version,
        summary: `Versão ${plan.version} do plano publicada para a paciente.`,
        consentVersion: null,
        aiAssistanceAllowed: null,
      });
    }

    return events;
  });

  return [
    ...checkInEvents,
    ...checkInReviewEvents,
    ...followUpConfigurationEvents,
    ...followUpContactEvents,
    ...diaryEvents,
    ...conversationEvents,
    ...aiPreparationEvents,
    ...consultationClosureEvents,
    ...submissionEvents,
    ...reviewEvents,
    ...planEvents,
  ]
    .toSorted((left, right) => left.occurredAtIso.localeCompare(right.occurredAtIso));
}

export const initialCarePlans = getInitialCarePlans();
export const initialCheckIns = getInitialCheckIns();
export const initialAuditEvents = getAuditEventsFromHistory([], [], initialCarePlans, initialCheckIns);
export const emptyState: CareDemoState = {
  draftsByEncounter: {},
  submissions: [],
  reviews: [],
  consultationClosures: [],
  carePlans: initialCarePlans,
  checkIns: initialCheckIns,
  checkInReviews: [],
  followUpConfigurations: [],
  followUpContacts: [],
  diaryEntries: [],
  conversationMessages: [],
  actionConfirmations: [],
  aiPreparationReviews: [],
  auditEvents: initialAuditEvents,
};

export function normalizeCurrentState(value: unknown): CareDemoState | null {
  if (!isRecord(value) || !isRecord(value.draftsByEncounter)) return null;

  const draftsByEncounter = Object.fromEntries(
    Object.entries(value.draftsByEncounter).flatMap(([key, draft]) => {
      const normalized = normalizeAnswers(draft);
      return normalized ? [[key, normalized]] : [];
    }),
  );
  const submissions = Array.isArray(value.submissions)
    ? value.submissions.flatMap((submission) => {
        const normalized = normalizeSubmission(submission);
        return normalized ? [normalized] : [];
      })
    : [];
  const reviews = Array.isArray(value.reviews)
    ? value.reviews.flatMap((review) => {
        const normalized = normalizeReview(review);
        return normalized ? [normalized] : [];
      })
    : [];
  const consultationClosures = Array.isArray(value.consultationClosures)
    ? value.consultationClosures.flatMap((closure) => {
        const normalized = normalizeConsultationClosure(closure);
        return normalized ? [normalized] : [];
      })
    : [];
  const parsedCarePlans = Array.isArray(value.carePlans)
    ? value.carePlans.flatMap((plan) => {
        const normalized = normalizeCarePlan(plan);
        return normalized ? [normalized] : [];
      })
    : [];
  const carePlans = parsedCarePlans.length > 0 ? parsedCarePlans : getInitialCarePlans();
  const parsedCheckIns = Array.isArray(value.checkIns)
    ? value.checkIns.flatMap((checkIn) => {
        const normalized = normalizeCheckIn(checkIn);
        return normalized ? [normalized] : [];
      })
    : [];
  const checkIns = mergeInitialCheckIns(parsedCheckIns);
  const checkInReviews = Array.isArray(value.checkInReviews)
    ? value.checkInReviews.flatMap((review) => {
        const normalized = normalizeCheckInReview(review);
        return normalized ? [normalized] : [];
      })
    : [];
  const followUpConfigurations = Array.isArray(value.followUpConfigurations)
    ? value.followUpConfigurations.flatMap((configuration) => {
        const normalized = normalizeFollowUpConfiguration(configuration);
        return normalized ? [normalized] : [];
      })
    : [];
  const followUpContacts = Array.isArray(value.followUpContacts)
    ? value.followUpContacts.flatMap((contact) => {
        const normalized = normalizeFollowUpContact(contact);
        return normalized ? [normalized] : [];
      })
    : [];
  const diaryEntries = Array.isArray(value.diaryEntries)
    ? value.diaryEntries.flatMap((entry) => {
        const normalized = normalizeDiaryEntry(entry);
        return normalized ? [normalized] : [];
      })
    : [];
  const conversationMessages = Array.isArray(value.conversationMessages)
    ? value.conversationMessages.flatMap((message) => {
        const normalized = normalizeConversationMessage(message);
        return normalized ? [normalized] : [];
      })
    : [];
  const actionConfirmations = Array.isArray(value.actionConfirmations)
    ? value.actionConfirmations.flatMap((confirmation) => {
        const normalized = normalizeActionConfirmation(confirmation);
        return normalized ? [normalized] : [];
      })
    : [];
  const aiPreparationReviews = Array.isArray(value.aiPreparationReviews)
    ? value.aiPreparationReviews.flatMap((review) => {
        const normalized = normalizeAiPreparationReview(review);
        return normalized ? [normalized] : [];
      })
    : [];
  const parsedAuditEvents = Array.isArray(value.auditEvents)
    ? value.auditEvents.flatMap((event) => {
        const normalized = normalizeAuditEvent(event);
        return normalized ? [normalized] : [];
      })
    : [];

  const restoredAuditEvents = parsedAuditEvents.length > 0
    ? [
        ...new Map(
          [...initialAuditEvents, ...parsedAuditEvents].map((event) => [event.id, event]),
        ).values(),
      ].toSorted((left, right) => left.occurredAtIso.localeCompare(right.occurredAtIso))
    : getAuditEventsFromHistory(
        submissions,
        reviews,
        carePlans,
        checkIns,
        checkInReviews,
        followUpConfigurations,
        followUpContacts,
        diaryEntries,
        conversationMessages,
        aiPreparationReviews,
        consultationClosures,
      );

  return {
    draftsByEncounter,
    submissions,
    reviews,
    consultationClosures,
    carePlans,
    checkIns,
    checkInReviews,
    followUpConfigurations,
    followUpContacts,
    diaryEntries,
    conversationMessages,
    actionConfirmations,
    aiPreparationReviews,
    auditEvents: restoredAuditEvents,
  };
}

export function migrateLegacyState(value: unknown): CareDemoState | null {
  if (!isRecord(value)) return null;
  const draft = normalizeAnswers(value.draft) ?? { ...EMPTY_PRECONSULTATION_DRAFT };
  const submissions = Array.isArray(value.submissions)
    ? value.submissions.flatMap((submission) => {
        const normalized = normalizeSubmission(submission, DEFAULT_SCOPE);
        return normalized ? [normalized] : [];
      })
    : [];
  const reviews = Array.isArray(value.reviews)
    ? value.reviews.flatMap((review) => {
        const normalized = normalizeReview(review, DEFAULT_SCOPE);
        return normalized ? [normalized] : [];
      })
    : [];

  const carePlans = getInitialCarePlans();
  const checkIns = getInitialCheckIns();

  return {
    draftsByEncounter: {
      [getCareDemoScopeKey(DEFAULT_PATIENT_ID, DEFAULT_ENCOUNTER_ID)]: draft,
    },
    submissions,
    reviews,
    consultationClosures: [],
    carePlans,
    checkIns,
    checkInReviews: [],
    followUpConfigurations: [],
    followUpContacts: [],
    diaryEntries: [],
    conversationMessages: [],
    actionConfirmations: [],
    aiPreparationReviews: [],
    auditEvents: getAuditEventsFromHistory(submissions, reviews, carePlans, checkIns),
  };
}

export function buildStructuredDraft(answers: PreConsultationAnswers) {
  const sections = [
    `Objetivo declarado: ${answers.objective.trim()}`,
    `Mudanças relatadas: ${answers.changes.trim()}`,
    answers.questions.trim() ? `Dúvidas para a consulta: ${answers.questions.trim()}` : '',
    answers.additionalContext.trim() ? `Contexto adicional: ${answers.additionalContext.trim()}` : '',
  ].filter(Boolean);

  return sections.join('\n\n');
}

export function formatSubmissionTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getAuditActorLabel(actor: CareAuditActor, patientId: string) {
  if (actor === 'patient') return getPatientAuditLabel(patientId);
  if (actor === 'doctor') return 'Dr. Guilherme Martins · médico responsável';
  return 'Sistema demonstrativo';
}

export type AuditEventInput = Omit<
  CareAuditEvent,
  'id' | 'actorLabel' | 'consentVersion' | 'aiAssistanceAllowed'
> & {
  consentVersion?: CareAuditEvent['consentVersion'];
  aiAssistanceAllowed?: CareAuditEvent['aiAssistanceAllowed'];
};

export function createAuditEvent({
  action,
  actor,
  patientId,
  encounterId,
  occurredAt,
  occurredAtIso,
  relatedId,
  relatedVersion,
  summary,
  consentVersion = null,
  aiAssistanceAllowed = null,
}: AuditEventInput): CareAuditEvent {
  return {
    id: `audit-${action}-${Date.now()}-${relatedId}`,
    patientId,
    encounterId,
    action,
    actor,
    actorLabel: getAuditActorLabel(actor, patientId),
    occurredAt,
    occurredAtIso,
    relatedId,
    relatedVersion,
    summary,
    consentVersion,
    aiAssistanceAllowed,
  };
}

export function getDefaultCarePlanContent(): CarePlanDraftContent {
  return {
    title: 'Plano de cuidado compartilhado',
    objective: 'Registrar o que ajuda a acompanhar a rotina e levar as dúvidas para a próxima conversa.',
    introduction: 'Rascunho demonstrativo para organização do cuidado. Edite o conteúdo antes de aprovar e publicar.',
    actions: [
      { id: 'plan-action-template-1', title: 'Registrar como foi o sono ao acordar', cadence: 'Diariamente, quando for possível', active: true, sourceItemId: null },
      { id: 'plan-action-template-2', title: 'Registrar uma foto ou relato do jantar', cadence: 'Em 3 dias desta semana', active: true, sourceItemId: null },
      { id: 'plan-action-template-3', title: 'Guardar uma dúvida para a próxima conversa', cadence: 'Até a próxima consulta', active: true, sourceItemId: null },
    ],
    monitoring: 'Os registros ficam disponíveis para revisão na próxima conversa; o protótipo não conclui conduta a partir deles.',
    supportNotice: 'Se algo mudar ou surgir uma dúvida, use o canal combinado com sua equipe. O protótipo não classifica urgência.',
    sourceDescription: 'Notas da consulta demonstrativa',
    sourceMode: 'manual',
    sourceReviewId: null,
    sourceClosureId: null,
    sourceClosureVersion: null,
    sourceItemIds: [],
  };
}

export function cloneCarePlanActions(actions: CarePlanAction[]) {
  const prefix = `plan-action-${Date.now()}`;
  return actions.map((action, index) => ({
    ...action,
    id: `${prefix}-${index + 1}`,
  }));
}
