import { getD1 } from '@/db';
import type { AppUser } from './auth';
import { CLINIC_ID, initialActiveConfiguration, formatDateTime, createAuditEvent,
  type ClinicalAiModuleId, type ClinicalGovernanceSnapshot } from '../components/clinical-intelligence-model';
import { synthesisFingerprint } from './clinical-synthesis-contract';
import { candidateOf, comparePolicy, initialCandidate, parsePolicyCommand, policyBlockers,
  type PatientPolicyView, type PolicyPatient, type PolicyVersion, type PolicyView, type PolicyWorkspace } from './clinical-policy-contract';

export class PolicyError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const conflict = () => new PolicyError('A Central mudou em outra sessão. Seu rascunho foi preservado; confira a versão compartilhada antes de continuar.', 409);

export async function policyAccess(user: AppUser) {
  if (user.role !== 'professional') throw new PolicyError('A Central da IA é exclusiva dos médicos autorizados da clínica.', 403);
  const database = getD1();
  // Only the existing fictitious doctor is bootstrapped. Role alone never grants clinic membership.
  if (user.id === 'usr-dr-guilherme') {
    await database.prepare(`INSERT INTO clinical_policy_members (user_id, clinic_id)
      SELECT id, ? FROM users WHERE id = ? AND role = 'professional' AND status = 'active'
      ON CONFLICT(user_id) DO NOTHING`).bind(CLINIC_ID, user.id).run();
    await database.prepare(`INSERT INTO clinical_patient_permissions
      (relationship_id, authorized, paused, revision, updated_by, updated_at, basis)
      SELECT id, 1, 0, 0, professional_user_id, ?, ? FROM care_relationships
      WHERE id = 'care-dr-guilherme-marina' AND professional_user_id = ? AND status = 'active'
      ON CONFLICT(relationship_id) DO NOTHING`).bind(new Date().toISOString(),
      'Autorização fictícia do cenário Marina; não é registro de consentimento real.', user.id).run();
  }
  const membership = await database.prepare(`SELECT m.clinic_id AS clinicId FROM clinical_policy_members m
    JOIN users u ON u.id = m.user_id WHERE m.user_id = ? AND u.role = 'professional' AND u.status = 'active'`)
    .bind(user.id).first<{ clinicId: string }>();
  if (!membership) throw new PolicyError('Seu usuário não tem acesso à política desta clínica.', 403);
  return membership.clinicId;
}

async function ensureWorkspace(clinicId: string) {
  const exists = await getD1().prepare('SELECT clinic_id FROM clinical_policy_workspaces WHERE clinic_id = ?').bind(clinicId).first();
  if (exists) return;
  const candidate = initialCandidate();
  const fingerprint = await synthesisFingerprint(JSON.stringify(candidate));
  const active: PolicyVersion = { ...structuredClone(initialActiveConfiguration), knowledgeSources: candidate.knowledgeSources,
    fingerprint, note: 'Configuração inicial fictícia. Protocolos operacionais de demonstração, não diretrizes clínicas validadas.',
    approval: null, comparison: null };
  const initial: PolicyWorkspace = { clinicId, revision: 0, active,
    draft: { baseVersion: active.version, candidate, fingerprint, note: '', comparison: null, approval: null }, events: [] };
  // The initial snapshot is immutable too; concurrent first loads are idempotent.
  await getD1().batch([
    getD1().prepare(`INSERT INTO clinical_policy_workspaces (clinic_id, revision, active_version, data)
      VALUES (?, 0, ?, ?) ON CONFLICT(clinic_id) DO NOTHING`).bind(clinicId, active.version, JSON.stringify(initial)),
    getD1().prepare(`INSERT INTO clinical_policy_versions (clinic_id, version, snapshot)
      VALUES (?, ?, ?) ON CONFLICT(clinic_id, version) DO NOTHING`).bind(clinicId, active.version, JSON.stringify(active)),
  ]);
}

export async function readPatientPolicy(user: AppUser): Promise<PatientPolicyView> {
  if (user.role !== 'patient') throw new PolicyError('Contexto exclusivo do paciente.', 403);
  const result = await getD1().prepare(`SELECT r.id AS relationshipId, r.patient_profile_id AS patientId,
    p.display_name AS patientName, d.id AS doctorId, d.display_name AS doctorName, r.created_at AS connectedAt,
    COALESCE(a.authorized, 0) AS authorized, COALESCE(a.paused, 0) AS paused, COALESCE(a.revision, 0) AS revision,
    COALESCE(a.basis, 'Sem autorização registrada para IA.') AS basis, m.clinic_id AS clinicId
    FROM care_relationships r JOIN users p ON p.id = r.patient_user_id JOIN users d ON d.id = r.professional_user_id
    LEFT JOIN clinical_patient_permissions a ON a.relationship_id = r.id
    LEFT JOIN clinical_policy_members m ON m.user_id = d.id
    WHERE r.patient_user_id = ? AND r.patient_profile_id = ? AND r.status = 'active'`)
    .bind(user.id, user.patientId).first<PolicyPatient & { clinicId: string | null }>();
  if (!result) return { actorId: user.id, active: null, patients: [] };
  const { clinicId, ...patient } = result;
  // No draft, audit, approval details, comparison run or other patient's data is returned.
  const active = clinicId ? (await workspaceFor(clinicId)).active : null;
  return { actorId: user.id, active: active ? { ...active, note: '', comparison: null, approval: null } : null,
    patients: [{ ...patient, authorized: Boolean(patient.authorized), paused: Boolean(patient.paused) }] };
}
async function workspaceFor(clinicId: string) {
  await ensureWorkspace(clinicId);
  const row = await getD1().prepare('SELECT data FROM clinical_policy_workspaces WHERE clinic_id = ?')
    .bind(clinicId).first<{ data: string }>();
  if (!row) throw new PolicyError('Configuração indisponível.', 503);
  return JSON.parse(row.data) as PolicyWorkspace;
}

export async function readPolicy(user: AppUser): Promise<PolicyView> {
  const clinicId = await policyAccess(user);
  const workspace = await workspaceFor(clinicId);
  const [history, patients] = await Promise.all([
    getD1().prepare('SELECT snapshot FROM clinical_policy_versions WHERE clinic_id = ? ORDER BY version DESC')
      .bind(clinicId).all<{ snapshot: string }>(),
    getD1().prepare(`SELECT r.id AS relationshipId, r.patient_profile_id AS patientId, p.display_name AS patientName,
      d.id AS doctorId, d.display_name AS doctorName, r.created_at AS connectedAt,
      COALESCE(a.authorized, 0) AS authorized, COALESCE(a.paused, 0) AS paused, COALESCE(a.revision, 0) AS revision,
      COALESCE(a.basis, 'Sem autorização registrada para IA.') AS basis,
      (SELECT json_extract(s.artifact, '$.governance.configurationVersion') FROM clinical_synthesis_versions s
        WHERE s.relationship_id = r.id ORDER BY s.created_at DESC, s.version DESC LIMIT 1) AS lastAppliedVersion,
      (SELECT s.created_at FROM clinical_synthesis_versions s
        WHERE s.relationship_id = r.id ORDER BY s.created_at DESC, s.version DESC LIMIT 1) AS lastProcessedAtIso
      FROM care_relationships r JOIN users p ON p.id = r.patient_user_id JOIN users d ON d.id = r.professional_user_id
      LEFT JOIN clinical_patient_permissions a ON a.relationship_id = r.id
      WHERE r.professional_user_id = ? AND r.status = 'active'`).bind(user.id).all<PolicyPatient>(),
  ]);
  return { actorId: user.id, workspace,
    history: history.results.map((row) => JSON.parse(row.snapshot) as PolicyVersion),
    patients: patients.results.map((row) => ({ ...row, authorized: Boolean(row.authorized), paused: Boolean(row.paused) })) };
}

export async function mutatePolicy(user: AppUser, input: unknown) {
  const clinicId = await policyAccess(user);
  const command = parsePolicyCommand(input);
  if (!command) throw new PolicyError('Revise os campos da configuração e descreva o motivo da mudança.', 400);
  const database = getD1();
  if (command.action === 'pause') {
    const result = await database.prepare(`UPDATE clinical_patient_permissions SET paused = ?, revision = revision + 1,
      updated_by = ?, updated_at = ? WHERE relationship_id = ? AND revision = ? AND authorized = 1
      AND EXISTS (SELECT 1 FROM care_relationships r WHERE r.id = relationship_id AND r.professional_user_id = ? AND r.status = 'active')`)
      .bind(Number(command.paused), user.id, new Date().toISOString(), command.relationshipId, command.revision, user.id).run();
    if (result.meta.changes !== 1) throw new PolicyError('Autorização ausente, vínculo indisponível ou permissão alterada em outra sessão. Atualize a Central.', 409);
    return readPolicy(user);
  }
  const previous = await workspaceFor(clinicId);
  if (previous.revision !== command.revision) throw conflict();
  const next = structuredClone(previous);
  const now = new Date();
  let summary = '';
  if (command.action === 'save') {
    // Preserve unchanged source provenance; stamp changed sources with the authenticated actor.
    for (const source of command.candidate.knowledgeSources) {
      const existing = previous.draft.candidate.knowledgeSources.find((item) => item.id === source.id);
      const parsedExisting = existing ? parsePolicyCommand({ action: 'save', revision: 0,
        candidate: { ...command.candidate, knowledgeSources: [existing] }, note: 'compare' }) : null;
      const normalized = parsedExisting?.action === 'save' ? parsedExisting.candidate.knowledgeSources[0] : null;
      if (existing && JSON.stringify(normalized) === JSON.stringify(source)) Object.assign(source, existing);
      else Object.assign(source, { addedBy: existing?.addedBy ?? user.displayName, accessedAt: now.toISOString().slice(0, 10),
        updatedAt: formatDateTime(now), updatedAtIso: now.toISOString() });
    }
    const fingerprint = await synthesisFingerprint(JSON.stringify(command.candidate));
    next.draft = { baseVersion: next.active.version, candidate: command.candidate, note: command.note,
      fingerprint, comparison: null, approval: null };
    summary = 'Rascunho compartilhado salvo; testes e aprovação anteriores invalidados.';
  } else if (command.action === 'test') {
    if (!next.draft.note || next.draft.fingerprint === next.active.fingerprint) throw new PolicyError('Salve uma alteração e o motivo antes de comparar.', 400);
    next.draft.comparison = comparePolicy(next.active, next.draft, user.displayName);
    next.draft.approval = null;
    summary = 'Comparação determinística das regras executada em casos fictícios; não é validação clínica ou de modelo.';
  } else {
    const { comparison, fingerprint, baseVersion } = next.draft;
    if (!comparison?.passed || comparison.fingerprint !== fingerprint || comparison.baseVersion !== baseVersion
      || baseVersion !== next.active.version || policyBlockers(next.draft.candidate).length) {
      throw new PolicyError('Teste a versão exata do rascunho e resolva os bloqueios antes de aprovar ou publicar.', 409);
    }
    if (command.action === 'approve') {
      next.draft.approval = { fingerprint, testId: comparison.id, actorId: user.id, actorName: user.displayName, at: now.toISOString() };
      summary = 'Rascunho aprovado pelo médico; aguardando publicação explícita.';
    } else {
      if (!next.draft.approval || next.draft.approval.fingerprint !== fingerprint || next.draft.approval.testId !== comparison.id) {
        throw new PolicyError('Aprovação médica deste rascunho é obrigatória antes da publicação.', 409);
      }
      next.active = { ...next.draft.candidate, id: crypto.randomUUID(), version: next.active.version + 1, status: 'active',
        publishedAt: formatDateTime(now), publishedAtIso: now.toISOString(), publishedBy: user.displayName,
        fingerprint, note: next.draft.note, approval: next.draft.approval, comparison };
      next.draft = { baseVersion: next.active.version, candidate: candidateOf(next.active), fingerprint,
        note: '', comparison: null, approval: null };
      summary = `Política global v${next.active.version} publicada. Versões anteriores preservadas.`;
    }
  }
  next.revision += 1;
  next.events = [...next.events, createAuditEvent('configuration-saved', user.displayName, summary,
    `policy-revision-${next.revision}`, { configurationVersion: next.active.version })].slice(-100);
  const writes = [database.prepare(`UPDATE clinical_policy_workspaces SET revision = ?, active_version = ?, data = ?
    WHERE clinic_id = ? AND revision = ? AND EXISTS (SELECT 1 FROM clinical_policy_members m
      JOIN users u ON u.id = m.user_id WHERE m.clinic_id = ? AND m.user_id = ? AND u.status = 'active')`)
    .bind(next.revision, next.active.version, JSON.stringify(next), clinicId, previous.revision, clinicId, user.id)];
  if (command.action === 'publish') {
    // Conditional second statement, in the same transaction: a CAS loser cannot create a phantom version.
    writes.push(database.prepare(`INSERT INTO clinical_policy_versions (clinic_id, version, snapshot)
      SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM clinical_policy_workspaces
        WHERE clinic_id = ? AND revision = ? AND json_extract(data, '$.active.id') = ?)`)
      .bind(clinicId, next.active.version, JSON.stringify(next.active), clinicId, next.revision, next.active.id));
  }
  const result = await database.batch(writes);
  if (result[0].meta.changes !== 1) throw conflict();
  return readPolicy(user);
}

// All future generators must call this server boundary, never trust client-supplied governance.
export async function governedPolicy(user: AppUser, relationshipId: string, moduleId: ClinicalAiModuleId, expectedVersion: number) {
  const clinicId = await policyAccess(user);
  const permission = await getD1().prepare(`SELECT a.revision FROM clinical_patient_permissions a
    JOIN care_relationships r ON r.id = a.relationship_id WHERE a.relationship_id = ?
    AND r.professional_user_id = ? AND r.status = 'active' AND a.authorized = 1 AND a.paused = 0`)
    .bind(relationshipId, user.id).first<{ revision: number }>();
  if (!permission) throw new PolicyError('IA indisponível: vínculo, autorização ou pausa do acompanhamento.', 403);
  const workspace = await workspaceFor(clinicId);
  if (workspace.active.version !== expectedVersion) throw new PolicyError('A política vigente mudou. Atualize o contexto antes de salvar uma nova síntese.', 409);
  const modulePolicy = workspace.active.modules.find((item) => item.id === moduleId);
  if (!modulePolicy?.enabled || policyBlockers({ ...candidateOf(workspace.active), modules: [modulePolicy] }).length) {
    throw new PolicyError('Este módulo está desligado ou bloqueado pela política vigente.', 403);
  }
  const source = workspace.active.knowledgeSources.find((item) => item.id === modulePolicy.primaryKnowledgeSourceId)!;
  const now = new Date();
  const governance: ClinicalGovernanceSnapshot = {
    moduleId, moduleLabel: modulePolicy.label, configurationVersion: workspace.active.version,
    knowledgeSourceId: source.id, knowledgeReference: source.reference, knowledgeVersion: source.version,
    sourceFingerprint: await synthesisFingerprint(JSON.stringify(source)), governedAt: formatDateTime(now), governedAtIso: now.toISOString(),
  };
  return { governance, clinicId, permissionRevision: permission.revision };
}
