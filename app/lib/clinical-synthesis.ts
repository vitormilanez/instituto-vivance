import { getD1 } from '@/db';
import type { AppUser } from './auth';
import { getDefaultEncounterId } from '../components/demo-routes';
import { getClinicalChangeDemo } from '../components/clinical-change-demo-data';
import { parseSynthesisContent, synthesisFingerprint, type SavedSynthesis, type SynthesisSaveInput } from './clinical-synthesis-contract';
import { governedPolicy, PolicyError } from './clinical-policy';

export async function synthesisAccess(user: AppUser, patientId: string, encounterId: string) {
  // Reviewed working notes are private to the responsible physician, not published advice.
  if (user.role !== 'professional' || encounterId !== getDefaultEncounterId(patientId)) return null;
  return getD1().prepare(`SELECT id FROM care_relationships
    WHERE patient_profile_id = ? AND professional_user_id = ? AND status = 'active' LIMIT 1`)
    .bind(patientId, user.id).first<{ id: string }>();
}

export async function listSynthesisVersions(relationshipId: string, encounterId: string) {
  const rows = await getD1().prepare(`SELECT artifact FROM clinical_synthesis_versions
    WHERE relationship_id = ? AND encounter_id = ? ORDER BY version DESC LIMIT 100`)
    .bind(relationshipId, encounterId).all<{ artifact: string }>();
  return rows.results.map((row) => JSON.parse(row.artifact) as SavedSynthesis);
}

export async function saveSynthesisVersion(user: AppUser, relationshipId: string, input: SynthesisSaveInput) {
  const access = await synthesisAccess(user, input.patientId, input.encounterId);
  if (access?.id !== relationshipId) return { error: 'Acompanhamento indisponível.', status: 403 } as const;
  const content = parseSynthesisContent(input.content)!;
  const summary = getClinicalChangeDemo(input.patientId);
  const selectedPoints = summary?.draft.points.filter((point) => content.selectedPointIds.includes(point.id)) ?? [];
  const sourceIds = [...new Set(selectedPoints.flatMap((point) => point.sourceIds))];
  if (selectedPoints.length !== content.selectedPointIds.length
    || sourceIds.length !== input.sourceIds.length || sourceIds.some((id) => !input.sourceIds.includes(id))) {
    return { error: 'Fontes ou pontos não pertencem à síntese deste paciente.', status: 400 } as const;
  }
  const database = getD1();
  const existing = await database.prepare(`SELECT relationship_id AS relationshipId, encounter_id AS encounterId, artifact
    FROM clinical_synthesis_versions WHERE created_by = ? AND request_id = ?`)
    .bind(user.id, input.requestId).first<{ relationshipId: string; encounterId: string; artifact: string }>();
  if (existing) {
    const artifact = JSON.parse(existing.artifact) as SavedSynthesis;
    return existing.relationshipId === relationshipId && existing.encounterId === input.encounterId
      && artifact.content === input.content && JSON.stringify(artifact.sourceIds) === JSON.stringify(sourceIds)
      ? { artifact } : { error: 'Esta tentativa já corresponde a outra revisão.', status: 409 } as const;
  }
  let policy;
  try { policy = await governedPolicy(user, relationshipId, 'clinical_synthesis', input.governance.configurationVersion); }
  catch (error) {
    if (error instanceof PolicyError) return { error: error.message, status: error.status };
    throw error;
  }
  const now = new Date();
  const createdAt = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(now);
  const artifact: SavedSynthesis = {
    id: crypto.randomUUID(), patientId: input.patientId, encounterId: input.encounterId,
    moduleId: 'clinical_synthesis', version: input.baseVersion + 1, status: 'reviewed',
    governance: policy.governance, sourceIds, content: input.content, persistence: 'd1',
    contentFingerprint: await synthesisFingerprint(input.content),
    createdAt, createdAtIso: now.toISOString(), createdBy: user.displayName,
  };
  // Compare and insert in one statement: a second editor cannot replace a newer version.
  const result = await database.prepare(`INSERT INTO clinical_synthesis_versions
    (id, relationship_id, patient_id, encounter_id, version, request_id, created_by, artifact, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE COALESCE((SELECT MAX(version) FROM clinical_synthesis_versions
      WHERE relationship_id = ? AND encounter_id = ?), 0) = ?
    AND EXISTS (SELECT 1 FROM clinical_policy_workspaces w JOIN clinical_policy_members m ON m.clinic_id = w.clinic_id
      WHERE w.clinic_id = ? AND w.active_version = ? AND m.user_id = ?)
    AND EXISTS (SELECT 1 FROM clinical_patient_permissions a JOIN care_relationships r ON r.id = a.relationship_id
      WHERE a.relationship_id = ? AND a.authorized = 1 AND a.paused = 0 AND a.revision = ?
      AND r.professional_user_id = ? AND r.status = 'active')`)
    .bind(artifact.id, relationshipId, input.patientId, input.encounterId, artifact.version,
      input.requestId, user.id, JSON.stringify(artifact), artifact.createdAtIso,
      relationshipId, input.encounterId, input.baseVersion, policy.clinicId, policy.governance.configurationVersion,
      user.id, relationshipId, policy.permissionRevision, user.id).run();
  return result.meta.changes === 1 ? { artifact }
    : { error: 'Há uma revisão mais recente. Seu texto foi preservado; recarregue a versão salva antes de tentar novamente.', status: 409 } as const;
}
