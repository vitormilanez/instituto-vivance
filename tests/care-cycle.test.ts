import assert from 'node:assert/strict';
import { beforeEach,test } from 'node:test';
import type { CareCheckIn,CarePlanVersion } from '../app/components/care-demo-types';
import type { AppUser } from '../app/lib/auth';
import { careAccess,loadCycle,mutateCycle,seedCycle,transitionCycle } from '../app/lib/care-cycle';
import { patientCycleView,validCycleMutation,type CareSubmission,type CycleCommand,type CycleMutation } from '../app/lib/care-cycle-contract';
import { MAX_CARE_FILE_BYTES,readCareFile,storeCareFile,validateCareFile } from '../app/lib/care-files';
import { getD1,resetDatabase } from './helpers/d1';

const doctor: AppUser = { id: 'doctor', username: 'doctor', displayName: 'Dr. Teste', role: 'professional', patientId: null };
const patient: AppUser = { id: 'patient', username: 'patient', displayName: 'Marina fictícia', role: 'patient', patientId: 'pac-demo-001' };
const patientId = 'pac-demo-001', encounterId = 'enc-demo-002';
const checkIn = { energy: 3, sleepQuality: 'regular', newSymptom: false, originalText: 'Relato fictício: consegui organizar os horários nesta semana.', aiAssistanceAllowed: false };
const submission = { kind: 'text', title: 'Minha semana fictícia', originalText: 'Consegui organizar melhor os horários. Gostaria de conversar sobre as dificuldades.', confirmed: true };
function command(name: CycleCommand, args: unknown[], revision = 0): CycleMutation {
  return { patientId, encounterId, command: name, args, revision, requestId: crypto.randomUUID() };
}
async function current() { return (await loadCycle((await careAccess(doctor, patientId))[0])).cycle; }
async function act(user: AppUser, name: CycleCommand, args: unknown[]) { return mutateCycle(user, command(name, args, (await current()).revision)); }
beforeEach(resetDatabase);

test('novo check-in e leitura médica persistem entre perfis e leituras do banco', async () => {
  const sent = await act(patient, 'submitCheckIn', [checkIn]);
  const saved = sent.result as CareCheckIn;
  assert.equal(saved.originalText, checkIn.originalText);
  assert.deepEqual(saved.aiSummary, []);
  assert.equal((await current()).care.checkIns.at(-1)?.id, saved.id);
  await act(doctor, 'reviewCheckIn', [saved.id]);
  const patientView = patientCycleView(await current());
  assert.ok(patientView.care.checkInReviews.some((item) => item.checkInId === saved.id));
});

test('paciente não aprova nem publica; médicos não enviam relatos em nome da paciente', async () => {
  await assert.rejects(act(patient, 'startCarePlan', [null]), { status: 403 });
  await assert.rejects(act(doctor, 'submitCheckIn', [checkIn]), { status: 403 });
  await assert.rejects(mutateCycle({ ...doctor, id: 'another-doctor' }, command('startCarePlan', [null])), { status: 403 });
  await assert.rejects(mutateCycle(patient, { ...command('submitCheckIn', [checkIn]), patientId: 'pac-demo-002' }), { status: 403 });
  await assert.rejects(mutateCycle(patient, { ...command('submitCheckIn', [checkIn]), encounterId: 'enc-demo-001' }), { status: 403 });
});

test('rascunho e aprovado ficam privados; só publicar libera a mesma versão à paciente', async () => {
  const open = await act(doctor, 'createCarePlanRevision', [null]);
  const draft = open.result as CarePlanVersion;
  assert.equal(draft.status, 'draft');
  assert.ok(!patientCycleView(await current()).care.carePlans.some((item) => item.id === draft.id));
  const edited = (await act(doctor, 'saveCarePlan', [draft.id, {
    title: 'Plano fictício para o próximo ciclo', objective: 'Organizar os próximos registros para conversar durante o retorno.',
    actions: [{ id: 'action-review', title: 'Anotar dúvidas para o retorno', cadence: 'Antes da consulta', active: true, sourceItemId: null }],
    sourceClosureId: null, sourceClosureVersion: null, sourceReviewId: null, sourceItemIds: [], sourceMode: 'manual',
  }, draft.updatedAtIso])).result as CarePlanVersion;
  const approved = (await act(doctor, 'approveCarePlan', [edited.id, edited.updatedAtIso])).result as CarePlanVersion;
  assert.equal(approved.approvedBy, doctor.displayName);
  assert.ok(!patientCycleView(await current()).care.carePlans.some((item) => item.id === draft.id));
  const published = (await act(doctor, 'publishCarePlan', [approved.id, approved.updatedAtIso])).result as CarePlanVersion;
  assert.equal(patientCycleView(await current()).care.carePlans.find((item) => item.status === 'published')?.id, published.id);
  await assert.rejects(act(doctor, 'saveCarePlan', [published.id, { title: 'Sobrescrever publicado' }, published.updatedAtIso]));
  await act(patient, 'confirmCarePlanAction', [published.id, 'action-review', true]);
  assert.ok((await current()).care.actionConfirmations.some((item) => item.planId === published.id && item.completed));
});

test('duas edições do plano não sobrescrevem o rascunho aberto em outra sessão', async () => {
  const draft = (await act(doctor, 'createCarePlanRevision', [null])).result as CarePlanVersion;
  await act(doctor, 'saveCarePlan', [draft.id, { title: 'Primeira edição fictícia' }, draft.updatedAtIso]);
  await assert.rejects(act(doctor, 'saveCarePlan', [draft.id, { title: 'Segunda edição perdida' }, draft.updatedAtIso]), { status: 409 });
  assert.equal((await current()).care.carePlans.find((item) => item.id === draft.id)?.title, 'Primeira edição fictícia');
  await assert.rejects(act(doctor, 'saveCarePlan', [draft.id, { status: 'published' }, draft.updatedAtIso]));
});

test('reenvio idempotente não duplica; edição concorrente perde sem sobrescrever dados', async () => {
  const first = command('submitInformation', [submission]);
  assert.ok(validCycleMutation(first));
  const saved = await mutateCycle(patient, first);
  const retry = await mutateCycle(patient, first);
  assert.equal((saved.result as CareSubmission).id, (retry.result as CareSubmission).id);
  assert.equal((await current()).submissions.length, 1);
  await assert.rejects(mutateCycle(patient, { ...first, args: [{ ...submission, originalText: 'Outro texto' }] }), { status: 409 });
  const revision = (await current()).revision;
  const both = await Promise.allSettled([
    mutateCycle(patient, command('submitInformation', [submission], revision)),
    mutateCycle(patient, command('submitInformation', [submission], revision)),
  ]);
  assert.equal(both.filter((item) => item.status === 'fulfilled').length, 1);
  const rejected = both.find((item) => item.status === 'rejected');
  assert.equal(rejected?.status === 'rejected' && rejected.reason.status, 409);
  assert.equal((await current()).submissions.length, 2);
});

test('duas cópias simultâneas da mesma tentativa recuperam um único recibo', async () => {
  const attempt = command('submitInformation', [submission]);
  const [first, second] = await Promise.all([mutateCycle(patient, attempt), mutateCycle(patient, attempt)]);
  assert.equal((first.result as CareSubmission).id, (second.result as CareSubmission).id);
  assert.equal((await current()).submissions.length, 1);
});

test('originais são imutáveis, revisão é privada e retorno exige publicação explícita', async () => {
  const received = (await act(patient, 'submitInformation', [submission])).result as CareSubmission;
  const reviewed = (await act(doctor, 'reviewInformation', [{ id: received.id, reviewVersion: 0, reviewText: 'Conferi o relato e a origem fictícia. Há pontos a conversar no retorno.', feedbackDraft: 'Recebemos seu relato. As dúvidas serão conversadas no retorno.', originalText: 'Não pode substituir a origem' }])).result as CareSubmission;
  const view = patientCycleView(await current()).submissions[0];
  assert.equal(view.status, 'reviewed');
  assert.equal(view.originalText, submission.originalText);
  assert.equal(view.reviewText, null); assert.equal(view.feedbackDraft, null); assert.equal(view.publishedFeedback, null);
  await assert.rejects(act(doctor, 'reviewInformation', [{ id: received.id, reviewVersion: 0, reviewText: 'Revisão desatualizada' }]), { status: 409 });
  await assert.rejects(act(patient, 'publishFeedback', [{ id: received.id, reviewVersion: 1 }]), { status: 403 });
  await act(doctor, 'publishFeedback', [{ id: received.id, reviewVersion: reviewed.reviewVersion }]);
  assert.equal(patientCycleView(await current()).submissions[0].publishedFeedback, reviewed.feedbackDraft);
  await assert.rejects(act(doctor, 'reviewInformation', [{ id: received.id, reviewVersion: 1, reviewText: 'Alterar retorno publicado' }]), { status: 409 });
});

test('correção de exame preserva valores brutos, referência e página de origem', () => {
  const cycle = seedCycle(patientId, encounterId);
  const exam = cycle.exams.find((item) => item.reviewStatus === 'awaiting_review')!;
  assert.ok(exam?.fields.length);
  const original = structuredClone(exam.fields);
  const fields = original.map((item) => ({ ...item, value: item.included ? '12,0' : item.value, rawValue: '9999', sourcePage: 99, referenceRange: 'Fonte inventada' }));
  const { next } = transitionCycle(cycle, doctor, command('approveExam', [{ examId: exam.id, fields }]));
  const revised = next.exams.find((item) => item.id === exam.id)!;
  assert.equal(revised.reviewStatus, 'approved');
  revised.fields.forEach((item, index) => {
    assert.equal(item.rawValue, original[index].rawValue);
    assert.equal(item.referenceRange, original[index].referenceRange);
    assert.equal(item.sourcePage, original[index].sourcePage);
  });
});

test('arquivos privados exigem confirmação e vínculo; bytes originais são recuperáveis', async () => {
  const content = new TextEncoder().encode('%PDF-1.7\nDocumento de teste fictício.');
  const file = await storeCareFile(patient, patientId, encounterId, new File([content], 'exame-ficticio.pdf', { type: 'application/pdf' }));
  assert.equal(file.size, content.length);
  await assert.rejects(readCareFile(doctor, file.id), { status: 404 });
  await act(patient, 'submitInformation', [{ ...submission, kind: 'pdf', category: 'exam', attachmentId: file.id }]);
  const retrieved = await readCareFile(doctor, file.id);
  assert.deepEqual(new Uint8Array(await new Response(retrieved.object.body).arrayBuffer()), content);
  assert.equal((await current()).exams.at(-1)?.examDate, '');
  assert.equal((await current()).exams.at(-1)?.fields.length, 0);
  const received = (await current()).submissions.at(-1)!;
  await act(doctor, 'reviewInformation', [{ id: received.id, reviewVersion: 0, reviewText: 'Original fictício conferido manualmente.', feedbackDraft: '' }]);
  assert.equal((await current()).exams.at(-1)?.reviewStatus, 'approved');
  assert.equal(patientCycleView(await current()).submissions.at(-1)?.status, 'reviewed');
  await assert.rejects(readCareFile({ ...doctor, id: 'other-doctor' }, file.id), { status: 404 });
  await getD1().prepare("UPDATE care_relationships SET status = ? WHERE id = ?").bind('inactive', 'relationship').run();
  await assert.rejects(readCareFile(patient, file.id), { status: 404 });
});

test('não aceita arquivo disfarçado, excesso, conteúdo sem confirmação ou documento de outra pessoa', async () => {
  assert.throws(() => validateCareFile('foto.png', 'image/png', new TextEncoder().encode('<svg onload=alert(1)>')));
  assert.throws(() => validateCareFile('relatorio.html', 'application/pdf', new TextEncoder().encode('%PDF-1.7 fake')));
  assert.throws(() => validateCareFile('exame.pdf', 'application/pdf', new Uint8Array(MAX_CARE_FILE_BYTES + 1)));
  await assert.rejects(act(patient, 'submitInformation', [{ ...submission, confirmed: false }]));
  await assert.rejects(act(patient, 'submitInformation', [{ ...submission, kind: 'pdf', attachmentId: 'not-their-file' }]), { status: 403 });
  await assert.rejects(storeCareFile(doctor, patientId, encounterId, new File(['test'], 'x.pdf')), { status: 403 });
});
