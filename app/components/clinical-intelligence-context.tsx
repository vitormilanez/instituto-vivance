'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SavedSynthesis } from '../lib/clinical-synthesis-contract';
import type { PolicyVersion } from '../lib/clinical-policy-contract';
import { getDefaultEncounterId } from './demo-routes';
import { useSharedCare } from './shared-care-context';
import { useClinicalPolicy } from './use-clinical-policy';
import {
  type ClinicalIntelligenceContextValue, type ClinicalIntelligenceState, type ClinicalKnowledgeSource,
  type PatientAiContext, initialState, createGovernanceSnapshot, formatDateTime,
} from './clinical-intelligence-model';
export { getClinicalModuleBlockers, fingerprintClinicalContent } from './clinical-intelligence-model';
export type {
  AddKnowledgeSourceInput, AiAuthorizationStatus, AiCapability, AiCapabilityId, CareRelationship,
  ClinicalAiConfigurationDraft, ClinicalAiConfigurationVersion, ClinicalAiModuleId,
  ClinicalAiModulePolicy, ClinicalDataConnection, ClinicalDataConnectionId,
  ClinicalExamDocument, ClinicalExamField, ClinicalGovernanceSnapshot,
  ClinicalGovernedArtifact, ClinicalIntelligenceAuditEvent, ClinicalKnowledgeSource,
  EvidenceQuality, ExamFieldStatus, ExamReviewStatus, ExtractionConfidence,
  KnowledgeSourceKind, KnowledgeSourceStatus, PatientAiContext, PatientAiContextStatus,
} from './clinical-intelligence-model';

const ClinicalIntelligenceContext = createContext<ClinicalIntelligenceContextValue | null>(null);
const unavailable: PolicyVersion = { ...initialState.activeConfiguration, version: 0, publishedAt: 'Ainda não carregada',
  knowledgeSources: [], fingerprint: '', note: '', approval: null, comparison: null,
  modules: initialState.activeConfiguration.modules.map((module) => ({ ...module, enabled: false })) };

export function ClinicalIntelligenceProvider({ children }: { children: ReactNode }) {
  const shared = useSharedCare();
  const policy = useClinicalPolicy(shared.role);
  const [saved, setSaved] = useState<{ actorId: string; artifacts: SavedSynthesis[] }>({ actorId: '', artifacts: [] });
  const actorId = policy.view?.actorId ?? policy.patientView?.actorId ?? '';
  const artifacts = saved.actorId === actorId ? saved.artifacts : [];
  const active = policy.view?.workspace.active ?? policy.patientView?.active ?? unavailable;
  const patients = policy.view?.patients ?? policy.patientView?.patients ?? [];
  const exams = useMemo(() => {
    const cycles = Object.values(shared.cycles);
    const registered = new Set(cycles.map((cycle) => cycle.patientId));
    return [...(shared.role === 'professional' ? initialState.exams.filter((exam) => !registered.has(exam.patientId)) : []),
      ...cycles.flatMap((cycle) => cycle.exams)];
  }, [shared.cycles, shared.role]);

  const patientContexts: PatientAiContext[] = patients.map((patient) => {
    const pending = exams.some((exam) => exam.patientId === patient.patientId && exam.reviewStatus === 'awaiting_review');
    const approved = exams.some((exam) => exam.patientId === patient.patientId && exam.reviewStatus === 'approved');
    const latest = artifacts.filter((artifact) => artifact.patientId === patient.patientId).sort((a, b) => b.version - a.version)[0];
    return { patientId: patient.patientId, relationshipId: patient.relationshipId,
      authorizationStatus: patient.authorized ? 'authorized' : 'pending',
      status: !patient.authorized ? 'not_authorized' : patient.paused ? 'paused' : pending ? 'review_required' : approved ? 'ready' : 'insufficient_data',
      reason: !patient.authorized ? 'Sem autorização registrada para IA.' : patient.paused ? 'IA pausada pelo médico neste acompanhamento.'
        : pending ? 'Há dados aguardando revisão médica.' : approved ? 'Dados revisados disponíveis para apoio médico.' : 'Aguardando dados revisados.',
      lastProcessedAt: latest?.createdAt ?? (patient.lastProcessedAtIso ? formatDateTime(new Date(patient.lastProcessedAtIso)) : null),
      lastProcessedAtIso: latest?.createdAtIso ?? patient.lastProcessedAtIso ?? null,
      appliedConfigurationVersion: latest?.governance.configurationVersion ?? patient.lastAppliedVersion ?? null };
  });
  const state: ClinicalIntelligenceState = {
    ...initialState, activeConfiguration: active, exams, knowledgeSources: active.knowledgeSources,
    governedArtifacts: artifacts, patientContexts,
    careRelationships: patients.map((patient) => ({ id: patient.relationshipId, clinicId: policy.view?.workspace.clinicId ?? '',
      patientId: patient.patientId, patientName: patient.patientName, doctorId: patient.doctorId, doctorName: patient.doctorName,
      encounterId: getDefaultEncounterId(patient.patientId), status: 'active', connectedAt: patient.connectedAt })),
    configurationDraft: { baseVersion: active.version, dirty: policy.hasLocalEdits
      || Boolean(policy.view && policy.view.workspace.draft.fingerprint !== active.fingerprint),
      ...policy.candidate },
    configurationHistory: policy.view?.history.map((version) => ({ ...version, status: version.version === active.version ? 'active' : 'superseded' })) ?? [],
    auditEvents: policy.view?.workspace.events ?? [],
  };

  const loadGovernedArtifacts = useCallback(async (patientId: string, encounterId: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/clinical-synthesis?${new URLSearchParams({ patientId, encounterId })}`, { cache: 'no-store', signal });
    const result = await response.json() as { artifacts?: SavedSynthesis[]; error?: string };
    if (!response.ok || !result.artifacts) throw new Error(result.error ?? 'Não foi possível recuperar a síntese.');
    const incoming = result.artifacts;
    setSaved((current) => ({ actorId, artifacts: [...(current.actorId === actorId ? current.artifacts : [])
      .filter((item) => !(item.patientId === patientId && item.encounterId === encounterId)), ...incoming] }));
    return incoming;
  }, [actorId]);

  const value: ClinicalIntelligenceContextValue = {
    ...state, policy, hydrated: shared.loaded && (policy.loaded || !shared.role),
    loadGovernedArtifacts, dataConnections: policy.candidate.dataConnections, capabilities: policy.candidate.capabilities,
    modulePolicies: policy.candidate.modules, configurationVersion: active.version,
    configurationUpdatedAt: active.publishedAt, hasUnpublishedChanges: state.configurationDraft.dirty,
    sharePatientExam: (input) => shared.mutate(input.patientId, getDefaultEncounterId(input.patientId), 'sharePatientExam', [input]),
    approveExam: async (examId, fields) => {
      const exam = exams.find((item) => item.id === examId);
      if (!exam) throw new Error('Exame indisponível.');
      await shared.mutate(exam.patientId, getDefaultEncounterId(exam.patientId), 'approveExam', [{ examId, fields: fields ?? exam.fields }]);
    },
    addKnowledgeSource: (input) => {
      const now = new Date();
      const source: ClinicalKnowledgeSource = { ...input, id: `knowledge-${crypto.randomUUID()}`, status: 'awaiting_review',
        scope: 'clinic', accessedAt: now.toISOString().slice(0, 10), addedBy: '',
        updatedAt: formatDateTime(now), updatedAtIso: now.toISOString() };
      policy.edit((candidate) => ({ ...candidate, knowledgeSources: [...candidate.knowledgeSources, source] }));
      return source;
    },
    activateKnowledgeSource: (id) => policy.edit((candidate) => ({ ...candidate,
      knowledgeSources: candidate.knowledgeSources.map((source) => source.id === id ? { ...source, status: 'active' } : source) })),
    toggleKnowledgeSource: (id) => {
      const source = policy.candidate.knowledgeSources.find((item) => item.id === id);
      if (!source || source.status === 'awaiting_review') return false;
      policy.edit((candidate) => ({ ...candidate, knowledgeSources: candidate.knowledgeSources.map((item) => item.id === id
        ? { ...item, status: item.status === 'active' ? 'paused' : 'active' } : item) }));
      return true;
    },
    toggleDataConnection: (id) => policy.edit((candidate) => ({ ...candidate,
      dataConnections: candidate.dataConnections.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item) })),
    toggleCapability: (id) => policy.edit((candidate) => ({ ...candidate,
      capabilities: candidate.capabilities.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item) })),
    updateModulePolicy: (id, patch) => policy.edit((candidate) => ({ ...candidate,
      modules: candidate.modules.map((item) => item.id === id ? { ...item, ...patch } : item) })),
    togglePatientAi: (patientId) => { void policy.pausePatient(patientId); },
    recordGovernedArtifact: async (input) => {
      const context = patientContexts.find((item) => item.patientId === input.patientId);
      if (!context || context.authorizationStatus !== 'authorized' || context.status === 'paused') return null;
      const governance = createGovernanceSnapshot(state, input.moduleId, new Date());
      if (!governance || input.moduleId !== 'clinical_synthesis' || input.status !== 'reviewed') return null;
      const response = await fetch('/api/clinical-synthesis', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, governance, sourceIds: [...new Set(input.sourceIds)] }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json() as { artifact?: SavedSynthesis; error?: string };
      if (!response.ok || !result.artifact) throw new Error(result.error ?? 'Não foi possível salvar a síntese.');
      const created = result.artifact;
      setSaved((current) => ({ actorId, artifacts: [...(current.actorId === actorId ? current.artifacts : [])
        .filter((item) => item.id !== created.id), created] }));
      return created;
    },
    saveConfiguration: () => policy.run('save'),
  };
  return <ClinicalIntelligenceContext.Provider value={value}>{children}</ClinicalIntelligenceContext.Provider>;
}

export function useClinicalIntelligence() {
  const context = useContext(ClinicalIntelligenceContext);
  if (!context) throw new Error('useClinicalIntelligence deve ser usado dentro de ClinicalIntelligenceProvider.');
  return context;
}
