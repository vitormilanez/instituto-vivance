import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { getD1, resetDatabase } from './helpers/d1';
import { governedPolicy, mutatePolicy, readPatientPolicy, readPolicy } from '../app/lib/clinical-policy';
import { initialCandidate, mergePolicyView, parsePolicyCommand } from '../app/lib/clinical-policy-contract';
import type { AppUser } from '../app/lib/auth';

const doctor: AppUser = { id: 'doctor', username: 'doctor', displayName: 'Dr. Teste', role: 'professional', patientId: null };
const patient: AppUser = { id: 'patient', username: 'patient', displayName: 'Marina fictícia', role: 'patient', patientId: 'pac-demo-001' };
beforeEach(resetDatabase);
async function saveChange() {
  const view = await readPolicy(doctor);
  const candidate = structuredClone(view.workspace.draft.candidate);
  candidate.modules.find((item) => item.id === 'clinical_synthesis')!.feedbackGoal = 'Explicitar fontes, lacunas e perguntas para revisão na consulta.';
  return mutatePolicy(doctor, { action: 'save', revision: view.workspace.revision, candidate, note: 'Melhorar a apresentação das lacunas.' });
}

test('política compartilhada recupera rascunho sem modificar a configuração vigente', async () => {
  const original = await readPolicy(doctor);
  const saved = await saveChange();
  const recovered = await readPolicy(doctor);
  assert.deepEqual(recovered.workspace, saved.workspace);
  assert.deepEqual(recovered.workspace.active, original.workspace.active);
  assert.equal(recovered.workspace.draft.baseVersion, 3);
  assert.equal(recovered.patients.length, 1);
});

test('publicação exige comparação exata e aprovação; versões antigas e fontes são imutáveis', async () => {
  const original = (await readPolicy(doctor)).workspace.active;
  let view = await saveChange();
  await assert.rejects(mutatePolicy(doctor, { action: 'publish', revision: view.workspace.revision }), /Teste a versão/u);
  view = await mutatePolicy(doctor, { action: 'test', revision: view.workspace.revision });
  assert.equal(view.workspace.draft.comparison?.cases.length, 35);
  assert.equal(view.workspace.draft.comparison?.passed, true);
  await assert.rejects(mutatePolicy(doctor, { action: 'publish', revision: view.workspace.revision }), /Aprovação médica/u);
  view = await mutatePolicy(doctor, { action: 'approve', revision: view.workspace.revision, acknowledged: true });
  assert.equal(view.workspace.active.version, 3);
  view = await mutatePolicy(doctor, { action: 'publish', revision: view.workspace.revision });
  assert.equal(view.workspace.active.version, 4);
  assert.equal(view.workspace.active.approval?.actorId, doctor.id);
  assert.equal(view.workspace.active.comparison?.fingerprint, view.workspace.active.fingerprint);
  assert.deepEqual(view.history.find((version) => version.version === 3), original);
  assert.equal(view.workspace.draft.approval, null);
});

test('editar depois de testar/aprovar invalida comparação e aprovação', async () => {
  let view = await saveChange();
  view = await mutatePolicy(doctor, { action: 'test', revision: view.workspace.revision });
  view = await mutatePolicy(doctor, { action: 'approve', revision: view.workspace.revision, acknowledged: true });
  view = await mutatePolicy(doctor, { action: 'save', revision: view.workspace.revision, candidate: view.workspace.draft.candidate, note: 'Motivo revisado.' });
  assert.equal(view.workspace.draft.comparison, null);
  assert.equal(view.workspace.draft.approval, null);
  await assert.rejects(mutatePolicy(doctor, { action: 'publish', revision: view.workspace.revision }), /Teste a versão/u);
});

test('edições concorrentes não sobrescrevem rascunhos e reenvio de publicação não duplica versão', async () => {
  const view = await readPolicy(doctor);
  const results = await Promise.allSettled([
    mutatePolicy(doctor, { action: 'save', revision: 0, candidate: view.workspace.draft.candidate, note: 'Edição A' }),
    mutatePolicy(doctor, { action: 'save', revision: 0, candidate: view.workspace.draft.candidate, note: 'Edição B' }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  let current = await saveChange();
  current = await mutatePolicy(doctor, { action: 'test', revision: current.workspace.revision });
  current = await mutatePolicy(doctor, { action: 'approve', revision: current.workspace.revision, acknowledged: true });
  const revision = current.workspace.revision;
  const published = await Promise.allSettled([mutatePolicy(doctor, { action: 'publish', revision }), mutatePolicy(doctor, { action: 'publish', revision })]);
  assert.equal(published.filter((result) => result.status === 'fulfilled').length, 1);
  assert.deepEqual((await readPolicy(doctor)).history.map((item) => item.version), [4, 3]);
});

test('fonte indisponível ou dado obrigatório desligado bloqueiam publicação', async () => {
  const view = await readPolicy(doctor);
  view.workspace.draft.candidate.knowledgeSources[0].status = 'paused';
  let next = await mutatePolicy(doctor, { action: 'save', revision: 0, candidate: view.workspace.draft.candidate, note: 'Revisar fonte.' });
  next = await mutatePolicy(doctor, { action: 'test', revision: next.workspace.revision });
  assert.equal(next.workspace.draft.comparison?.passed, false);
  assert.ok(next.workspace.draft.comparison!.blockers.length > 0);
  await assert.rejects(mutatePolicy(doctor, { action: 'approve', revision: next.workspace.revision, acknowledged: true }), /Teste a versão/u);
  assert.equal((await governedPolicy(doctor, 'relationship', 'clinical_synthesis', 3)).governance.knowledgeSourceId, 'knowledge-viv-clin-03');
});

test('cliente não pode remover limites fixos, forjar resultados de teste ou autoria', async () => {
  const candidate = initialCandidate();
  Object.assign(candidate.modules[0], { requiresMedicalReview: false, blockingConditions: [], requiredDataConnectionIds: [] });
  const parsed = parsePolicyCommand({ action: 'save', revision: 0, candidate, note: 'Teste de limites.' });
  assert.ok(parsed?.action === 'save');
  assert.equal(parsed.candidate.modules[0].requiresMedicalReview, true);
  assert.ok(parsed.candidate.modules[0].blockingConditions.length);
  assert.ok(parsed.candidate.modules[0].requiredDataConnectionIds.length);
  assert.equal(parsePolicyCommand({ action: 'approve', revision: 0, acknowledged: false }), null);
  const updated = await saveChange();
  const saved = await mutatePolicy(doctor, { action: 'save', revision: updated.workspace.revision,
    candidate: updated.workspace.draft.candidate, note: 'Tentativa de forjar teste.', comparison: { passed: true }, approval: { actorId: 'fake' } });
  assert.equal(saved.workspace.draft.comparison, null);
  await assert.rejects(mutatePolicy(doctor, { action: 'publish', revision: saved.workspace.revision }), /Teste a versão/u);
});

test('pausa é compartilhada, afeta apenas o paciente e impede nova governança no servidor', async () => {
  const original = await readPolicy(doctor);
  const next = await mutatePolicy(doctor, { action: 'pause', relationshipId: 'relationship', revision: 0, paused: true });
  assert.equal(next.patients[0].paused, true);
  assert.deepEqual(next.workspace.active, original.workspace.active);
  await assert.rejects(governedPolicy(doctor, 'relationship', 'clinical_synthesis', 3), /IA indisponível/u);
  const patientView = await readPatientPolicy(patient);
  assert.equal(patientView.patients[0].paused, true);
  await mutatePolicy(doctor, { action: 'pause', relationshipId: 'relationship', revision: 1, paused: false });
  const governed = await governedPolicy(doctor, 'relationship', 'clinical_synthesis', 3);
  assert.equal(governed.governance.sourceFingerprint.length, 64);
  await assert.rejects(governedPolicy(doctor, 'relationship', 'clinical_synthesis', 4), /política vigente mudou/u);
});

test('paciente e médico não membro não acessam nem editam a Central; paciente só recebe seu contexto publicado', async () => {
  await assert.rejects(readPolicy(patient), /exclusiva/u);
  await assert.rejects(mutatePolicy(patient, { action: 'test', revision: 0 }), /exclusiva/u);
  await assert.rejects(readPolicy({ ...doctor, id: 'other' }), /não tem acesso/u);
  await saveChange();
  const scoped = await readPatientPolicy(patient);
  assert.deepEqual(scoped.patients.map((item) => item.patientId), ['pac-demo-001']);
  assert.equal('workspace' in scoped, false);
  assert.equal(scoped.active?.approval, null);
  assert.equal(scoped.active?.comparison, null);
  const stranger = await readPatientPolicy({ ...patient, id: 'other-patient' });
  assert.deepEqual(stranger.patients, []);
  assert.equal(stranger.active, null);
});

test('revogar autorização no banco não pode ser desfeito pelo botão de retomar IA', async () => {
  await getD1().prepare('UPDATE clinical_patient_permissions SET authorized = 0 WHERE relationship_id = ?').bind('relationship').run();
  await assert.rejects(mutatePolicy(doctor, { action: 'pause', relationshipId: 'relationship', revision: 0, paused: false }), /Autorização ausente/u);
  await assert.rejects(governedPolicy(doctor, 'relationship', 'clinical_synthesis', 3), /IA indisponível/u);
});

test('módulo desligado na publicação bloqueia uso, mantendo o histórico anterior', async () => {
  let view = await readPolicy(doctor);
  view.workspace.draft.candidate.modules.find((module) => module.id === 'clinical_synthesis')!.enabled = false;
  view = await mutatePolicy(doctor, { action: 'save', revision: 0, candidate: view.workspace.draft.candidate, note: 'Pausar síntese para revisão da clínica.' });
  view = await mutatePolicy(doctor, { action: 'test', revision: view.workspace.revision });
  view = await mutatePolicy(doctor, { action: 'approve', revision: view.workspace.revision, acknowledged: true });
  await mutatePolicy(doctor, { action: 'publish', revision: view.workspace.revision });
  await assert.rejects(governedPolicy(doctor, 'relationship', 'clinical_synthesis', 4), /módulo está desligado/u);
  assert.equal((await readPolicy(doctor)).history[1].modules.find((module) => module.id === 'clinical_synthesis')?.enabled, true);
});

test('resposta atrasada não desfaz pausa confirmada nem reduz a revisão da Central', async () => {
  const previous = await readPolicy(doctor);
  const paused = await mutatePolicy(doctor, { action: 'pause', relationshipId: 'relationship', revision: 0, paused: true });
  const saved = await saveChange();
  const merged = mergePolicyView(saved, previous);
  assert.equal(merged.workspace.revision, saved.workspace.revision);
  assert.equal(merged.patients[0].paused, true);
  assert.equal(mergePolicyView(paused, previous).patients[0].revision, 1);
  assert.deepEqual(mergePolicyView(paused, { ...previous, patients: [] }).patients, []);
});
