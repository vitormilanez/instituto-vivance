import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { resetDatabase } from './helpers/d1';
import { listSynthesisVersions, saveSynthesisVersion, synthesisAccess } from '../app/lib/clinical-synthesis';
import { parseSynthesisContent, parseSynthesisSave, type SynthesisSaveInput } from '../app/lib/clinical-synthesis-contract';
import { getClinicalChangeDemo } from '../app/components/clinical-change-demo-data';
import type { AppUser } from '../app/lib/auth';
import { mutatePolicy, readPolicy } from '../app/lib/clinical-policy';

const doctor: AppUser = { id: 'doctor', username: 'doctor', displayName: 'Dr. Teste', role: 'professional', patientId: null };
function input(baseVersion = 0): SynthesisSaveInput {
  const points = getClinicalChangeDemo('pac-demo-001')!.draft.points;
  return {
    patientId: 'pac-demo-001', encounterId: 'enc-demo-002', requestId: crypto.randomUUID(), baseVersion,
    content: JSON.stringify({ draftText: 'Síntese fictícia revisada pelo médico.\nConferir relato e fontes na consulta.', selectedPointIds: points.map((point) => point.id) }),
    sourceIds: [...new Set(points.flatMap((point) => point.sourceIds))],
    governance: { moduleId: 'clinical_synthesis', moduleLabel: 'Síntese clínica', configurationVersion: 3,
      knowledgeSourceId: 'demo', knowledgeReference: 'Protocolo demonstrativo', knowledgeVersion: '1', sourceFingerprint: 'demo:1',
      governedAt: '6 set 2026', governedAtIso: '2026-09-06T00:00:00Z' },
  };
}
beforeEach(resetDatabase);

test('salvar, sair e recuperar preserva texto, pontos, fontes e autoria integralmente', async () => {
  const draft = input();
  assert.ok(parseSynthesisSave(draft));
  const access = await synthesisAccess(doctor, draft.patientId, draft.encounterId);
  assert.equal(access?.id, 'relationship');
  const saved = await saveSynthesisVersion(doctor, access!.id, draft);
  assert.ok('artifact' in saved);
  const recovered = (await listSynthesisVersions(access!.id, draft.encounterId))[0];
  assert.equal(recovered.content, draft.content);
  assert.deepEqual(recovered.sourceIds, draft.sourceIds);
  assert.equal(recovered.createdBy, doctor.displayName);
  assert.equal(recovered.status, 'reviewed');
  assert.equal(recovered.version, 1);
  assert.equal(recovered.contentFingerprint.length, 64);
  assert.equal(recovered.governance.knowledgeSourceId, 'knowledge-viv-clin-03');
  assert.notEqual(recovered.governance.sourceFingerprint, draft.governance.sourceFingerprint);
  assert.equal(recovered.governance.sourceFingerprint.length, 64);
  assert.ok(parseSynthesisContent(recovered.content));
});

test('reenvio da mesma tentativa não duplica versão; conteúdo diferente é rejeitado', async () => {
  const draft = input();
  await saveSynthesisVersion(doctor, 'relationship', draft);
  assert.ok('artifact' in await saveSynthesisVersion(doctor, 'relationship', draft));
  const changed = { ...draft, content: draft.content.replace('Conferir', 'Reavaliar') };
  const result = await saveSynthesisVersion(doctor, 'relationship', changed);
  assert.ok('error' in result && result.status === 409);
  assert.equal((await listSynthesisVersions('relationship', draft.encounterId)).length, 1);
});

test('duas edições concorrentes não sobrescrevem uma revisão; histórico é preservado', async () => {
  const first = input();
  const results = await Promise.all([saveSynthesisVersion(doctor, 'relationship', first), saveSynthesisVersion(doctor, 'relationship', input())]);
  assert.equal(results.filter((result) => 'artifact' in result).length, 1);
  assert.equal(results.filter((result) => 'error' in result && result.status === 409).length, 1);
  await saveSynthesisVersion(doctor, 'relationship', input(1));
  const history = await listSynthesisVersions('relationship', first.encounterId);
  assert.deepEqual(history.map((artifact) => artifact.version), [2, 1]);
});

test('paciente, outro médico e outro acompanhamento não acessam a síntese privada', async () => {
  const patient: AppUser = { id: 'patient', username: 'patient', displayName: 'Marina fictícia', role: 'patient', patientId: 'pac-demo-001' };
  assert.equal(await synthesisAccess(patient, 'pac-demo-001', 'enc-demo-002'), null);
  assert.equal(await synthesisAccess({ ...doctor, id: 'other-doctor' }, 'pac-demo-001', 'enc-demo-002'), null);
  assert.equal(await synthesisAccess(doctor, 'pac-demo-002', 'enc-demo-002'), null);
  assert.equal(await synthesisAccess(doctor, 'pac-demo-001', 'enc-demo-001'), null);
});

test('metadados legados sem texto não se tornam uma síntese recuperada', () => {
  assert.equal(parseSynthesisContent(undefined), null);
  assert.equal(parseSynthesisContent('{broken'), null);
  assert.equal(parseSynthesisContent(JSON.stringify({ draftText: ' ', selectedPointIds: ['a'] })), null);
  assert.equal(parseSynthesisSave({ ...input(), baseVersion: -1 }), null);
});

test('pontos ou fontes de outro caso não podem sustentar esta revisão', async () => {
  const invalid = input();
  invalid.sourceIds = ['another-patient-source'];
  const result = await saveSynthesisVersion(doctor, 'relationship', invalid);
  assert.ok('error' in result && result.status === 400);
  assert.equal((await listSynthesisVersions('relationship', invalid.encounterId)).length, 0);
});

test('pausar IA bloqueia nova síntese, sem ocultar a revisão médica já salva', async () => {
  const original = input();
  const first = await saveSynthesisVersion(doctor, 'relationship', original);
  assert.ok('artifact' in first);
  await mutatePolicy(doctor, { action: 'pause', relationshipId: 'relationship', revision: 0, paused: true });
  const result = await saveSynthesisVersion(doctor, 'relationship', input(1));
  assert.ok('error' in result && result.status === 403);
  assert.ok('artifact' in await saveSynthesisVersion(doctor, 'relationship', original));
  assert.equal((await listSynthesisVersions('relationship', original.encounterId)).length, 1);
});

test('publicação de nova política exige atualização do editor e preserva a governança histórica', async () => {
  const original = input();
  await saveSynthesisVersion(doctor, 'relationship', original);
  let view = await readPolicy(doctor);
  view.workspace.draft.candidate.modules[0].feedbackGoal = 'Preservar a fonte e explicitar os campos ausentes.';
  view = await mutatePolicy(doctor, { action: 'save', revision: view.workspace.revision, candidate: view.workspace.draft.candidate, note: 'Mais clareza sobre campos ausentes.' });
  view = await mutatePolicy(doctor, { action: 'test', revision: view.workspace.revision });
  view = await mutatePolicy(doctor, { action: 'approve', revision: view.workspace.revision, acknowledged: true });
  await mutatePolicy(doctor, { action: 'publish', revision: view.workspace.revision });
  const stale = await saveSynthesisVersion(doctor, 'relationship', input(1));
  assert.ok('error' in stale && stale.status === 409);
  const fresh = input(1); fresh.governance.configurationVersion = 4;
  assert.ok('artifact' in await saveSynthesisVersion(doctor, 'relationship', fresh));
  const history = await listSynthesisVersions('relationship', original.encounterId);
  assert.deepEqual(history.map((item) => item.governance.configurationVersion), [4, 3]);
});
