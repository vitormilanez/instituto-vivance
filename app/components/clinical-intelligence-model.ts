import type { SavedSynthesis } from '../lib/clinical-synthesis-contract';
import type { ClinicalPolicyStore } from './use-clinical-policy';
import {
  DEFAULT_PATIENT_ID,
  demoPatients,
  getDefaultEncounterId,
  getDemoPatient,
} from './demo-routes';

export type ExamReviewStatus = 'awaiting_review' | 'approved';
export type ExamFieldStatus = 'pending' | 'confirmed' | 'corrected' | 'not_found';
export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface ClinicalExamField {
  id: string;
  code: 'fasting_glucose' | 'hba1c' | 'total_cholesterol' | 'hdl' | 'fasting_insulin';
  label: string;
  rawValue: string;
  value: string;
  rawUnit: string;
  unit: string;
  referenceRange: string;
  sourcePage: number;
  extractionConfidence: ExtractionConfidence;
  status: ExamFieldStatus;
  included: boolean;
}

export interface ClinicalExamDocument {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  title: string;
  fileName: string;
  laboratory: string;
  examDate: string;
  receivedAt: string;
  receivedAtIso: string;
  submittedBy: 'patient' | 'doctor';
  submittedByLabel: string;
  note: string;
  originalAvailable: true;
  attachmentId?: string;
  extractionVersion: number;
  reviewStatus: ExamReviewStatus;
  reviewVersion: number;
  reviewedAt: string | null;
  reviewedAtIso: string | null;
  reviewedBy: string | null;
  governance: ClinicalGovernanceSnapshot[];
  fields: ClinicalExamField[];
}

export type KnowledgeSourceKind = 'official' | 'guideline' | 'review' | 'primary_study' | 'institutional_protocol';
export type KnowledgeSourceStatus = 'active' | 'paused' | 'awaiting_review';
export type EvidenceQuality = 'REGULATORY' | 'HIGH' | 'MODERATE' | 'EXPERT_CONSENSUS' | 'UNKNOWN';

export interface ClinicalKnowledgeSource {
  id: string;
  title: string;
  organization: string;
  kind: KnowledgeSourceKind;
  version: string;
  publicationDate: string;
  accessedAt: string;
  reference: string;
  scope: string;
  relevantClaims: string;
  limitations: string;
  studyDesign?: string;
  population?: string;
  sampleSize?: string;
  followUp?: string;
  conflicts?: string;
  evidenceQuality: EvidenceQuality;
  applicableModuleIds: ClinicalAiModuleId[];
  status: KnowledgeSourceStatus;
  addedBy: string;
  updatedAt: string;
  updatedAtIso: string;
}

export type ClinicalDataConnectionId = 'approved_exams' | 'checkins' | 'care_plans' | 'messages';

export interface ClinicalDataConnection {
  id: ClinicalDataConnectionId;
  label: string;
  description: string;
  enabled: boolean;
}

export type AiCapabilityId = 'organize_context' | 'compare_confirmed_data' | 'suggest_questions' | 'draft_summary';

export interface AiCapability {
  id: AiCapabilityId;
  label: string;
  description: string;
  enabled: boolean;
}

export type ClinicalAiModuleId =
  | 'exam_ingestion'
  | 'exam_analysis'
  | 'longitudinal_analysis'
  | 'visit_preparation'
  | 'clinical_synthesis';

export interface ClinicalAiModulePolicy {
  id: ClinicalAiModuleId;
  label: string;
  description: string;
  feedbackGoal: string;
  primaryKnowledgeSourceId: string;
  requiredDataConnectionIds: ClinicalDataConnectionId[];
  allowedCapabilityIds: AiCapabilityId[];
  enabled: boolean;
  requiresMedicalReview: true;
  blockingConditions: string[];
}

export interface ClinicalAiConfigurationVersion {
  id: string;
  version: number;
  status: 'active' | 'superseded';
  dataConnections: ClinicalDataConnection[];
  capabilities: AiCapability[];
  modules: ClinicalAiModulePolicy[];
  publishedAt: string;
  publishedAtIso: string;
  publishedBy: string;
}

export interface ClinicalAiConfigurationDraft {
  baseVersion: number;
  dirty: boolean;
  dataConnections: ClinicalDataConnection[];
  capabilities: AiCapability[];
  modules: ClinicalAiModulePolicy[];
}

export interface ClinicalGovernanceSnapshot {
  moduleId: ClinicalAiModuleId;
  moduleLabel: string;
  configurationVersion: number;
  knowledgeSourceId: string;
  knowledgeReference: string;
  knowledgeVersion: string;
  sourceFingerprint: string;
  governedAt: string;
  governedAtIso: string;
}

export interface ClinicalGovernedArtifact {
  id: string;
  patientId: string;
  encounterId?: string;
  moduleId: ClinicalAiModuleId;
  version: number;
  status: 'generated' | 'reviewed';
  governance: ClinicalGovernanceSnapshot;
  sourceIds: string[];
  contentFingerprint: string;
  content?: string;
  persistence?: 'd1';
  createdAt: string;
  createdAtIso: string;
  createdBy: string;
}

export type PatientAiContextStatus =
  | 'ready'
  | 'review_required'
  | 'insufficient_data'
  | 'not_authorized'
  | 'paused';

export type AiAuthorizationStatus = 'authorized' | 'pending' | 'revoked';

export interface CareRelationship {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  encounterId: string;
  status: 'active' | 'paused';
  connectedAt: string;
}

export interface PatientAiContext {
  patientId: string;
  relationshipId: string;
  status: PatientAiContextStatus;
  authorizationStatus: AiAuthorizationStatus;
  reason: string;
  lastProcessedAt: string | null;
  lastProcessedAtIso: string | null;
  appliedConfigurationVersion: number | null;
  statusBeforePause?: Exclude<PatientAiContextStatus, 'paused'>;
  reasonBeforePause?: string;
}

export interface ClinicalIntelligenceAuditEvent {
  id: string;
  action:
    | 'exam-received'
    | 'exam-field-updated'
    | 'exam-approved'
    | 'knowledge-added'
    | 'knowledge-activated'
    | 'knowledge-paused'
    | 'module-policy-updated'
    | 'patient-context-updated'
    | 'governed-output-recorded'
    | 'configuration-saved';
  actor: string;
  occurredAt: string;
  occurredAtIso: string;
  summary: string;
  relatedId: string;
  patientId?: string;
  moduleId?: ClinicalAiModuleId;
  configurationVersion?: number;
}

export interface ClinicalIntelligenceState {
  schemaVersion: 2;
  clinicId: string;
  exams: ClinicalExamDocument[];
  knowledgeSources: ClinicalKnowledgeSource[];
  careRelationships: CareRelationship[];
  patientContexts: PatientAiContext[];
  governedArtifacts: ClinicalGovernedArtifact[];
  activeConfiguration: ClinicalAiConfigurationVersion;
  configurationDraft: ClinicalAiConfigurationDraft;
  configurationHistory: ClinicalAiConfigurationVersion[];
  auditEvents: ClinicalIntelligenceAuditEvent[];
}

export interface SharePatientExamInput {
  patientId: string;
  examDate: string;
  note: string;
}

export interface AddKnowledgeSourceInput {
  title: string;
  organization: string;
  kind: KnowledgeSourceKind;
  version: string;
  publicationDate: string;
  reference: string;
  relevantClaims: string;
  limitations: string;
  studyDesign: string;
  population: string;
  sampleSize: string;
  followUp: string;
  conflicts: string;
  evidenceQuality: EvidenceQuality;
  applicableModuleIds: ClinicalAiModuleId[];
}

export interface RecordGovernedArtifactInput {
  patientId: string;
  encounterId: string;
  baseVersion: number;
  requestId: string;
  moduleId: ClinicalAiModuleId;
  status: ClinicalGovernedArtifact['status'];
  sourceIds: string[];
  content: string;
}

export interface ClinicalIntelligenceContextValue extends ClinicalIntelligenceState {
  policy: ClinicalPolicyStore;
  hydrated: boolean;
  dataConnections: ClinicalDataConnection[];
  capabilities: AiCapability[];
  modulePolicies: ClinicalAiModulePolicy[];
  configurationVersion: number;
  configurationUpdatedAt: string;
  hasUnpublishedChanges: boolean;
  sharePatientExam: (input: SharePatientExamInput) => Promise<ClinicalExamDocument>;
  approveExam: (examId: string, fields?: ClinicalExamField[]) => Promise<void>;
  addKnowledgeSource: (input: AddKnowledgeSourceInput) => ClinicalKnowledgeSource;
  activateKnowledgeSource: (sourceId: string) => void;
  toggleKnowledgeSource: (sourceId: string) => boolean;
  toggleDataConnection: (connectionId: ClinicalDataConnectionId) => void;
  toggleCapability: (capabilityId: AiCapabilityId) => void;
  updateModulePolicy: (
    moduleId: ClinicalAiModuleId,
    patch: Partial<Pick<ClinicalAiModulePolicy, 'enabled' | 'primaryKnowledgeSourceId' | 'feedbackGoal'>>,
  ) => void;
  togglePatientAi: (patientId: string) => void;
  recordGovernedArtifact: (input: RecordGovernedArtifactInput) => Promise<SavedSynthesis | null>;
  loadGovernedArtifacts: (patientId: string, encounterId: string, signal?: AbortSignal) => Promise<SavedSynthesis[]>;
  saveConfiguration: () => Promise<void>;
}

export const STORAGE_KEY = 'vivance-clinical-intelligence-v1';
export const CLINIC_ID = 'clinic-vivance-demo';
export const DOCTOR_ID = 'doctor-guilherme-demo';
export const DOCTOR_NAME = 'Dr. Guilherme Martins';

export function createFields(values: {
  glucose: string;
  hba1c: string;
  cholesterol: string;
  hdl: string;
  insulin?: string;
}, status: ExamFieldStatus): ClinicalExamField[] {
  const field = (
    id: string,
    code: ClinicalExamField['code'],
    label: string,
    value: string,
    unit: string,
    referenceRange: string,
    confidence: ExtractionConfidence,
    included = true,
  ): ClinicalExamField => ({
    id,
    code,
    label,
    rawValue: value,
    value,
    rawUnit: unit,
    unit,
    referenceRange,
    sourcePage: 1,
    extractionConfidence: confidence,
    status: included ? status : 'not_found',
    included,
  });

  return [
    field(`${idPrefix(values)}-glucose`, 'fasting_glucose', 'Glicemia em jejum', values.glucose, 'mg/dL', '70–99 mg/dL', 'high'),
    field(`${idPrefix(values)}-hba1c`, 'hba1c', 'Hemoglobina glicada', values.hba1c, '%', '4,0–5,6%', 'high'),
    field(`${idPrefix(values)}-cholesterol`, 'total_cholesterol', 'Colesterol total', values.cholesterol, 'mg/dL', 'Menor que 190 mg/dL', 'medium'),
    field(`${idPrefix(values)}-hdl`, 'hdl', 'HDL', values.hdl, 'mg/dL', 'Maior que 40 mg/dL', 'medium'),
    field(
      `${idPrefix(values)}-insulin`,
      'fasting_insulin',
      'Insulina em jejum',
      values.insulin ?? '',
      'µUI/mL',
      'Não informado no documento',
      values.insulin ? 'medium' : 'low',
      Boolean(values.insulin),
    ),
  ];
}

export function idPrefix(values: { glucose: string; hba1c: string }) {
  return `field-${values.glucose.replace(/\D/g, '')}-${values.hba1c.replace(/\D/g, '')}`;
}

export const initialKnowledgeSources: ClinicalKnowledgeSource[] = [
  {
    id: 'knowledge-viv-clin-03',
    title: 'Protocolo institucional de acompanhamento longitudinal',
    organization: 'Comitê clínico VIVANCE',
    kind: 'institutional_protocol',
    version: '3.2',
    publicationDate: '2026-06-15',
    accessedAt: '4 set 2026',
    reference: 'VIV-CLIN-03',
    scope: 'Organização de consultas, check-ins, documentos e planos revisados.',
    relevantClaims: 'Define o ciclo coleta → síntese → revisão médica → orientação → acompanhamento.',
    limitations: 'Protocolo operacional interno; não substitui diretriz clínica ou julgamento médico.',
    evidenceQuality: 'EXPERT_CONSENSUS',
    applicableModuleIds: ['longitudinal_analysis', 'visit_preparation', 'clinical_synthesis'],
    status: 'active',
    addedBy: DOCTOR_NAME,
    updatedAt: '20 jun 2026 · 14:10',
    updatedAtIso: '2026-06-20T14:10:00-03:00',
  },
  {
    id: 'knowledge-viv-med-02',
    title: 'Critérios de qualidade para medidas antropométricas',
    organization: 'Comitê clínico VIVANCE',
    kind: 'institutional_protocol',
    version: '2.1',
    publicationDate: '2026-06-18',
    accessedAt: '4 set 2026',
    reference: 'VIV-MED-02',
    scope: 'Peso, altura, cintura, condições de medida e comparabilidade.',
    relevantClaims: 'Exige origem, data, método, unidade e limitação antes de comparar medidas.',
    limitations: 'Padroniza qualidade do dado; não cria classificação ou conduta clínica.',
    evidenceQuality: 'EXPERT_CONSENSUS',
    applicableModuleIds: ['longitudinal_analysis'],
    status: 'active',
    addedBy: DOCTOR_NAME,
    updatedAt: '21 jun 2026 · 09:35',
    updatedAtIso: '2026-06-21T09:35:00-03:00',
  },
  {
    id: 'knowledge-viv-lab-01',
    title: 'Protocolo de leitura e validação de exames laboratoriais',
    organization: 'Comitê clínico VIVANCE',
    kind: 'institutional_protocol',
    version: '1.0',
    publicationDate: '2026-06-20',
    accessedAt: '4 set 2026',
    reference: 'VIV-LAB-01',
    scope: 'Extração, normalização, conferência e comparação de dados laboratoriais.',
    relevantClaims: 'Exige documento original, unidade, intervalo impresso, estado de revisão e exclusão explícita de campos ausentes.',
    limitations: 'Protocolo operacional fictício; não interpreta diagnóstico, risco ou conduta.',
    evidenceQuality: 'EXPERT_CONSENSUS',
    applicableModuleIds: ['exam_ingestion', 'exam_analysis'],
    status: 'active',
    addedBy: DOCTOR_NAME,
    updatedAt: '25 jun 2026 · 11:20',
    updatedAtIso: '2026-06-25T11:20:00-03:00',
  },
  {
    id: 'knowledge-viv-evi-07',
    title: 'Revisão de evidências sobre sono e acompanhamento',
    organization: 'Biblioteca clínica VIVANCE',
    kind: 'review',
    version: '1.4',
    publicationDate: '2026-07-30',
    accessedAt: '4 set 2026',
    reference: 'VIV-EVI-07',
    scope: 'Apoio à formulação de perguntas sobre sono e rotina.',
    relevantClaims: 'Resume achados para apoiar investigação clínica, sem inferir causalidade no paciente.',
    limitations: 'Síntese interna aguardando revisão da nova versão; não deve sustentar mensagem clínica final.',
    evidenceQuality: 'MODERATE',
    applicableModuleIds: ['longitudinal_analysis', 'visit_preparation', 'clinical_synthesis'],
    status: 'awaiting_review',
    addedBy: DOCTOR_NAME,
    updatedAt: '3 set 2026 · 17:20',
    updatedAtIso: '2026-09-03T17:20:00-03:00',
  },
];

export const initialDataConnections: ClinicalDataConnection[] = [
  { id: 'approved_exams', label: 'Exames aprovados', description: 'Somente campos confirmados ou corrigidos pelo médico.', enabled: true },
  { id: 'checkins', label: 'Check-ins dos pacientes', description: 'Relato original e organização assistida permanecem separados.', enabled: true },
  { id: 'care_plans', label: 'Planos publicados', description: 'Apenas versões publicadas no acompanhamento.', enabled: true },
  { id: 'messages', label: 'Conversas', description: 'Desativado por padrão para reduzir o uso de texto livre.', enabled: false },
];

export const initialCapabilities: AiCapability[] = [
  { id: 'organize_context', label: 'Organizar contexto longitudinal', description: 'Ordenar fontes por data, tipo e estado de revisão.', enabled: true },
  { id: 'compare_confirmed_data', label: 'Comparar dados confirmados', description: 'Calcular mudanças reproduzíveis entre dados aprovados.', enabled: true },
  { id: 'suggest_questions', label: 'Sugerir perguntas', description: 'Propor perguntas para investigação, nunca uma conduta.', enabled: true },
  { id: 'draft_summary', label: 'Preparar resumo', description: 'Criar rascunho rastreável para revisão médica.', enabled: true },
];

export const initialModulePolicies: ClinicalAiModulePolicy[] = [
  {
    id: 'exam_ingestion',
    label: 'Leitura de exames',
    description: 'Extrai e normaliza campos mantendo o documento original ao lado.',
    feedbackGoal: 'Entregar ao médico dados conferíveis, sem preencher lacunas nem interpretar clinicamente.',
    primaryKnowledgeSourceId: 'knowledge-viv-lab-01',
    requiredDataConnectionIds: ['approved_exams'],
    allowedCapabilityIds: ['organize_context'],
    enabled: true,
    requiresMedicalReview: true,
    blockingConditions: ['Documento original indisponível', 'Campo sem unidade ou origem'],
  },
  {
    id: 'exam_analysis',
    label: 'Análise de exames',
    description: 'Compara somente dados aprovados e cálculos reproduzíveis.',
    feedbackGoal: 'Destacar mudanças, flags do laudo, lacunas e conflitos para decisão médica.',
    primaryKnowledgeSourceId: 'knowledge-viv-lab-01',
    requiredDataConnectionIds: ['approved_exams'],
    allowedCapabilityIds: ['compare_confirmed_data', 'suggest_questions'],
    enabled: true,
    requiresMedicalReview: true,
    blockingConditions: ['Exame ainda não revisado', 'Unidades incompatíveis', 'Diretriz inativa'],
  },
  {
    id: 'longitudinal_analysis',
    label: 'Análise longitudinal',
    description: 'Organiza tendências comparáveis entre períodos e tipos de dado.',
    feedbackGoal: 'Separar mudança objetiva, hipótese, lacuna e conflito sem declarar causalidade.',
    primaryKnowledgeSourceId: 'knowledge-viv-clin-03',
    requiredDataConnectionIds: ['approved_exams', 'checkins'],
    allowedCapabilityIds: ['organize_context', 'compare_confirmed_data'],
    enabled: true,
    requiresMedicalReview: true,
    blockingConditions: ['Origem de medida incompatível', 'Período insuficiente', 'Diretriz inativa'],
  },
  {
    id: 'visit_preparation',
    label: 'Preparação da consulta',
    description: 'Prioriza fatos confirmados, pendências e perguntas para a conversa.',
    feedbackGoal: 'Reduzir tempo de preparação sem decidir prioridade clínica ou conduta.',
    primaryKnowledgeSourceId: 'knowledge-viv-clin-03',
    requiredDataConnectionIds: ['approved_exams', 'checkins', 'care_plans'],
    allowedCapabilityIds: ['organize_context', 'suggest_questions'],
    enabled: true,
    requiresMedicalReview: true,
    blockingConditions: ['Paciente sem autorização', 'Fontes ainda não revisadas'],
  },
  {
    id: 'clinical_synthesis',
    label: 'Síntese clínica',
    description: 'Prepara um rascunho rastreável a partir de fatos já revisados.',
    feedbackGoal: 'Produzir uma síntese editável, com fontes, limites e lacunas explícitos.',
    primaryKnowledgeSourceId: 'knowledge-viv-clin-03',
    requiredDataConnectionIds: ['approved_exams', 'checkins', 'care_plans'],
    allowedCapabilityIds: ['organize_context', 'draft_summary'],
    enabled: true,
    requiresMedicalReview: true,
    blockingConditions: ['Dado crítico pendente', 'Conflito não resolvido', 'Diretriz inativa'],
  },
];

export function cloneConnections(connections: ClinicalDataConnection[]) {
  return connections.map((connection) => ({ ...connection }));
}

export function cloneCapabilities(capabilities: AiCapability[]) {
  return capabilities.map((capability) => ({ ...capability }));
}

export function cloneModules(modules: ClinicalAiModulePolicy[]) {
  return modules.map((module) => ({
    ...module,
    requiredDataConnectionIds: [...module.requiredDataConnectionIds],
    allowedCapabilityIds: [...module.allowedCapabilityIds],
    blockingConditions: [...module.blockingConditions],
  }));
}

export function getClinicalModuleBlockers(
  modulePolicy: ClinicalAiModulePolicy,
  dataConnections: ClinicalDataConnection[],
  capabilities: AiCapability[],
  knowledgeSources: ClinicalKnowledgeSource[],
) {
  if (!modulePolicy.enabled) return [];

  const blockers: string[] = [];
  const source = knowledgeSources.find((item) => item.id === modulePolicy.primaryKnowledgeSourceId);
  if (!source || source.status !== 'active' || !source.applicableModuleIds.includes(modulePolicy.id)) {
    blockers.push('diretriz principal ausente, inativa ou incompatível');
  }

  for (const connectionId of modulePolicy.requiredDataConnectionIds) {
    const connection = dataConnections.find((item) => item.id === connectionId);
    if (!connection?.enabled) blockers.push(`dado obrigatório desligado: ${connection?.label ?? connectionId}`);
  }

  for (const capabilityId of modulePolicy.allowedCapabilityIds) {
    const capability = capabilities.find((item) => item.id === capabilityId);
    if (!capability?.enabled) blockers.push(`capacidade obrigatória desligada: ${capability?.label ?? capabilityId}`);
  }

  return blockers;
}

export const initialActiveConfiguration: ClinicalAiConfigurationVersion = {
  id: 'ai-policy-v3',
  version: 3,
  status: 'active',
  dataConnections: cloneConnections(initialDataConnections),
  capabilities: cloneCapabilities(initialCapabilities),
  modules: cloneModules(initialModulePolicies),
  publishedAt: '1 jul 2026 · 09:12',
  publishedAtIso: '2026-07-01T09:12:00-03:00',
  publishedBy: DOCTOR_NAME,
};

export function seedGovernance(moduleId: ClinicalAiModuleId, governedAt: string, governedAtIso: string): ClinicalGovernanceSnapshot {
  const modulePolicy = initialModulePolicies.find((item) => item.id === moduleId);
  const source = initialKnowledgeSources.find((item) => item.id === modulePolicy?.primaryKnowledgeSourceId);
  if (!modulePolicy || !source) throw new Error(`Configuração inicial incompleta para ${moduleId}.`);
  return {
    moduleId,
    moduleLabel: modulePolicy.label,
    configurationVersion: initialActiveConfiguration.version,
    knowledgeSourceId: source.id,
    knowledgeReference: source.reference,
    knowledgeVersion: source.version,
    sourceFingerprint: `${source.id}:${source.version}`,
    governedAt,
    governedAtIso,
  };
}

export function createSeedExam(input: {
  id: string;
  patientId: string;
  title: string;
  fileName: string;
  examDate: string;
  receivedAt: string;
  receivedAtIso: string;
  note: string;
  reviewStatus: ExamReviewStatus;
  reviewedAt?: string;
  reviewedAtIso?: string;
  values: { glucose: string; hba1c: string; cholesterol: string; hdl: string; insulin?: string };
}): ClinicalExamDocument {
  const patientName = getDemoPatient(input.patientId)?.name ?? 'Paciente';
  const reviewed = input.reviewStatus === 'approved';
  const governance = [seedGovernance('exam_ingestion', input.receivedAt, input.receivedAtIso)];
  if (reviewed) {
    governance.push(seedGovernance(
      'exam_analysis',
      input.reviewedAt ?? input.receivedAt,
      input.reviewedAtIso ?? input.receivedAtIso,
    ));
  }
  return {
    id: input.id,
    patientId: input.patientId,
    patientName,
    doctorName: DOCTOR_NAME,
    title: input.title,
    fileName: input.fileName,
    laboratory: 'Laboratório Campo Azul',
    examDate: input.examDate,
    receivedAt: input.receivedAt,
    receivedAtIso: input.receivedAtIso,
    submittedBy: 'patient',
    submittedByLabel: patientName,
    note: input.note,
    originalAvailable: true,
    extractionVersion: 1,
    reviewStatus: input.reviewStatus,
    reviewVersion: reviewed ? 1 : 0,
    reviewedAt: reviewed ? input.reviewedAt ?? input.receivedAt : null,
    reviewedAtIso: reviewed ? input.reviewedAtIso ?? input.receivedAtIso : null,
    reviewedBy: reviewed ? DOCTOR_NAME : null,
    governance,
    fields: createFields(input.values, reviewed ? 'confirmed' : 'pending')
      .map((field) => ({ ...field, id: `${input.id}-${field.code}` })),
  };
}

export const initialExams: ClinicalExamDocument[] = [
  createSeedExam({ id: 'exam-marina-2026-07-18', patientId: DEFAULT_PATIENT_ID, title: 'Painel laboratorial · julho', fileName: 'laboratorio-campo-azul-18-07-2026.pdf', examDate: '2026-07-18', receivedAt: '18 jul 2026 · 16:42', receivedAtIso: '2026-07-18T16:42:00-03:00', reviewedAt: '19 jul 2026 · 09:18', reviewedAtIso: '2026-07-19T09:18:00-03:00', note: 'Exame solicitado no início do acompanhamento.', reviewStatus: 'approved', values: { glucose: '101', hba1c: '5,8', cholesterol: '208', hdl: '47' } }),
  createSeedExam({ id: 'exam-marina-2026-08-14', patientId: DEFAULT_PATIENT_ID, title: 'Painel laboratorial · agosto', fileName: 'laboratorio-campo-azul-14-08-2026.pdf', examDate: '2026-08-14', receivedAt: '14 ago 2026 · 18:07', receivedAtIso: '2026-08-14T18:07:00-03:00', reviewedAt: '15 ago 2026 · 08:54', reviewedAtIso: '2026-08-15T08:54:00-03:00', note: 'Controle laboratorial combinado no retorno.', reviewStatus: 'approved', values: { glucose: '96', hba1c: '5,5', cholesterol: '196', hdl: '49' } }),
  createSeedExam({ id: 'exam-marina-2026-09-01', patientId: DEFAULT_PATIENT_ID, title: 'Painel laboratorial · setembro', fileName: 'laboratorio-campo-azul-01-09-2026.pdf', examDate: '2026-09-01', receivedAt: '1 set 2026 · 18:26', receivedAtIso: '2026-09-01T18:26:00-03:00', note: 'Exame enviado pela paciente antes da consulta.', reviewStatus: 'awaiting_review', values: { glucose: '94', hba1c: '5,4', cholesterol: '190', hdl: '50' } }),
  createSeedExam({ id: 'exam-ana-2026-08-25', patientId: 'pac-demo-002', title: 'Painel laboratorial · agosto', fileName: 'laboratorio-campo-azul-25-08-2026.pdf', examDate: '2026-08-25', receivedAt: '25 ago 2026 · 12:14', receivedAtIso: '2026-08-25T12:14:00-03:00', reviewedAt: '26 ago 2026 · 08:40', reviewedAtIso: '2026-08-26T08:40:00-03:00', note: 'Exame compartilhado para o retorno de acompanhamento.', reviewStatus: 'approved', values: { glucose: '89', hba1c: '5,2', cholesterol: '178', hdl: '56', insulin: '8,6' } }),
  createSeedExam({ id: 'exam-paulo-2026-09-03', patientId: 'pac-demo-003', title: 'Painel laboratorial · setembro', fileName: 'laboratorio-campo-azul-03-09-2026.pdf', examDate: '2026-09-03', receivedAt: '3 set 2026 · 19:05', receivedAtIso: '2026-09-03T19:05:00-03:00', note: 'Documento recebido e ainda não revisado.', reviewStatus: 'awaiting_review', values: { glucose: '106', hba1c: '5,9', cholesterol: '214', hdl: '42' } }),
  createSeedExam({ id: 'exam-lucia-2026-08-22', patientId: 'pac-demo-005', title: 'Painel laboratorial · agosto', fileName: 'laboratorio-campo-azul-22-08-2026.pdf', examDate: '2026-08-22', receivedAt: '22 ago 2026 · 10:30', receivedAtIso: '2026-08-22T10:30:00-03:00', reviewedAt: '22 ago 2026 · 16:15', reviewedAtIso: '2026-08-22T16:15:00-03:00', note: 'Controle registrado durante o acompanhamento.', reviewStatus: 'approved', values: { glucose: '92', hba1c: '5,3', cholesterol: '184', hdl: '53' } }),
];

export const initialCareRelationships: CareRelationship[] = demoPatients.map((patient) => ({
  id: `relationship-${patient.id}-${DOCTOR_ID}`,
  clinicId: CLINIC_ID,
  patientId: patient.id,
  patientName: patient.name,
  doctorId: DOCTOR_ID,
  doctorName: DOCTOR_NAME,
  encounterId: getDefaultEncounterId(patient.id),
  status: 'active',
  connectedAt: '1 jul 2026',
}));

export const contextSeed: Record<string, Omit<PatientAiContext, 'patientId' | 'relationshipId'>> = {
  'pac-demo-001': { status: 'review_required', authorizationStatus: 'authorized', reason: 'Novo exame aguarda revisão médica.', lastProcessedAt: '1 set 2026 · 18:27', lastProcessedAtIso: '2026-09-01T18:27:00-03:00', appliedConfigurationVersion: 3 },
  'pac-demo-002': { status: 'ready', authorizationStatus: 'authorized', reason: 'Dados aprovados e contexto disponível.', lastProcessedAt: '26 ago 2026 · 08:42', lastProcessedAtIso: '2026-08-26T08:42:00-03:00', appliedConfigurationVersion: 3 },
  'pac-demo-003': { status: 'review_required', authorizationStatus: 'authorized', reason: 'Exame recebido e ainda fora das análises.', lastProcessedAt: null, lastProcessedAtIso: null, appliedConfigurationVersion: null },
  'pac-demo-004': { status: 'insufficient_data', authorizationStatus: 'authorized', reason: 'Cadastro inicial sem dados aprovados suficientes.', lastProcessedAt: null, lastProcessedAtIso: null, appliedConfigurationVersion: null },
  'pac-demo-005': { status: 'ready', authorizationStatus: 'authorized', reason: 'Contexto atualizado com dados revisados.', lastProcessedAt: '22 ago 2026 · 16:18', lastProcessedAtIso: '2026-08-22T16:18:00-03:00', appliedConfigurationVersion: 3 },
  'pac-demo-006': { status: 'not_authorized', authorizationStatus: 'pending', reason: 'A autorização específica para uso da IA ainda não foi registrada.', lastProcessedAt: null, lastProcessedAtIso: null, appliedConfigurationVersion: null },
  'pac-demo-007': { status: 'ready', authorizationStatus: 'authorized', reason: 'Check-ins e plano publicado disponíveis para preparação.', lastProcessedAt: '2 set 2026 · 09:10', lastProcessedAtIso: '2026-09-02T09:10:00-03:00', appliedConfigurationVersion: 3 },
  'pac-demo-008': { status: 'paused', authorizationStatus: 'authorized', reason: 'Uso da IA pausado neste acompanhamento pelo médico.', lastProcessedAt: '28 ago 2026 · 15:20', lastProcessedAtIso: '2026-08-28T15:20:00-03:00', appliedConfigurationVersion: 3, statusBeforePause: 'ready', reasonBeforePause: 'Contexto atualizado com dados revisados.' },
  'pac-demo-009': { status: 'insufficient_data', authorizationStatus: 'authorized', reason: 'Há vínculo, mas ainda não existem dados revisados.', lastProcessedAt: null, lastProcessedAtIso: null, appliedConfigurationVersion: null },
  'pac-demo-010': { status: 'ready', authorizationStatus: 'authorized', reason: 'Contexto longitudinal disponível para o médico.', lastProcessedAt: '3 set 2026 · 10:05', lastProcessedAtIso: '2026-09-03T10:05:00-03:00', appliedConfigurationVersion: 3 },
};

export const initialPatientContexts: PatientAiContext[] = demoPatients.map((patient) => ({
  patientId: patient.id,
  relationshipId: `relationship-${patient.id}-${DOCTOR_ID}`,
  ...contextSeed[patient.id],
}));

export const initialGovernedArtifacts: ClinicalGovernedArtifact[] = [
  {
    id: 'artifact-marina-longitudinal-v1',
    patientId: DEFAULT_PATIENT_ID,
    moduleId: 'longitudinal_analysis',
    version: 1,
    status: 'generated',
    governance: seedGovernance('longitudinal_analysis', '15 ago 2026 · 09:02', '2026-08-15T09:02:00-03:00'),
    sourceIds: ['exam-marina-2026-07-18', 'exam-marina-2026-08-14', 'src-demo-checkin-013'],
    contentFingerprint: fingerprintClinicalContent('marina-longitudinal-jul-ago-v1'),
    createdAt: '15 ago 2026 · 09:02',
    createdAtIso: '2026-08-15T09:02:00-03:00',
    createdBy: 'Motor clínico demonstrativo',
  },
];

export const initialState: ClinicalIntelligenceState = {
  schemaVersion: 2,
  clinicId: CLINIC_ID,
  exams: initialExams,
  knowledgeSources: initialKnowledgeSources,
  careRelationships: initialCareRelationships,
  patientContexts: initialPatientContexts,
  governedArtifacts: initialGovernedArtifacts,
  activeConfiguration: initialActiveConfiguration,
  configurationDraft: {
    baseVersion: initialActiveConfiguration.version,
    dirty: false,
    dataConnections: cloneConnections(initialActiveConfiguration.dataConnections),
    capabilities: cloneCapabilities(initialActiveConfiguration.capabilities),
    modules: cloneModules(initialActiveConfiguration.modules),
  },
  configurationHistory: [initialActiveConfiguration],
  auditEvents: [
    {
      id: 'audit-marina-longitudinal-generated',
      action: 'governed-output-recorded',
      actor: 'Motor clínico demonstrativo',
      occurredAt: '15 ago 2026 · 09:02',
      occurredAtIso: '2026-08-15T09:02:00-03:00',
      summary: 'Análise longitudinal demonstrativa registrada sob configuração v3.',
      relatedId: 'artifact-marina-longitudinal-v1',
      patientId: DEFAULT_PATIENT_ID,
      moduleId: 'longitudinal_analysis',
      configurationVersion: 3,
    },
    {
      id: 'audit-exam-september-received',
      action: 'exam-received',
      actor: getDemoPatient(DEFAULT_PATIENT_ID)?.name ?? 'Marina Costa',
      occurredAt: '1 set 2026 · 18:26',
      occurredAtIso: '2026-09-01T18:26:00-03:00',
      summary: 'Painel laboratorial de setembro compartilhado com a equipe.',
      relatedId: 'exam-marina-2026-09-01',
      patientId: DEFAULT_PATIENT_ID,
      moduleId: 'exam_ingestion',
      configurationVersion: 3,
    },
    {
      id: 'audit-knowledge-review-added',
      action: 'knowledge-added',
      actor: DOCTOR_NAME,
      occurredAt: '3 set 2026 · 17:20',
      occurredAtIso: '2026-09-03T17:20:00-03:00',
      summary: 'Nova versão da revisão sobre sono adicionada e mantida fora do contexto até revisão.',
      relatedId: 'knowledge-viv-evi-07',
    },
  ],
};


export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' ·');
}

export function fingerprintClinicalContent(content: string) {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createAuditEvent(
  action: ClinicalIntelligenceAuditEvent['action'],
  actor: ClinicalIntelligenceAuditEvent['actor'],
  summary: string,
  relatedId: string,
  metadata: Partial<Pick<ClinicalIntelligenceAuditEvent, 'patientId' | 'moduleId' | 'configurationVersion'>> = {},
): ClinicalIntelligenceAuditEvent {
  const now = new Date();
  return {
    id: `clinical-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    actor,
    occurredAt: formatDateTime(now),
    occurredAtIso: now.toISOString(),
    summary,
    relatedId,
    ...metadata,
  };
}

export function defaultApplicableModulesForSource(source: Pick<ClinicalKnowledgeSource, 'kind'>): ClinicalAiModuleId[] {
  if (source.kind === 'institutional_protocol') {
    return ['longitudinal_analysis', 'visit_preparation', 'clinical_synthesis'];
  }
  return ['longitudinal_analysis', 'visit_preparation', 'clinical_synthesis'];
}

export function normalizeKnowledgeSources(sources: ClinicalKnowledgeSource[]) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const normalize = (source: ClinicalKnowledgeSource, seed?: ClinicalKnowledgeSource): ClinicalKnowledgeSource => seed
    ? {
        ...source,
        ...seed,
        status: source.status,
        updatedAt: source.updatedAt,
        updatedAtIso: source.updatedAtIso,
        applicableModuleIds: [...seed.applicableModuleIds],
      }
    : {
        ...source,
        applicableModuleIds: Array.isArray(source.applicableModuleIds) && source.applicableModuleIds.length > 0
          ? [...source.applicableModuleIds]
          : defaultApplicableModulesForSource(source),
      };
  return [
    ...initialKnowledgeSources.map((seed) => {
      const current = sourceById.get(seed.id);
      return current ? normalize(current, seed) : seed;
    }),
    ...sources
      .filter((source) => !initialKnowledgeSources.some((seed) => seed.id === source.id))
      .map((source) => normalize(source)),
  ];
}

export function mergeExamSeeds(exams: ClinicalExamDocument[]) {
  const examById = new Map(exams.map((exam) => [exam.id, exam]));
  return [
    ...initialExams.map((seed) => examById.get(seed.id) ?? seed),
    ...exams.filter((exam) => !initialExams.some((seed) => seed.id === exam.id)),
  ].map((exam) => ({
    ...exam,
    patientName: getDemoPatient(exam.patientId)?.name ?? exam.patientName,
    governance: Array.isArray(exam.governance) ? exam.governance : [],
  }));
}

export function mergeArtifactSeeds(artifacts: ClinicalGovernedArtifact[]) {
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  return [
    ...initialGovernedArtifacts.map((seed) => artifactById.get(seed.id) ?? seed),
    ...artifacts.filter((artifact) => !initialGovernedArtifacts.some((seed) => seed.id === artifact.id)),
  ];
}

export function normalizePatientContexts(contexts: PatientAiContext[], exams: ClinicalExamDocument[]) {
  const contextByPatientId = new Map(contexts.map((context) => [context.patientId, context]));
  return initialPatientContexts.map((seed) => {
    const current = contextByPatientId.get(seed.patientId) ?? seed;
    if (current.authorizationStatus !== 'authorized') {
      return {
        ...current,
        status: 'not_authorized' as const,
        reason: 'A autorização específica para uso da IA ainda não foi registrada.',
      };
    }
    if (current.status === 'paused') return current;
    const patientExams = exams.filter((exam) => exam.patientId === current.patientId);
    const hasPending = patientExams.some((exam) => exam.reviewStatus === 'awaiting_review');
    if (hasPending) {
      return {
        ...current,
        status: 'review_required' as const,
        reason: 'Há exame aguardando revisão médica e ainda fora das análises.',
      };
    }
    const latestGovernedExam = patientExams
      .flatMap((exam) => exam.governance.filter((snapshot) => snapshot.moduleId === 'exam_analysis'))
      .toSorted((left, right) => right.governedAtIso.localeCompare(left.governedAtIso))[0];
    if (patientExams.some((exam) => exam.reviewStatus === 'approved') && latestGovernedExam) {
      return {
        ...current,
        status: 'ready' as const,
        reason: 'Dados aprovados e contexto atualizado sob a diretriz registrada.',
        lastProcessedAt: latestGovernedExam.governedAt,
        lastProcessedAtIso: latestGovernedExam.governedAtIso,
        appliedConfigurationVersion: latestGovernedExam.configurationVersion,
      };
    }
    return current;
  });
}

export function isPersistedStateV2(value: unknown): value is ClinicalIntelligenceState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<ClinicalIntelligenceState>;
  return state.schemaVersion === 2
    && Array.isArray(state.exams)
    && Array.isArray(state.knowledgeSources)
    && Array.isArray(state.careRelationships)
    && Array.isArray(state.patientContexts)
    && Boolean(state.activeConfiguration)
    && Boolean(state.configurationDraft)
    && Array.isArray(state.activeConfiguration?.dataConnections)
    && Array.isArray(state.activeConfiguration?.capabilities)
    && Array.isArray(state.activeConfiguration?.modules)
    && Array.isArray(state.configurationDraft?.dataConnections)
    && Array.isArray(state.configurationDraft?.capabilities)
    && Array.isArray(state.configurationDraft?.modules)
    && Array.isArray(state.configurationHistory)
    && Array.isArray(state.auditEvents)
    && typeof state.activeConfiguration?.version === 'number';
}

export function migratePersistedState(value: unknown): ClinicalIntelligenceState | null {
  if (isPersistedStateV2(value)) {
    const exams = mergeExamSeeds(value.exams);
    return {
      ...value,
      exams,
      knowledgeSources: normalizeKnowledgeSources(value.knowledgeSources),
      patientContexts: normalizePatientContexts(value.patientContexts, exams),
      governedArtifacts: mergeArtifactSeeds(Array.isArray(value.governedArtifacts) ? value.governedArtifacts : []),
    };
  }
  if (!value || typeof value !== 'object') return null;
  const legacy = value as {
    schemaVersion?: number;
    exams?: Array<ClinicalExamDocument & { governance?: ClinicalGovernanceSnapshot[] }>;
    knowledgeSources?: ClinicalKnowledgeSource[];
    dataConnections?: ClinicalDataConnection[];
    capabilities?: AiCapability[];
    configurationVersion?: number;
    configurationUpdatedAt?: string;
    auditEvents?: ClinicalIntelligenceAuditEvent[];
  };
  if (
    legacy.schemaVersion !== 1
    || !Array.isArray(legacy.exams)
    || !Array.isArray(legacy.knowledgeSources)
    || !Array.isArray(legacy.dataConnections)
    || !Array.isArray(legacy.capabilities)
    || !Array.isArray(legacy.auditEvents)
  ) return null;

  const mergedKnowledge = normalizeKnowledgeSources(legacy.knowledgeSources);
  const activeConfiguration: ClinicalAiConfigurationVersion = {
    ...initialActiveConfiguration,
    id: `ai-policy-v${legacy.configurationVersion ?? 3}`,
    version: legacy.configurationVersion ?? 3,
    dataConnections: cloneConnections(legacy.dataConnections),
    capabilities: cloneCapabilities(legacy.capabilities),
    modules: cloneModules(initialModulePolicies),
    publishedAt: legacy.configurationUpdatedAt ?? initialActiveConfiguration.publishedAt,
  };
  const migratedExams = mergeExamSeeds(legacy.exams.map((exam) => ({
    ...exam,
    patientName: getDemoPatient(exam.patientId)?.name ?? exam.patientName,
    governance: Array.isArray(exam.governance) && exam.governance.length > 0
      ? exam.governance
      : [],
  })));

  return {
    ...initialState,
    exams: migratedExams,
    knowledgeSources: mergedKnowledge,
    activeConfiguration,
    configurationDraft: {
      baseVersion: activeConfiguration.version,
      dirty: false,
      dataConnections: cloneConnections(activeConfiguration.dataConnections),
      capabilities: cloneCapabilities(activeConfiguration.capabilities),
      modules: cloneModules(activeConfiguration.modules),
    },
    configurationHistory: [activeConfiguration],
    governedArtifacts: mergeArtifactSeeds([]),
    patientContexts: normalizePatientContexts(initialPatientContexts, migratedExams),
    auditEvents: legacy.auditEvents,
  };
}

export function createGovernanceSnapshot(
  state: ClinicalIntelligenceState,
  moduleId: ClinicalAiModuleId,
  date = new Date(),
): ClinicalGovernanceSnapshot | null {
  const modulePolicy = state.activeConfiguration.modules.find((item) => item.id === moduleId && item.enabled);
  if (!modulePolicy) return null;
  const source = state.knowledgeSources.find(
    (item) => item.id === modulePolicy.primaryKnowledgeSourceId
      && item.status === 'active'
      && item.applicableModuleIds.includes(moduleId),
  );
  const blockers = getClinicalModuleBlockers(
    modulePolicy,
    state.activeConfiguration.dataConnections,
    state.activeConfiguration.capabilities,
    state.knowledgeSources,
  );
  if (!source || blockers.length > 0) return null;
  return {
    moduleId,
    moduleLabel: modulePolicy.label,
    configurationVersion: state.activeConfiguration.version,
    knowledgeSourceId: source.id,
    knowledgeReference: source.reference,
    knowledgeVersion: source.version,
    sourceFingerprint: `${source.id}:${source.version}`,
    governedAt: formatDateTime(date),
    governedAtIso: date.toISOString(),
  };
}

export function createPatientGovernanceSnapshot(
  state: ClinicalIntelligenceState,
  patientId: string,
  moduleId: ClinicalAiModuleId,
  date = new Date(),
) {
  const patientContext = state.patientContexts.find((item) => item.patientId === patientId);
  const careRelationship = state.careRelationships.find((item) => (
    item.id === patientContext?.relationshipId
    && item.patientId === patientId
    && item.clinicId === state.clinicId
    && item.status === 'active'
  ));
  const canUseAssistance = patientContext?.authorizationStatus === 'authorized'
    && Boolean(careRelationship)
    && patientContext.status !== 'not_authorized'
    && patientContext.status !== 'paused'
    && (
      moduleId === 'exam_ingestion'
      || moduleId === 'exam_analysis'
      || patientContext.status === 'ready'
      || patientContext.status === 'review_required'
    );
  return canUseAssistance ? createGovernanceSnapshot(state, moduleId, date) : null;
}

export function getSyntheticExamValues(patientId: string) {
  const patientNumber = Number(patientId.match(/(\d+)$/)?.[1] ?? 1);
  return {
    glucose: String(88 + ((patientNumber * 3) % 19)),
    hba1c: `5,${2 + (patientNumber % 6)}`,
    cholesterol: String(174 + (patientNumber * 4)),
    hdl: String(45 + (patientNumber % 11)),
  };
}

export function createPatientExam(input: SharePatientExamInput, state: ClinicalIntelligenceState): ClinicalExamDocument {
  const now = new Date();
  const id = `exam-${input.patientId}-${Date.now()}`;
  const relationship = state.careRelationships.find((item) => item.patientId === input.patientId && item.status === 'active');
  const patientName = getDemoPatient(input.patientId)?.name ?? relationship?.patientName ?? 'Paciente';
  const doctorName = relationship?.doctorName ?? DOCTOR_NAME;
  const governance = createPatientGovernanceSnapshot(state, input.patientId, 'exam_ingestion', now);
  return {
    id,
    patientId: input.patientId,
    patientName,
    doctorName,
    title: 'Painel laboratorial recebido',
    fileName: `painel-laboratorial-${input.examDate}.pdf`,
    laboratory: 'Laboratório Campo Azul',
    examDate: input.examDate,
    receivedAt: formatDateTime(now),
    receivedAtIso: now.toISOString(),
    submittedBy: 'patient',
    submittedByLabel: patientName,
    note: input.note,
    originalAvailable: true,
    extractionVersion: governance ? 1 : 0,
    reviewStatus: 'awaiting_review',
    reviewVersion: 0,
    reviewedAt: null,
    reviewedAtIso: null,
    reviewedBy: null,
    governance: governance ? [governance] : [],
    fields: governance
      ? createFields(getSyntheticExamValues(input.patientId), 'pending')
        .map((field) => ({ ...field, id: `${id}-${field.code}` }))
      : [],
  };
}
