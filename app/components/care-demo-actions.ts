
import type { CareDemoState,CareDemoStoreValue } from './care-demo-store';
import type {
  CareAiPreparationReview,
  CareAuditEvent,
  CareCheckIn,
  CareCheckInReview,
  CareConsultationClosure,
  CareConversationMessage,
  CareDiaryEntry,
  CareFollowUpConfiguration,
  CareFollowUpContact,
  CarePlanActionConfirmation,
  CarePlanDraftContent,
  CarePlanVersion,
  PreConsultationReview,
  PreConsultationSubmission
} from './care-demo-types';
import { EMPTY_PRECONSULTATION_DRAFT,getCareDemoScopeKey } from './care-scope';

import { buildStructuredDraft,cloneCarePlanActions,createAuditEvent,formatSubmissionTime,getConversationContextLabel,getDefaultCarePlanContent,isCareCheckInSleepQuality,isConversationContext,isConversationSender,isFollowUpCadence,isGuidedScore,normalizeAiPreparationReviewItem,normalizeAiPreparationSourceRef } from './care-demo-model';

export function createCareActions(state: CareDemoState, setState: (update: (current: CareDemoState) => CareDemoState) => void, hydrated = true): CareDemoStoreValue {
const submissionsFor = (patientId: string, encounterId: string) =>
      state.submissions.filter(
        (submission) =>
          submission.patientId === patientId && submission.encounterId === encounterId,
      );

    const latestSubmissionFor = (patientId: string, encounterId: string) =>
      submissionsFor(patientId, encounterId).at(-1) ?? null;

    const checkInsFor = (patientId: string, encounterId: string) =>
      (state.checkIns ?? []).filter(
        (checkIn) => checkIn.patientId === patientId && checkIn.encounterId === encounterId,
      );

    const checkInReviewsFor = (patientId: string, encounterId: string) =>
      (state.checkInReviews ?? []).filter(
        (review) => review.patientId === patientId && review.encounterId === encounterId,
      );

    const followUpConfigurationsFor = (patientId: string, encounterId: string) =>
      (state.followUpConfigurations ?? []).filter(
        (configuration) =>
          configuration.patientId === patientId && configuration.encounterId === encounterId,
      );

    const followUpContactsFor = (patientId: string, encounterId: string) =>
      (state.followUpContacts ?? []).filter(
        (contact) => contact.patientId === patientId && contact.encounterId === encounterId,
      );

    const diaryEntriesFor = (patientId: string, encounterId: string) =>
      (state.diaryEntries ?? []).filter(
        (entry) => entry.patientId === patientId && entry.encounterId === encounterId,
      );

    const conversationMessagesFor = (patientId: string, encounterId: string) =>
      (state.conversationMessages ?? []).filter(
        (message) => message.patientId === patientId && message.encounterId === encounterId,
      );

    const aiPreparationReviewsFor = (patientId: string, encounterId: string) =>
      (state.aiPreparationReviews ?? []).filter(
        (review) => review.patientId === patientId && review.encounterId === encounterId,
      );

    const consultationClosuresFor = (patientId: string, encounterId: string) =>
      (state.consultationClosures ?? [])
        .filter(
          (closure) => closure.patientId === patientId && closure.encounterId === encounterId,
        )
        .toSorted((left, right) => left.version - right.version);

    const reviewHistoryFor = (patientId: string, encounterId: string) => {
      const latestSubmission = latestSubmissionFor(patientId, encounterId);
      return latestSubmission
        ? state.reviews.filter(
            (review) =>
              review.patientId === patientId &&
              review.encounterId === encounterId &&
              review.submissionId === latestSubmission.id,
          )
        : [];
    };

    const carePlansFor = (patientId: string, encounterId: string) =>
      state.carePlans
        .filter((plan) => plan.patientId === patientId && plan.encounterId === encounterId)
        .toSorted((left, right) => left.version - right.version);

    const createCarePlan = (
      patientId: string,
      encounterId: string,
      previous: CarePlanVersion | null,
      template?: Partial<CarePlanDraftContent>,
    ) => {
      const now = new Date();
      const base = previous ?? getDefaultCarePlanContent();
      const sourceChanged = template?.sourceClosureId !== undefined &&
        template.sourceClosureId !== base.sourceClosureId;
      const actions = cloneCarePlanActions(template?.actions ?? base.actions).map((action) => ({
        ...action,
        sourceItemId: sourceChanged && !template?.actions ? null : action.sourceItemId,
      }));
      const content: CarePlanDraftContent = {
        title: template?.title ?? base.title,
        objective: template?.objective ?? base.objective,
        introduction: template?.introduction ?? base.introduction,
        actions,
        monitoring: template?.monitoring ?? base.monitoring,
        supportNotice: template?.supportNotice ?? base.supportNotice,
        sourceDescription: template?.sourceDescription ?? base.sourceDescription,
        sourceMode: template?.sourceMode ?? base.sourceMode,
        sourceReviewId: template?.sourceReviewId ?? base.sourceReviewId,
        sourceClosureId: template?.sourceClosureId ?? base.sourceClosureId,
        sourceClosureVersion: template?.sourceClosureVersion ?? base.sourceClosureVersion,
        sourceItemIds: [...(template?.sourceItemIds ?? base.sourceItemIds)],
      };

      return {
        id: `plan-care-${Date.now()}`,
        patientId,
        encounterId,
        version: (previous?.version ?? 0) + 1,
        status: 'draft' as const,
        ...content,
        authoredBy: 'Dr. Guilherme Martins · médico responsável',
        createdAt: formatSubmissionTime(now),
        createdAtIso: now.toISOString(),
        updatedAt: formatSubmissionTime(now),
        updatedAtIso: now.toISOString(),
        approvedBy: null,
        approvedAt: null,
        approvedAtIso: null,
        publishedBy: null,
        publishedAt: null,
        publishedAtIso: null,
        supersededByVersion: null,
      } satisfies CarePlanVersion;
    };

    const replaceCarePlan = (updated: CarePlanVersion, auditEvent?: CareAuditEvent) => {
      setState((current) => ({
        ...current,
        carePlans: current.carePlans.map((plan) => plan.id === updated.id ? updated : plan),
        auditEvents: auditEvent ? [...current.auditEvents, auditEvent] : current.auditEvents,
      }));
      return updated;
    };

    const requireCarePlan = (patientId: string, encounterId: string, planId: string) => {
      const plan = state.carePlans.find(
        (candidate) =>
          candidate.id === planId &&
          candidate.patientId === patientId &&
          candidate.encounterId === encounterId,
      );
      if (!plan) {
        throw new Error('Este plano não pertence ao contexto atual.');
      }
      return plan;
    };

    const requireSubmission = (patientId: string, encounterId: string) => {
      const latestSubmission = latestSubmissionFor(patientId, encounterId);
      if (!latestSubmission) {
        throw new Error('Envie uma pré-consulta antes de iniciar a revisão médica.');
      }
      return latestSubmission;
    };

    const requireDraftReview = (patientId: string, encounterId: string) => {
      const activeReview = reviewHistoryFor(patientId, encounterId).at(-1) ?? null;
      if (!activeReview || activeReview.status !== 'draft') {
        throw new Error('Inicie uma nova versão de revisão antes de editar este preparo.');
      }
      return activeReview;
    };

    const replaceReview = (updated: PreConsultationReview, auditEvent?: CareAuditEvent) => {
      setState((current) => ({
        ...current,
        reviews: current.reviews.map((review) => review.id === updated.id ? updated : review),
        auditEvents: auditEvent ? [...current.auditEvents, auditEvent] : current.auditEvents,
      }));
      return updated;
    };

    return {
      hydrated,
      draftsByEncounter: state.draftsByEncounter,
      submissions: state.submissions,
      reviews: state.reviews,
      consultationClosures: state.consultationClosures ?? [],
      carePlans: state.carePlans,
      checkIns: state.checkIns ?? [],
      checkInReviews: state.checkInReviews ?? [],
      followUpConfigurations: state.followUpConfigurations ?? [],
      followUpContacts: state.followUpContacts ?? [],
      diaryEntries: state.diaryEntries ?? [],
      conversationMessages: state.conversationMessages ?? [],
      actionConfirmations: state.actionConfirmations ?? [],
      aiPreparationReviews: state.aiPreparationReviews ?? [],
      auditEvents: state.auditEvents,
      savePreConsultationDraft: (patientId, encounterId, patch) => {
        const scopeKey = getCareDemoScopeKey(patientId, encounterId);
        setState((current) => ({
          ...current,
          draftsByEncounter: {
            ...current.draftsByEncounter,
            [scopeKey]: {
              ...(current.draftsByEncounter[scopeKey] ?? EMPTY_PRECONSULTATION_DRAFT),
              ...patch,
            },
          },
        }));
      },
      submitPreConsultation: (patientId, encounterId) => {
        const scopeKey = getCareDemoScopeKey(patientId, encounterId);
        const draft = state.draftsByEncounter[scopeKey] ?? EMPTY_PRECONSULTATION_DRAFT;
        const scopedSubmissions = submissionsFor(patientId, encounterId);
        const now = new Date();
        const created: PreConsultationSubmission = {
          ...draft,
          id: `pre-consulta-${Date.now()}`,
          patientId,
          encounterId,
          version: scopedSubmissions.length + 1,
          submittedAt: formatSubmissionTime(now),
          submittedAtIso: now.toISOString(),
          consentVersion: 'pre-consulta-texto-v1',
          structuredDraft: draft.aiAssistanceAllowed ? buildStructuredDraft(draft) : null,
        };
        const auditEvent = createAuditEvent({
          action: 'pre-consultation-submitted',
          actor: 'patient',
          patientId,
          encounterId,
          occurredAt: created.submittedAt,
          occurredAtIso: created.submittedAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: 'Pré-consulta enviada com ciência registrada.',
          consentVersion: created.consentVersion,
          aiAssistanceAllowed: created.aiAssistanceAllowed,
        });

        setState((current) => ({
          ...current,
          submissions: [...current.submissions, created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));

        return created;
      },
      submitCheckIn: (patientId, encounterId, input) => {
        if (
          !Number.isInteger(input.energy) ||
          input.energy < 1 ||
          input.energy > 5 ||
          !isCareCheckInSleepQuality(input.sleepQuality)
        ) {
          throw new Error('Revise as respostas do check-in antes de registrar.');
        }

        const now = new Date();
        const created: CareCheckIn = {
          id: `check-in-${Date.now()}`,
          patientId,
          encounterId,
          version: Math.max(
            0,
            ...checkInsFor(patientId, encounterId).map((checkIn) => checkIn.version),
          ) + 1,
          energy: input.energy,
          sleepQuality: input.sleepQuality,
          newSymptom: input.newSymptom,
          inputMode: input.inputMode === 'voice' ? 'voice' : 'text',
          originalText: input.originalText?.trim() ?? '',
          aiSummary: input.aiAssistanceAllowed === false
            ? []
            : (input.aiSummary ?? []).map((item) => item.trim()).filter(Boolean),
          aiAssistanceAllowed: input.aiAssistanceAllowed !== false,
          planExperience: input.planExperience === 'easy'
            || input.planExperience === 'partial'
            || input.planExperience === 'difficult'
            ? input.planExperience
            : 'not-applicable',
          audioRef: input.inputMode === 'voice' && typeof input.audioRef === 'string'
            ? input.audioRef
            : null,
          audioDurationSeconds: input.inputMode === 'voice'
            && typeof input.audioDurationSeconds === 'number'
            && Number.isFinite(input.audioDurationSeconds)
            ? Math.max(0, input.audioDurationSeconds)
            : null,
          submittedAt: formatSubmissionTime(now),
          submittedAtIso: now.toISOString(),
        };
        const auditEvent = createAuditEvent({
          action: 'check-in-submitted',
          actor: 'patient',
          patientId,
          encounterId,
          occurredAt: created.submittedAt,
          occurredAtIso: created.submittedAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: `Check-in de acompanhamento registrado por ${created.inputMode === 'voice' ? 'voz simulada' : 'texto'}.`,
        });

        setState((current) => ({
          ...current,
          checkIns: [...(current.checkIns ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      reviewCheckIn: (patientId, encounterId, checkInId) => {
        const checkIn = checkInsFor(patientId, encounterId).find(
          (candidate) => candidate.id === checkInId,
        );
        if (!checkIn) {
          throw new Error('Este check-in não pertence ao contexto atual.');
        }
        const existing = checkInReviewsFor(patientId, encounterId).find(
          (review) => review.checkInId === checkIn.id,
        );
        if (existing) return existing;

        const now = new Date();
        const created: CareCheckInReview = {
          id: `leitura-check-in-${Date.now()}`,
          patientId,
          encounterId,
          checkInId: checkIn.id,
          checkInVersion: checkIn.version,
          reviewedBy: 'Dr. Guilherme Martins · médico responsável',
          reviewedAt: formatSubmissionTime(now),
          reviewedAtIso: now.toISOString(),
        };
        const auditEvent = createAuditEvent({
          action: 'check-in-reviewed',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.reviewedAt,
          occurredAtIso: created.reviewedAtIso,
          relatedId: checkIn.id,
          relatedVersion: checkIn.version,
          summary: 'Leitura humana da fonte do check-in registrada.',
        });

        setState((current) => ({
          ...current,
          checkInReviews: [...(current.checkInReviews ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      configureFollowUp: (patientId, encounterId, planId, cadence) => {
        if (!isFollowUpCadence(cadence)) {
          throw new Error('Escolha uma cadência válida para o acompanhamento.');
        }
        const plan = requireCarePlan(patientId, encounterId, planId);
        const latestPublishedPlan = [...carePlansFor(patientId, encounterId)].reverse().find(
          (candidate) => candidate.status === 'published',
        ) ?? null;
        if (plan.status !== 'published' || latestPublishedPlan?.id !== plan.id) {
          throw new Error('A cadência só pode ser vinculada à versão publicada mais recente do plano.');
        }
        const configurations = followUpConfigurationsFor(patientId, encounterId);
        const latest = configurations.at(-1) ?? null;
        if (latest?.planId === plan.id && latest.planVersion === plan.version && latest.cadence === cadence) {
          return latest;
        }

        const now = new Date();
        const created: CareFollowUpConfiguration = {
          id: `cadencia-acompanhamento-${Date.now()}`,
          patientId,
          encounterId,
          planId: plan.id,
          planVersion: plan.version,
          version: configurations.length + 1,
          cadence,
          configuredBy: 'Dr. Guilherme Martins · médico responsável',
          configuredAt: formatSubmissionTime(now),
          configuredAtIso: now.toISOString(),
          retentionMode: 'session-only',
          contactMode: 'manual-only',
        };
        const auditEvent = createAuditEvent({
          action: 'follow-up-configured',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.configuredAt,
          occurredAtIso: created.configuredAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: 'Cadência demonstrativa de acompanhamento configurada.',
        });

        setState((current) => ({
          ...current,
          followUpConfigurations: [...(current.followUpConfigurations ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      recordFollowUpContact: (patientId, encounterId, configurationId) => {
        const configuration = followUpConfigurationsFor(patientId, encounterId).find(
          (candidate) => candidate.id === configurationId,
        );
        if (!configuration) {
          throw new Error('Esta configuração de acompanhamento não pertence ao contexto atual.');
        }
        const checkInAfterConfiguration = checkInsFor(patientId, encounterId).some(
          (checkIn) => checkIn.submittedAtIso >= configuration.configuredAtIso,
        );
        if (checkInAfterConfiguration) {
          throw new Error('Já existe um check-in depois desta configuração; o contato não é necessário.');
        }
        const existing = followUpContactsFor(patientId, encounterId).find(
          (contact) => contact.configurationId === configuration.id,
        );
        if (existing) return existing;

        const now = new Date();
        const created: CareFollowUpContact = {
          id: `contato-acompanhamento-${Date.now()}`,
          patientId,
          encounterId,
          configurationId: configuration.id,
          configurationVersion: configuration.version,
          reason: 'check-in-not-recorded',
          recordedBy: 'Dr. Guilherme Martins · médico responsável',
          recordedAt: formatSubmissionTime(now),
          recordedAtIso: now.toISOString(),
        };
        const auditEvent = createAuditEvent({
          action: 'follow-up-contact-recorded',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.recordedAt,
          occurredAtIso: created.recordedAtIso,
          relatedId: configuration.id,
          relatedVersion: configuration.version,
          summary: 'Contato humano demonstrativo registrado; nenhuma notificação real foi enviada.',
        });

        setState((current) => ({
          ...current,
          followUpContacts: [...(current.followUpContacts ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      submitDiaryEntry: (patientId, encounterId, input) => {
        if (
          !isGuidedScore(input.satiety) ||
          !isGuidedScore(input.digestiveComfort) ||
          !isGuidedScore(input.planEase) ||
          input.mealType !== 'dinner'
        ) {
          throw new Error('Responda as três perguntas guiadas antes de compartilhar o diário.');
        }
        const entries = diaryEntriesFor(patientId, encounterId);
        const now = new Date();
        const created: CareDiaryEntry = {
          id: `diario-refeicao-${Date.now()}`,
          patientId,
          encounterId,
          version: entries.length + 1,
          mealType: input.mealType,
          satiety: input.satiety,
          digestiveComfort: input.digestiveComfort,
          planEase: input.planEase,
          analysisViewed: input.analysisViewed,
          attachmentRef: '/meals/jantar-omelete.jpg',
          sharedWithCareTeam: true,
          sharingConsentVersion: 'diario-contexto-v1',
          submittedAt: formatSubmissionTime(now),
          submittedAtIso: now.toISOString(),
        };
        const auditEvent = createAuditEvent({
          action: 'diary-entry-submitted',
          actor: 'patient',
          patientId,
          encounterId,
          occurredAt: created.submittedAt,
          occurredAtIso: created.submittedAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: 'Contexto guiado do diário compartilhado com a equipe.',
        });

        setState((current) => ({
          ...current,
          diaryEntries: [...(current.diaryEntries ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      sendConversationMessage: (patientId, encounterId, sender, input) => {
        const body = input.body.trim();
        if (!isConversationSender(sender) || !isConversationContext(input.context)) {
          throw new Error('Escolha um contexto válido para esta conversa.');
        }
        if (body.length < 2 || body.length > 600) {
          throw new Error('Escreva uma mensagem entre 2 e 600 caracteres.');
        }

        const messages = conversationMessagesFor(patientId, encounterId);
        const now = new Date();
        const created: CareConversationMessage = {
          id: `mensagem-cuidado-${Date.now()}`,
          patientId,
          encounterId,
          version: messages.length + 1,
          sender,
          context: input.context,
          body,
          sentAt: formatSubmissionTime(now),
          sentAtIso: now.toISOString(),
          retentionMode: 'session-only',
        };
        const auditEvent = createAuditEvent({
          action: 'conversation-message-sent',
          actor: sender,
          patientId,
          encounterId,
          occurredAt: created.sentAt,
          occurredAtIso: created.sentAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: `Mensagem contextualizada em “${getConversationContextLabel(created.context)}” registrada sem copiar seu conteúdo para a auditoria.`,
        });

        setState((current) => ({
          ...current,
          conversationMessages: [...(current.conversationMessages ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      startPreConsultationReview: (patientId, encounterId) => {
        const submission = requireSubmission(patientId, encounterId);
        const reviewHistory = reviewHistoryFor(patientId, encounterId);
        const activeReview = reviewHistory.at(-1) ?? null;
        if (activeReview?.status === 'draft') return activeReview;

        const now = new Date();
        const timestamp = formatSubmissionTime(now);
        const timestampIso = now.toISOString();
        const created: PreConsultationReview = {
          id: `revisao-pre-consulta-${Date.now()}`,
          patientId,
          encounterId,
          submissionId: submission.id,
          version: reviewHistory.length + 1,
          status: 'draft',
          content: activeReview?.content ?? submission.structuredDraft ?? buildStructuredDraft(submission),
          sourceMode: submission.structuredDraft ? 'assisted' : 'manual',
          createdAt: timestamp,
          createdAtIso: timestampIso,
          updatedAt: timestamp,
          updatedAtIso: timestampIso,
          reviewedAt: null,
          reviewedAtIso: null,
          reviewedBy: null,
          rejectionReason: null,
        };
        const auditEvent = createAuditEvent({
          action: 'pre-consultation-review-started',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.createdAt,
          occurredAtIso: created.createdAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: 'Uma nova versão do preparo médico foi aberta para revisão.',
        });

        setState((current) => ({
          ...current,
          reviews: [...current.reviews, created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      savePreConsultationReview: (patientId, encounterId, content) => {
        const review = requireDraftReview(patientId, encounterId);
        const now = new Date();
        return replaceReview({
          ...review,
          content,
          updatedAt: formatSubmissionTime(now),
          updatedAtIso: now.toISOString(),
        });
      },
      approvePreConsultationReview: (patientId, encounterId, content) => {
        const review = requireDraftReview(patientId, encounterId);
        if (content.trim().length < 20) {
          throw new Error('O preparo precisa ter ao menos 20 caracteres antes da aprovação.');
        }
        const now = new Date();
        const timestamp = formatSubmissionTime(now);
        const timestampIso = now.toISOString();
        const updated: PreConsultationReview = {
          ...review,
          content: content.trim(),
          status: 'approved',
          updatedAt: timestamp,
          updatedAtIso: timestampIso,
          reviewedAt: timestamp,
          reviewedAtIso: timestampIso,
          reviewedBy: 'Dr. Guilherme Martins',
          rejectionReason: null,
        };
        return replaceReview(updated, createAuditEvent({
          action: 'pre-consultation-review-approved',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: timestamp,
          occurredAtIso: timestampIso,
          relatedId: updated.id,
          relatedVersion: updated.version,
          summary: 'Preparo revisado e aprovado para apoiar a consulta.',
        }));
      },
      rejectPreConsultationReview: (patientId, encounterId, content, reason) => {
        const review = requireDraftReview(patientId, encounterId);
        if (reason.trim().length < 10) {
          throw new Error('Explique em ao menos 10 caracteres por que o rascunho foi rejeitado.');
        }
        const now = new Date();
        const timestamp = formatSubmissionTime(now);
        const timestampIso = now.toISOString();
        const updated: PreConsultationReview = {
          ...review,
          content,
          status: 'rejected',
          updatedAt: timestamp,
          updatedAtIso: timestampIso,
          reviewedAt: timestamp,
          reviewedAtIso: timestampIso,
          reviewedBy: 'Dr. Guilherme Martins',
          rejectionReason: reason.trim(),
        };
        return replaceReview(updated, createAuditEvent({
          action: 'pre-consultation-review-rejected',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: timestamp,
          occurredAtIso: timestampIso,
          relatedId: updated.id,
          relatedVersion: updated.version,
          summary: 'Preparo rejeitado; a versão e o relato original foram preservados.',
        }));
      },
      recordConsultationClosure: (patientId, encounterId, input) => {
        if (input.content.trim().length < 20) {
          throw new Error('O fechamento precisa estar completo antes de ser registrado.');
        }
        if (input.sessionVersion < 1 || input.reviewVersion < 1 || input.items.length === 0) {
          throw new Error('Aprovação sem sessão, versão ou item rastreável não pode seguir ao plano.');
        }

        const closures = consultationClosuresFor(patientId, encounterId);
        const existing = closures.find(
          (closure) =>
            closure.sessionVersion === input.sessionVersion &&
            closure.reviewVersion === input.reviewVersion,
        );
        if (existing) return existing;

        const now = new Date();
        const timestamp = formatSubmissionTime(now);
        const timestampIso = now.toISOString();
        const closure: CareConsultationClosure = {
          id: `consultation-closure-${Date.now()}`,
          patientId,
          encounterId,
          version: (closures.at(-1)?.version ?? 0) + 1,
          sessionVersion: input.sessionVersion,
          reviewVersion: input.reviewVersion,
          content: input.content.trim(),
          items: input.items.map((item) => ({ ...item })),
          consentVersion: 'teleconsulta-transcricao-v1',
          serviceMode: 'deterministic-mock',
          approvedBy: 'Dr. Guilherme Martins · médico responsável',
          approvedAt: timestamp,
          approvedAtIso: timestampIso,
        };
        const auditEvent = createAuditEvent({
          action: 'consultation-closure-approved',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: timestamp,
          occurredAtIso: timestampIso,
          relatedId: closure.id,
          relatedVersion: closure.version,
          summary: `Fechamento da teleconsulta aprovado com ${closure.items.length} ${closure.items.length === 1 ? 'item rastreável' : 'itens rastreáveis'}.`,
          consentVersion: closure.consentVersion,
          aiAssistanceAllowed: true,
        });
        setState((current) => ({
          ...current,
          consultationClosures: [...current.consultationClosures, closure],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return closure;
      },
      startCarePlan: (patientId, encounterId, template) => {
        const plans = carePlansFor(patientId, encounterId);
        const activePlan = [...plans].reverse().find(
          (plan) => plan.status === 'draft' || plan.status === 'approved',
        );
        if (activePlan) return activePlan;

        const created = createCarePlan(patientId, encounterId, plans.at(-1) ?? null, template);
        const auditEvent = createAuditEvent({
          action: 'care-plan-created',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.createdAt,
          occurredAtIso: created.createdAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: `Rascunho da versão ${created.version} do plano criado.`,
        });
        setState((current) => ({
          ...current,
          carePlans: [...current.carePlans, created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      createCarePlanRevision: (patientId, encounterId, template) => {
        const plans = carePlansFor(patientId, encounterId);
        const activeDraft = [...plans].reverse().find((plan) => plan.status === 'draft');
        if (activeDraft) return activeDraft;

        const created = createCarePlan(patientId, encounterId, plans.at(-1) ?? null, template);
        const auditEvent = createAuditEvent({
          action: 'care-plan-created',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.createdAt,
          occurredAtIso: created.createdAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: `Rascunho da versão ${created.version} do plano criado.`,
        });
        setState((current) => ({
          ...current,
          carePlans: [...current.carePlans, created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
      saveCarePlan: (patientId, encounterId, planId, patch) => {
        const plan = requireCarePlan(patientId, encounterId, planId);
        if (plan.status !== 'draft') {
          throw new Error('Somente uma versão em rascunho pode ser editada.');
        }
        const now = new Date();
        return replaceCarePlan({
          ...plan,
          ...patch,
          actions: patch.actions ?? plan.actions,
          updatedAt: formatSubmissionTime(now),
          updatedAtIso: now.toISOString(),
        });
      },
      approveCarePlan: (patientId, encounterId, planId) => {
        const plan = requireCarePlan(patientId, encounterId, planId);
        if (plan.status !== 'draft') {
          throw new Error('Apenas um rascunho pode seguir para aprovação médica.');
        }
        if (plan.title.trim().length < 5 || plan.objective.trim().length < 20) {
          throw new Error('Explique o objetivo do plano antes de aprovar esta versão.');
        }
        const activeActions = plan.actions.filter((action) => action.active);
        if (activeActions.length === 0) {
          throw new Error('Mantenha ao menos uma ação clara antes de aprovar esta versão.');
        }
        if (activeActions.some((action) => action.title.trim().length < 3)) {
          throw new Error('Complete a redação de cada ação ativa antes de aprovar.');
        }
        if (activeActions.some((action) => action.cadence.trim().length < 3)) {
          throw new Error('Defina a frequência ou o momento de cada ação ativa.');
        }
        if (plan.sourceClosureId) {
          const sourceClosure = consultationClosuresFor(patientId, encounterId).find(
            (closure) => closure.id === plan.sourceClosureId,
          );
          if (!sourceClosure || sourceClosure.version !== plan.sourceClosureVersion) {
            throw new Error('A fonte aprovada deste plano não está disponível no contexto atual.');
          }
          const eligibleIds = new Set(
            sourceClosure.items
              .filter((item) => item.kind === 'patient-report' || item.kind === 'patient-priority')
              .map((item) => item.id),
          );
          if (!plan.sourceItemIds.some((itemId) => eligibleIds.has(itemId))) {
            throw new Error('Vincule ao menos um relato ou prioridade aprovada antes de aprovar o plano.');
          }
          if (plan.sourceItemIds.some((itemId) => !eligibleIds.has(itemId))) {
            throw new Error('Lacunas e hipóteses não podem ser convertidas em conteúdo do plano.');
          }
          if (plan.actions.some(
            (action) => action.sourceItemId &&
              (!eligibleIds.has(action.sourceItemId) || !plan.sourceItemIds.includes(action.sourceItemId)),
          )) {
            throw new Error('Uma ação perdeu o vínculo com sua fonte aprovada. Revise o rascunho.');
          }
        }
        const now = new Date();
        const timestamp = formatSubmissionTime(now);
        const timestampIso = now.toISOString();
        const updated: CarePlanVersion = {
          ...plan,
          status: 'approved',
          updatedAt: timestamp,
          updatedAtIso: timestampIso,
          approvedBy: 'Dr. Guilherme Martins · médico responsável',
          approvedAt: timestamp,
          approvedAtIso: timestampIso,
        };
        return replaceCarePlan(updated, createAuditEvent({
          action: 'care-plan-approved',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: timestamp,
          occurredAtIso: timestampIso,
          relatedId: updated.id,
          relatedVersion: updated.version,
          summary: `Versão ${updated.version} do plano aprovada pelo médico.`,
        }));
      },
      publishCarePlan: (patientId, encounterId, planId) => {
        const plan = requireCarePlan(patientId, encounterId, planId);
        if (plan.status !== 'approved') {
          throw new Error('A publicação exige uma versão aprovada pelo médico.');
        }
        const latest = carePlansFor(patientId, encounterId).at(-1) ?? null;
        if (latest && latest.id !== plan.id) {
          throw new Error('Publique ou resolva primeiro a versão mais recente deste plano.');
        }
        const now = new Date();
        const timestamp = formatSubmissionTime(now);
        const timestampIso = now.toISOString();
        const published: CarePlanVersion = {
          ...plan,
          status: 'published',
          updatedAt: timestamp,
          updatedAtIso: timestampIso,
          publishedBy: 'Dr. Guilherme Martins · médico responsável',
          publishedAt: timestamp,
          publishedAtIso: timestampIso,
        };
        const auditEvent = createAuditEvent({
          action: 'care-plan-published',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: timestamp,
          occurredAtIso: timestampIso,
          relatedId: published.id,
          relatedVersion: published.version,
          summary: `Versão ${published.version} do plano publicada para a paciente.`,
        });
        setState((current) => ({
          ...current,
          carePlans: current.carePlans.map((candidate) => {
            if (candidate.id === published.id) return published;
            if (
              candidate.patientId === patientId &&
              candidate.encounterId === encounterId &&
              candidate.status === 'published'
            ) {
              return {
                ...candidate,
                status: 'superseded' as const,
                updatedAt: timestamp,
                updatedAtIso: timestampIso,
                supersededByVersion: published.version,
              };
            }
            return candidate;
          }),
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return published;
      },
      confirmCarePlanAction: (patientId, encounterId, planId, actionId, completed) => {
        const plan = requireCarePlan(patientId, encounterId, planId);
        if (plan.status !== 'published') {
          throw new Error('A paciente só pode confirmar ações de uma versão publicada do plano.');
        }
        const action = plan.actions.find((candidate) => candidate.id === actionId && candidate.active);
        if (!action) {
          throw new Error('Esta ação não está disponível na versão publicada do plano.');
        }

        const now = new Date();
        const created: CarePlanActionConfirmation = {
          id: `confirmacao-acao-${Date.now()}-${actionId}`,
          patientId,
          encounterId,
          planId: plan.id,
          planVersion: plan.version,
          actionId: action.id,
          completed,
          recordedAt: formatSubmissionTime(now),
          recordedAtIso: now.toISOString(),
        };
        setState((current) => ({
          ...current,
          actionConfirmations: [...(current.actionConfirmations ?? []), created],
        }));
        return created;
      },
      reviewAiPreparation: (patientId, encounterId, input) => {
        const sourceRefs = input.sourceRefs.flatMap((sourceRef) => {
          const normalized = normalizeAiPreparationSourceRef(sourceRef);
          return normalized ? [normalized] : [];
        });
        const items = input.items.flatMap((item) => {
          const normalized = normalizeAiPreparationReviewItem(item);
          return normalized ? [normalized] : [];
        });

        if (
          input.templateVersion !== 'preparo-consulta-v1' ||
          input.serviceMode !== 'deterministic-mock' ||
          (input.authorizationMode !== 'mock-scenario' && input.authorizationMode !== 'patient-consent') ||
          sourceRefs.length !== input.sourceRefs.length ||
          items.length !== input.items.length ||
          sourceRefs.length === 0 ||
          items.length === 0
        ) {
          throw new Error('Revise as fontes e as decisões antes de salvar a pauta assistida.');
        }

        const availableSourceIds = new Set(sourceRefs.map((sourceRef) => sourceRef.id));
        if (items.some((item) => item.sourceIds.some((sourceId) => !availableSourceIds.has(sourceId)))) {
          throw new Error('Um item da pauta perdeu a referência de origem. Refaça a preparação.');
        }

        const now = new Date();
        const scopedReviews = aiPreparationReviewsFor(patientId, encounterId);
        const created: CareAiPreparationReview = {
          id: `preparo-ia-${Date.now()}`,
          patientId,
          encounterId,
          version: scopedReviews.length + 1,
          authorizationMode: input.authorizationMode,
          templateVersion: input.templateVersion,
          serviceMode: input.serviceMode,
          sourceRefs,
          items,
          sourceFingerprint: sourceRefs
            .map((sourceRef) => `${sourceRef.id}@${sourceRef.version}`)
            .toSorted()
            .join('|'),
          reviewedBy: 'Dr. Guilherme Martins · médico responsável',
          reviewedAt: formatSubmissionTime(now),
          reviewedAtIso: now.toISOString(),
        };
        const includedCount = items.filter((item) => item.decision === 'included').length;
        const dismissedCount = items.length - includedCount;
        const auditEvent = createAuditEvent({
          action: 'ai-preparation-reviewed',
          actor: 'doctor',
          patientId,
          encounterId,
          occurredAt: created.reviewedAt,
          occurredAtIso: created.reviewedAtIso,
          relatedId: created.id,
          relatedVersion: created.version,
          summary: `Pauta assistida revisada: ${includedCount} ${includedCount === 1 ? 'item incluído' : 'itens incluídos'} e ${dismissedCount} ${dismissedCount === 1 ? 'descartado' : 'descartados'}.`,
          aiAssistanceAllowed: true,
        });

        setState((current) => ({
          ...current,
          aiPreparationReviews: [...(current.aiPreparationReviews ?? []), created],
          auditEvents: [...current.auditEvents, auditEvent],
        }));
        return created;
      },
    };
}
