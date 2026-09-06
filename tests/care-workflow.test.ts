import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examReviewPresentation, selectExamIntake, selectCarePlans, publishedPlanLabel, selectConfirmedActionIds } from '../app/components/care-workflow';
import type { ClinicalExamDocument } from '../app/components/clinical-intelligence-context';
import type { CarePlanActionConfirmation, CarePlanVersion } from '../app/components/care-demo-types';

const exam = (id: string, reviewStatus: ClinicalExamDocument['reviewStatus'], date: string, patientId = 'marina') =>
  ({ id, patientId, reviewStatus, receivedAtIso: date, reviewVersion: reviewStatus === 'approved' ? 1 : 0 }) as ClinicalExamDocument;
const plan = (version: number, status: CarePlanVersion['status'], patientId = 'marina', encounterId = 'return') =>
  ({ id: `${patientId}-${version}`, version, status, patientId, encounterId }) as CarePlanVersion;

test('exame recebido prevalece sobre ausência de lembrete nos dois perfis', () => {
  const received = exam('september', 'awaiting_review', '2026-09-01T18:00:00Z');
  const intake = selectExamIntake([received], 'marina');
  assert.equal(intake.label, '1 em revisão médica');
  assert.equal(intake.canRemind, false);
  assert.equal(examReviewPresentation(received).label, 'Em revisão médica');
});

test('revisão aprovada muda o estado derivado sem fabricar novo envio', () => {
  const received = exam('september', 'approved', '2026-09-01T18:00:00Z');
  assert.equal(selectExamIntake([received], 'marina', true).label, 'Revisado · v1');
  assert.equal(selectExamIntake([received], 'marina').pendingCount, 0);
});

test('pendências não vazam entre pacientes; lembrete não equivale a recebimento', () => {
  const intake = selectExamIntake([exam('other', 'awaiting_review', '2026-09-05T00:00:00Z', 'ana')], 'marina', true);
  assert.equal(intake.latest, null);
  assert.equal(intake.pendingCount, 0);
  assert.equal(intake.label, 'Lembrete enviado · sem exame recebido');
});

test('datas com fusos diferentes são ordenadas pelo instante, sem mutar a origem', () => {
  const original = [exam('earlier', 'approved', '2026-09-05T12:00:00Z'), exam('later', 'awaiting_review', '2026-09-05T10:00:00-03:00')];
  assert.equal(selectExamIntake(original, 'marina').latest?.id, 'later');
  assert.equal(original[0].id, 'earlier');
});

test('rascunho v2 nunca substitui plano publicado v1 na visão da paciente', () => {
  const result = selectCarePlans([plan(2, 'draft'), plan(1, 'published'), plan(3, 'published', 'ana'), plan(4, 'published', 'marina', 'other')], 'marina', 'return');
  assert.equal(result.activeCarePlan?.version, 2);
  assert.equal(publishedPlanLabel(result.latestPublishedCarePlan), 'v1 publicado');
  assert.equal(result.carePlans.length, 2);
  assert.equal(publishedPlanLabel(null), 'Ainda não publicado');
});

test('desmarcar uma ação prevalece sobre a confirmação anterior, sem herdar outro plano', () => {
  const records = [
    { planId: 'v1', actionId: 'sono', completed: true, recordedAtIso: '2026-09-06T10:00:00Z' },
    { planId: 'v1', actionId: 'sono', completed: false, recordedAtIso: '2026-09-06T11:00:00Z' },
    { planId: 'v1', actionId: 'relato', completed: true, recordedAtIso: '2026-09-06T12:00:00Z' },
  ] as CarePlanActionConfirmation[];
  assert.deepEqual(selectConfirmedActionIds(records, 'v1'), ['relato']);
  assert.deepEqual(selectConfirmedActionIds(records, 'v2'), []);
});
