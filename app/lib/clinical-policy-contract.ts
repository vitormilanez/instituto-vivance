import {
  initialActiveConfiguration, initialKnowledgeSources, getClinicalModuleBlockers,
  type ClinicalAiConfigurationVersion, type ClinicalKnowledgeSource,
  type ClinicalAiModuleId, type ClinicalIntelligenceAuditEvent,
} from '../components/clinical-intelligence-model';

export type PolicyCandidate = Pick<ClinicalAiConfigurationVersion, 'modules' | 'dataConnections' | 'capabilities'> & {
  knowledgeSources: ClinicalKnowledgeSource[];
};
export type PolicyComparison = {
  id: string; fingerprint: string; baseVersion: number; suiteVersion: 'policy-safety-v1';
  createdAt: string; createdBy: string; passed: boolean; blockers: string[];
  changes: string[];
  cases: { id: string; label: string; before: string; after: string; passed: boolean }[];
};
export type PolicyApproval = { fingerprint: string; testId: string; actorId: string; actorName: string; at: string };
export type PolicyVersion = ClinicalAiConfigurationVersion & {
  knowledgeSources: ClinicalKnowledgeSource[]; fingerprint: string;
  note: string; approval: PolicyApproval | null; comparison: PolicyComparison | null;
};
export type PolicyDraft = {
  baseVersion: number; candidate: PolicyCandidate; note: string; fingerprint: string;
  comparison: PolicyComparison | null; approval: PolicyApproval | null;
};
export type PolicyWorkspace = {
  revision: number; clinicId: string; active: PolicyVersion; draft: PolicyDraft;
  events: ClinicalIntelligenceAuditEvent[];
};
export type PolicyPatient = {
  relationshipId: string; patientId: string; patientName: string; doctorId: string; doctorName: string;
  connectedAt: string; authorized: boolean; paused: boolean; revision: number; basis: string;
  lastAppliedVersion?: number | null; lastProcessedAtIso?: string | null;
};
export type PolicyView = {
  actorId: string; workspace: PolicyWorkspace; history: PolicyVersion[]; patients: PolicyPatient[];
};
export type PatientPolicyView = { actorId: string; active: PolicyVersion | null; patients: PolicyPatient[] };

export function mergePolicyView(previous: PolicyView | null, incoming: PolicyView): PolicyView {
  if (!previous || previous.actorId !== incoming.actorId || previous.workspace.clinicId !== incoming.workspace.clinicId) return incoming;
  const newest = previous.workspace.revision > incoming.workspace.revision ? previous : incoming;
  return { ...newest, patients: mergePolicyPatients(previous.patients, incoming.patients) };
}
export function mergePolicyPatients(previous: PolicyPatient[], incoming: PolicyPatient[]) {
  // Membership removals follow the fresh response, while late responses cannot undo an acknowledged pause.
  return incoming.map((patient) => {
    const old = previous.find((item) => item.relationshipId === patient.relationshipId);
    return old && old.revision > patient.revision ? old : patient;
  });
}
export type PolicyCommand =
  | { action: 'save'; revision: number; candidate: PolicyCandidate; note: string }
  | { action: 'test' | 'publish'; revision: number }
  | { action: 'approve'; revision: number; acknowledged: true }
  | { action: 'pause'; relationshipId: string; revision: number; paused: boolean };

export function initialCandidate(): PolicyCandidate {
  return structuredClone({ modules: initialActiveConfiguration.modules,
    dataConnections: initialActiveConfiguration.dataConnections, capabilities: initialActiveConfiguration.capabilities,
    knowledgeSources: initialKnowledgeSources });
}
export function candidateOf(version: PolicyVersion): PolicyCandidate {
  return { modules: version.modules, dataConnections: version.dataConnections,
    capabilities: version.capabilities, knowledgeSources: version.knowledgeSources };
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function string(value: unknown, max = 4000): value is string {
  return typeof value === 'string' && value.length <= max;
}
const moduleIds = initialActiveConfiguration.modules.map((module) => module.id);

// Whitelist editable fields. Labels, fixed blockers, inputs and human-review requirements are server-owned.
export function parsePolicyCandidate(value: unknown): PolicyCandidate | null {
  if (!record(value)) return null;
  const seed = initialCandidate();
  for (const key of ['dataConnections', 'capabilities', 'modules'] as const) {
    const list = value[key];
    if (!Array.isArray(list) || list.length !== seed[key].length
      || new Set(list.map((item) => record(item) ? item.id : null)).size !== list.length) return null;
    for (const template of seed[key]) {
      const item: unknown = list.find((entry) => record(entry) && entry.id === template.id);
      if (!record(item) || typeof item.enabled !== 'boolean') return null;
      template.enabled = item.enabled;
      if (key === 'modules') {
        if (!string(item.primaryKnowledgeSourceId, 100) || !string(item.feedbackGoal, 1200) || !item.feedbackGoal.trim()) return null;
        const modulePolicy = template as PolicyCandidate['modules'][number];
        modulePolicy.primaryKnowledgeSourceId = item.primaryKnowledgeSourceId;
        modulePolicy.feedbackGoal = item.feedbackGoal.trim();
      }
    }
  }
  if (!Array.isArray(value.knowledgeSources) || value.knowledgeSources.length > 100) return null;
  const sources: ClinicalKnowledgeSource[] = [];
  for (const raw of value.knowledgeSources) {
    if (!record(raw) || !string(raw.id, 100) || !/^[\w-]+$/u.test(raw.id)
      || !['official', 'guideline', 'review', 'primary_study', 'institutional_protocol'].includes(String(raw.kind))
      || !['active', 'paused', 'awaiting_review'].includes(String(raw.status))
      || !['REGULATORY', 'HIGH', 'MODERATE', 'EXPERT_CONSENSUS', 'UNKNOWN'].includes(String(raw.evidenceQuality))) return null;
    const required = ['title', 'organization', 'version', 'publicationDate', 'reference', 'relevantClaims', 'limitations'] as const;
    if (required.some((key) => !string(raw[key]) || !raw[key].trim())
      || !string(raw.version, 100) || !string(raw.reference, 2000)
      || !/^\d{4}-\d{2}-\d{2}$/u.test(String(raw.publicationDate))
      || !Number.isFinite(Date.parse(String(raw.publicationDate)))) return null;
    if (!Array.isArray(raw.applicableModuleIds) || raw.applicableModuleIds.length === 0
      || raw.applicableModuleIds.some((id) => !moduleIds.includes(id as ClinicalAiModuleId))
      || new Set(raw.applicableModuleIds).size !== raw.applicableModuleIds.length) return null;
    for (const key of ['studyDesign', 'population', 'sampleSize', 'followUp', 'conflicts'] as const) {
      if (raw[key] !== undefined && !string(raw[key])) return null;
    }
    if (raw.kind === 'primary_study' && ['studyDesign', 'population', 'sampleSize'].some((key) => !String(raw[key] ?? '').trim())) return null;
    const fields = Object.fromEntries(required.map((key) => [key, String(raw[key]).trim()]));
    sources.push({ ...fields, id: raw.id, kind: raw.kind, status: raw.status, evidenceQuality: raw.evidenceQuality,
      applicableModuleIds: [...raw.applicableModuleIds],
      studyDesign: raw.studyDesign ?? '', population: raw.population ?? '', sampleSize: raw.sampleSize ?? '',
      followUp: raw.followUp ?? '', conflicts: raw.conflicts ?? '',
      // The server replaces provenance when saving, never accepts the claimed actor/date.
      accessedAt: '', scope: 'clinic', addedBy: '', updatedAt: '', updatedAtIso: '',
    } as ClinicalKnowledgeSource);
  }
  if (new Set(sources.map((source) => source.id)).size !== sources.length) return null;
  return { ...seed, knowledgeSources: sources };
}

export function parsePolicyCommand(value: unknown): PolicyCommand | null {
  if (!record(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) return null;
  const revision = Number(value.revision);
  if (value.action === 'save') {
    const candidate = parsePolicyCandidate(value.candidate);
    return candidate && string(value.note, 2000) && value.note.trim()
      ? { action: 'save', revision, candidate, note: value.note.trim() } : null;
  }
  if (value.action === 'test' || value.action === 'publish') return { action: value.action, revision };
  if (value.action === 'approve' && value.acknowledged === true) return { action: 'approve', revision, acknowledged: true };
  if (value.action === 'pause' && string(value.relationshipId, 100) && typeof value.paused === 'boolean') {
    return { action: 'pause', revision, relationshipId: value.relationshipId, paused: value.paused };
  }
  return null;
}

export function policyBlockers(candidate: PolicyCandidate) {
  return candidate.modules.flatMap((module) => getClinicalModuleBlockers(module, candidate.dataConnections,
    candidate.capabilities, candidate.knowledgeSources).map((blocker) => `${module.label}: ${blocker}`));
}

export type PolicyCase = {
  authorized: boolean; paused: boolean; ownPatient: boolean; reviewed: boolean; unitsMatch: boolean; hasSource: boolean;
};
export function evaluatePolicyCase(candidate: PolicyCandidate, moduleId: ClinicalAiModuleId, input: PolicyCase) {
  const modulePolicy = candidate.modules.find((item) => item.id === moduleId);
  if (!input.ownPatient || !input.authorized || input.paused) return { allowed: false, reason: 'Bloqueado: vínculo, autorização ou pausa do paciente.' };
  if (!modulePolicy?.enabled) return { allowed: false, reason: 'Módulo desligado.' };
  const blockers = getClinicalModuleBlockers(modulePolicy, candidate.dataConnections, candidate.capabilities, candidate.knowledgeSources);
  if (blockers.length) return { allowed: false, reason: `Bloqueado: ${blockers.join('; ')}.` };
  if (!input.hasSource) return { allowed: false, reason: 'Bloqueado: fonte original ausente; solicitar o documento.' };
  if (!input.reviewed && moduleId !== 'exam_ingestion') return { allowed: false, reason: 'Bloqueado: dados aguardam revisão médica.' };
  if (!input.unitsMatch && modulePolicy.allowedCapabilityIds.includes('compare_confirmed_data')) {
    return { allowed: false, reason: 'Bloqueado: unidades incompatíveis; não comparar valores.' };
  }
  const source = candidate.knowledgeSources.find((item) => item.id === modulePolicy.primaryKnowledgeSourceId)!;
  return { allowed: true, reason: `Elegível para apoio com revisão médica. Objetivo: ${modulePolicy.feedbackGoal} Fonte: ${source.reference} · ${source.version}.` };
}

// Deterministic eligibility simulation; no model invocation, clinical conclusion or scientific validation.
export function comparePolicy(active: PolicyVersion, draft: PolicyDraft, actor: string): PolicyComparison {
  const valid: PolicyCase = { authorized: true, paused: false, ownPatient: true, reviewed: true, unitsMatch: true, hasSource: true };
  const fixtures: { id: string; label: string; input: PolicyCase; mustBlock: boolean }[] = [
    { id: 'reviewed', label: 'Caso A · exame revisado, unidade e fonte preservadas', input: valid, mustBlock: false },
    { id: 'pending', label: 'Caso B · exame sem revisão', input: { ...valid, reviewed: false }, mustBlock: true },
    { id: 'units', label: 'Caso C · valores com unidades incompatíveis', input: { ...valid, unitsMatch: false }, mustBlock: true },
    { id: 'original', label: 'Caso D · documento original ausente', input: { ...valid, hasSource: false }, mustBlock: true },
    { id: 'consent', label: 'Caso E · sem autorização', input: { ...valid, authorized: false }, mustBlock: true },
    { id: 'paused', label: 'Caso F · acompanhamento pausado', input: { ...valid, paused: true }, mustBlock: true },
    { id: 'isolation', label: 'Caso G · dados de outro paciente', input: { ...valid, ownPatient: false }, mustBlock: true },
  ];
  const cases = draft.candidate.modules.flatMap((module) => fixtures.map((fixture) => {
    const before = evaluatePolicyCase(candidateOf(active), module.id, fixture.input);
    const after = evaluatePolicyCase(draft.candidate, module.id, fixture.input);
    const shouldBlock = fixture.mustBlock && !(fixture.id === 'pending' && module.id === 'exam_ingestion')
      && !(fixture.id === 'units' && !module.allowedCapabilityIds.includes('compare_confirmed_data'));
    return { id: `${module.id}-${fixture.id}`, label: `${module.label} — ${fixture.label}`,
      before: before.reason, after: after.reason, passed: !shouldBlock || !after.allowed };
  }));
  const blockers = policyBlockers(draft.candidate);
  const changes = draft.candidate.modules.flatMap((module) => {
    const old = active.modules.find((item) => item.id === module.id);
    return JSON.stringify(old) === JSON.stringify(module) ? [] : [`${module.label}: objetivo, diretriz ou disponibilidade alterados.`];
  });
  if (JSON.stringify(active.knowledgeSources) !== JSON.stringify(draft.candidate.knowledgeSources)) changes.push('Biblioteca de fontes alterada; a versão vigente mantém sua cópia original.');
  if (JSON.stringify(active.dataConnections) !== JSON.stringify(draft.candidate.dataConnections)) changes.push('Categorias de dados permitidas alteradas.');
  if (JSON.stringify(active.capabilities) !== JSON.stringify(draft.candidate.capabilities)) changes.push('Tarefas permitidas alteradas.');
  return { id: crypto.randomUUID(), fingerprint: draft.fingerprint, baseVersion: active.version, suiteVersion: 'policy-safety-v1',
    createdAt: new Date().toISOString(), createdBy: actor, passed: blockers.length === 0 && cases.every((item) => item.passed),
    blockers, changes, cases };
}
