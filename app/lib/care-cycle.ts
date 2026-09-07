import { getD1 } from '@/db';
import { createCareActions } from '../components/care-demo-actions';
import { emptyState } from '../components/care-demo-model';
import type { CareDemoState } from '../components/care-demo-store';
import type { ClinicalExamDocument,ClinicalExamField } from '../components/clinical-intelligence-model';
import { createPatientExam,formatDateTime,initialExams,initialState } from '../components/clinical-intelligence-model';
import { encounterBelongsToPatient,getDefaultEncounterId } from '../components/demo-routes';
import type { AppUser } from './auth';
import { coreCareCommands,isRecord,patientCycleView,sharedCareKeys,type CareCycle,type CareFile,type CareSubmission,type CoreCareCommand,type CycleMutation } from './care-cycle-contract';
import { synthesisFingerprint } from './clinical-synthesis-contract';

export class CareError extends Error { constructor(message: string, public status = 400) { super(message); } }
export interface CareAccess { id: string; patientId: string; professionalId: string; patientUserId: string }
export async function careAccess(user: AppUser, patientId?: string) {
  if (user.role !== 'patient' && user.role !== 'professional') return [];
  const result = await getD1().prepare(`SELECT id, patient_profile_id AS patientId,
    professional_user_id AS professionalId, patient_user_id AS patientUserId FROM care_relationships
    WHERE status = 'active' AND (professional_user_id = ? OR patient_user_id = ?)
    AND (? IS NULL OR patient_profile_id = ?)`)
    .bind(user.id, user.id, patientId ?? null, patientId ?? null).all<CareAccess>();
  return result.results.filter((item) => user.role === 'professional' ? item.professionalId === user.id : item.patientUserId === user.id && item.patientId === user.patientId);
}
export function seedCycle(patientId: string, encounterId: string): CareCycle {
  return { patientId, encounterId, revision: 0,
    care: Object.fromEntries(sharedCareKeys.map((key) => [key, emptyState[key].filter((item) => item.patientId === patientId && item.encounterId === encounterId)])) as CareCycle['care'],
    exams: initialExams.filter((exam) => exam.patientId === patientId), submissions: [],
  };
}
async function initialCycle(access: CareAccess, encounterId: string): Promise<CareCycle> {
  const previous = await getD1().prepare("SELECT id FROM care_relationships WHERE patient_user_id = ? AND status = 'inactive' LIMIT 1").bind(access.patientUserId).first();
  if (!previous) return seedCycle(access.patientId, encounterId);
  return { patientId: access.patientId, encounterId, revision: 0, care: Object.fromEntries(sharedCareKeys.map(key => [key, []])) as unknown as CareCycle['care'], exams: [], submissions: [] };
}
export async function loadCycle(access: CareAccess, encounterId: string = getDefaultEncounterId(access.patientId)) {
  if (!encounterBelongsToPatient(access.patientId, encounterId)) throw new CareError('Consulta não pertence a este acompanhamento.', 403);
  const database = getD1();
  await database.prepare(`INSERT INTO care_cycles (id, relationship_id, encounter_id, revision, data, updated_at)
    VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(relationship_id, encounter_id) DO NOTHING`)
    .bind(crypto.randomUUID(), access.id, encounterId, JSON.stringify(await initialCycle(access, encounterId)), new Date().toISOString()).run();
  const row = await database.prepare(`SELECT id, revision, data FROM care_cycles WHERE relationship_id = ? AND encounter_id = ?`)
    .bind(access.id, encounterId).first<{ id: string; revision: number; data: string }>();
  if (!row) throw new CareError('Acompanhamento indisponível.', 503);
  return { id: row.id, cycle: { ...JSON.parse(row.data), revision: row.revision, relationshipId: access.id } as CareCycle };
}
const patientCommands = new Set(['submitCheckIn', 'confirmCarePlanAction', 'sharePatientExam', 'submitInformation']);
const planKeys = new Set(['title','objective','introduction','actions','monitoring','supportNotice','sourceDescription','sourceMode','sourceReviewId','sourceClosureId','sourceClosureVersion','sourceItemIds']);
function text(value: unknown, label: string, min = 1, max = 8000) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new CareError(`Revise ${label}.`);
  return value.trim();
}

// Pure transition: the API controls identity, original fields, time and version.
export function transitionCycle(cycle: CareCycle, user: AppUser, mutation: CycleMutation, attachment: CareFile | null = null) {
  if (user.role !== 'patient' && user.role !== 'professional') throw new CareError('Perfil sem acesso clínico.', 403);
  if (user.role === 'patient' && !patientCommands.has(mutation.command)) throw new CareError('Esta ação exige revisão do médico responsável.', 403);
  if (user.role === 'professional' && patientCommands.has(mutation.command)) throw new CareError('Este envio pertence ao perfil da paciente.', 403);
  const next = structuredClone(cycle);
  const now = new Date();
  const timestamp = now.toISOString();
  let result: unknown;
  const [arg, second] = mutation.args;
  if ((coreCareCommands as readonly string[]).includes(mutation.command)) {
    const command = mutation.command as CoreCareCommand;
    if (['saveCarePlan','startCarePlan','createCarePlanRevision'].includes(command)) {
      const patch = command === 'saveCarePlan' ? second : arg;
      if (patch != null && (!isRecord(patch) || Object.keys(patch).some((key) => !planKeys.has(key)))) throw new CareError('Campos inválidos no plano.');
      if (isRecord(patch)) {
        for (const key of ['title','objective','introduction','monitoring','supportNotice','sourceDescription']) {
          if (key in patch) text(patch[key], `o campo ${key}`, 0);
        }
        if ('actions' in patch && (!Array.isArray(patch.actions) || patch.actions.length > 30 || patch.actions.some((item) => !isRecord(item)
          || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.cadence !== 'string' || typeof item.active !== 'boolean'
          || (item.sourceItemId !== null && typeof item.sourceItemId !== 'string')))) throw new CareError('Revise as ações do plano.');
        if ('sourceItemIds' in patch && (!Array.isArray(patch.sourceItemIds) || patch.sourceItemIds.some((id) => typeof id !== 'string'))) throw new CareError('Fontes inválidas.');
        if ('sourceMode' in patch && patch.sourceMode !== 'manual' && patch.sourceMode !== 'assisted') throw new CareError('Origem inválida.');
      }
    }
    if (['saveCarePlan','approveCarePlan','publishCarePlan'].includes(command)) {
      const plan = next.care.carePlans.find((item) => item.id === arg);
      const baseline = command === 'saveCarePlan' ? mutation.args[2] : second;
      if (!plan || typeof baseline !== 'string' || plan.updatedAtIso !== baseline) throw new CareError('Este plano mudou desde que você abriu o editor. Confira a versão salva; seu rascunho foi preservado.', 409);
    }
    if (command === 'submitCheckIn' && (!isRecord(arg) || typeof arg.newSymptom !== 'boolean'
      || typeof arg.originalText !== 'string' || arg.originalText.length > 8000)) throw new CareError('Relato inválido.');
    if (command === 'confirmCarePlanAction' && typeof mutation.args[2] !== 'boolean') throw new CareError('Confirmação inválida.');
    let working: CareDemoState = { ...structuredClone(emptyState), ...next.care, auditEvents: [] };
    const actions = createCareActions(working, (update) => { working = update(working); });
    const action = actions[command] as (...args: unknown[]) => unknown;
    try { result = action(cycle.patientId, cycle.encounterId, ...mutation.args); }
    catch (error) { throw new CareError(error instanceof TypeError ? 'Revise os campos desta ação.' : error instanceof Error ? error.message : 'Ação inválida.'); }
    if (isRecord(result)) {
      const resultId = result.id;
      const previousPlan = cycle.care.carePlans.find((item) => item.id === resultId);
      if (previousPlan && typeof result.updatedAtIso === 'string'
        && Date.parse(result.updatedAtIso) <= Date.parse(previousPlan.updatedAtIso)) {
        result.updatedAtIso = new Date(Date.parse(previousPlan.updatedAtIso) + 1).toISOString();
      }
      const actorField = ({ startCarePlan: 'authoredBy', createCarePlanRevision: 'authoredBy', approveCarePlan: 'approvedBy', publishCarePlan: 'publishedBy', reviewCheckIn: 'reviewedBy', recordConsultationClosure: 'approvedBy', configureFollowUp: 'configuredBy', recordFollowUpContact: 'recordedBy' } as Record<string, string>)[command];
      if (user.role === 'professional' && actorField && typeof result[actorField] === 'string') result[actorField] = user.displayName;
      if (command === 'configureFollowUp') result.retentionMode = 'shared-care';
    }
    for (const key of sharedCareKeys) (next.care[key] as unknown[]) = working[key];
  } else if (mutation.command === 'sharePatientExam') {
    if (!isRecord(arg) || typeof arg.examDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(arg.examDate)
      || !Number.isFinite(Date.parse(arg.examDate))) throw new CareError('Data do exame inválida.');
    const exam = createPatientExam({ patientId: cycle.patientId, examDate: arg.examDate, note: text(arg.note ?? '', 'observação', 0, 180) }, { ...initialState, exams: next.exams });
    exam.id = crypto.randomUUID();
    next.exams.push(exam); result = exam;
  } else if (mutation.command === 'approveExam') {
    if (!isRecord(arg) || !Array.isArray(arg.fields)) throw new CareError('Revise os campos do exame.');
    const exam = next.exams.find((item) => item.id === arg.examId);
    if (!exam || exam.reviewStatus !== 'awaiting_review') throw new CareError('Exame indisponível para nova revisão.', 409);
    if (arg.fields.length !== exam.fields.length) throw new CareError('A origem dos campos deve ser preservada.');
    const fields: ClinicalExamField[] = exam.fields.map((original) => {
      const draft = (arg.fields as unknown[]).find((field) => isRecord(field) && field.id === original.id);
      if (!isRecord(draft) || typeof draft.included !== 'boolean') throw new CareError('Campo sem origem no exame.');
      const value = text(draft.value, 'valor', draft.included ? 1 : 0, 80);
      const unit = text(draft.unit, 'unidade', draft.included ? 1 : 0, 80);
      return { ...original, value, unit, included: draft.included,
        status: !draft.included ? 'not_found' : value === original.rawValue && unit === original.rawUnit ? 'confirmed' : 'corrected' };
    });
    if (fields.length && !fields.some((field) => field.included)) throw new CareError('Inclua ao menos um campo conferido.');
    Object.assign(exam, { fields, reviewStatus: 'approved', reviewVersion: exam.reviewVersion + 1,
      reviewedAt: formatDateTime(now), reviewedAtIso: timestamp, reviewedBy: user.displayName,
      // This endpoint records human review, not a new AI execution or a policy validation.
      governance: exam.governance });
    const received = next.submissions.find((item) => item.id === exam.id);
    if (received && received.status === 'received') Object.assign(received, { status: 'reviewed', reviewVersion: received.reviewVersion + 1,
      reviewedAt: timestamp, reviewedBy: user.displayName, reviewText: 'Documento original conferido pelo médico na revisão de exames. Nenhuma extração automática foi executada.' });
    result = exam;
  } else if (mutation.command === 'submitInformation') {
    if (!isRecord(arg) || !['text','audio','photo','pdf'].includes(String(arg.kind)) || arg.confirmed !== true) throw new CareError('Confira o envio antes de confirmar.');
    if (arg.kind !== 'text' && !attachment) throw new CareError('Anexe o arquivo antes de confirmar.');
    if (attachment && (arg.kind === 'text' || (arg.kind === 'pdf' ? attachment.mediaType !== 'application/pdf' : !attachment.mediaType.startsWith(arg.kind === 'photo' ? 'image/' : 'audio/')))) throw new CareError('O formato escolhido não corresponde ao arquivo.');
    const submission: CareSubmission = { id: crypto.randomUUID(), patientId: cycle.patientId, encounterId: cycle.encounterId,
      kind: arg.kind as CareSubmission['kind'], title: text(arg.title, 'título', 3, 140),
      originalText: text(arg.originalText ?? '', 'relato', arg.kind === 'text' ? 3 : 0), attachment,
      receivedAt: timestamp, receivedBy: user.displayName, status: 'received', reviewVersion: 0,
      reviewedAt: null, reviewedBy: null, reviewText: null, feedbackDraft: null, publishedFeedback: null, publishedAt: null };
    next.submissions.push(submission); result = submission;
    if (arg.category === 'exam' && attachment) {
      const exam: ClinicalExamDocument = { id: submission.id, patientId: cycle.patientId, patientName: user.displayName,
        doctorName: 'Equipe responsável', title: submission.title, fileName: attachment.name, laboratory: 'Não informado no envio',
        examDate: typeof arg.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(arg.examDate) && Number.isFinite(Date.parse(arg.examDate)) ? arg.examDate : '', receivedAt: formatDateTime(now), receivedAtIso: timestamp,
        submittedBy: 'patient', submittedByLabel: user.displayName, note: submission.originalText, originalAvailable: true,
        attachmentId: attachment.id, extractionVersion: 0, reviewStatus: 'awaiting_review', reviewVersion: 0,
        reviewedAt: null, reviewedAtIso: null, reviewedBy: null, governance: [], fields: [] };
      next.exams.push(exam);
    }
  } else {
    if (!isRecord(arg)) throw new CareError('Revisão inválida.');
    const submission = next.submissions.find((item) => item.id === arg.id);
    if (!submission) throw new CareError('Envio não encontrado.', 404);
    if (arg.reviewVersion !== submission.reviewVersion) throw new CareError('A revisão mudou. Seu texto foi mantido; confira a versão salva antes de continuar.', 409);
    if (mutation.command === 'reviewInformation') {
      if (submission.status === 'published') throw new CareError('O retorno publicado foi preservado; use uma nova revisão clínica.', 409);
      submission.reviewText = text(arg.reviewText, 'síntese da revisão', 3);
      submission.feedbackDraft = text(arg.feedbackDraft ?? '', 'retorno à paciente', 0);
      submission.reviewVersion += 1; submission.status = 'reviewed';
      submission.reviewedAt = timestamp; submission.reviewedBy = user.displayName;
      const exam = next.exams.find((item) => item.id === submission.id);
      if (exam && exam.fields.length === 0 && exam.reviewStatus === 'awaiting_review') Object.assign(exam, {
        reviewStatus: 'approved', reviewVersion: exam.reviewVersion + 1, reviewedAt: formatDateTime(now), reviewedAtIso: timestamp, reviewedBy: user.displayName,
      });
    } else {
      if (submission.status !== 'reviewed' || !submission.feedbackDraft?.trim()) throw new CareError('Salve uma revisão e um retorno antes de publicar.');
      submission.status = 'published'; submission.publishedFeedback = submission.feedbackDraft; submission.publishedAt = timestamp;
    }
    result = submission;
  }
  next.revision = cycle.revision + 1;
  return { next, result };
}

export async function mutateCycle(user: AppUser, mutation: CycleMutation) {
  const access = (await careAccess(user, mutation.patientId))[0];
  if (!access) throw new CareError('Vínculo de acompanhamento não autorizado.', 403);
  if (mutation.relationshipId && mutation.relationshipId !== access.id) throw new CareError('O médico responsável mudou. Atualize o acompanhamento antes de enviar.', 409);
  const { id, cycle } = await loadCycle(access, mutation.encounterId);
  const database = getD1();
  const inputHash = await synthesisFingerprint(JSON.stringify({ ...mutation, requestId: undefined }));
  const findExisting = () => database.prepare(`SELECT cycle_id AS cycleId, input_hash AS inputHash, result FROM care_cycle_mutations WHERE actor_id = ? AND request_id = ?`)
    .bind(user.id, mutation.requestId).first<{ cycleId: string; inputHash: string; result: string }>();
  const existing = await findExisting();
  if (existing) {
    if (existing.cycleId !== id || existing.inputHash !== inputHash) throw new CareError('Tentativa já utilizada para outro conteúdo.', 409);
    return { cycle: user.role === 'patient' ? patientCycleView(cycle) : cycle, result: JSON.parse(existing.result) };
  }
  if (cycle.revision !== mutation.revision) throw new CareError('O acompanhamento foi atualizado. Seu texto não foi apagado; atualize os dados e confira antes de tentar novamente.', 409);
  let attachment: CareFile | null = null;
  const arg = mutation.args[0];
  if (mutation.command === 'submitInformation' && isRecord(arg) && typeof arg.attachmentId === 'string') {
    attachment = await database.prepare(`SELECT id, name, media_type AS mediaType, size FROM care_files WHERE id = ? AND relationship_id = ? AND encounter_id = ? AND uploaded_by = ?`)
      .bind(arg.attachmentId, access.id, mutation.encounterId, user.id).first<CareFile>();
    if (!attachment) throw new CareError('Arquivo não pertence a este envio.', 403);
  }
  const { next, result } = transitionCycle(cycle, user, mutation, attachment);
  const responseResult = user.role === 'patient' && mutation.command === 'submitInformation'
    ? patientCycleView(next).submissions.find((item) => item.id === (result as CareSubmission).id) : result;
  const recoverReceipt = async () => {
    const receipt = await findExisting();
    if (!receipt || receipt.cycleId !== id || receipt.inputHash !== inputHash) return null;
    const latest = (await loadCycle(access, mutation.encounterId)).cycle;
    return { cycle: user.role === 'patient' ? patientCycleView(latest) : latest, result: JSON.parse(receipt.result) };
  };
  let batch;
  try { batch = await database.batch([
    database.prepare(`INSERT INTO care_cycle_mutations (id, cycle_id, actor_id, request_id, command, input_hash, result, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM care_cycles WHERE id = ? AND revision = ?)`)
      .bind(crypto.randomUUID(), id, user.id, mutation.requestId, mutation.command, inputHash, JSON.stringify(responseResult ?? null), new Date().toISOString(), id, mutation.revision),
    database.prepare(`UPDATE care_cycles SET data = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?`)
      .bind(JSON.stringify(next), next.revision, new Date().toISOString(), id, mutation.revision),
  ]); } catch (error) { const recovered = await recoverReceipt(); if (recovered) return recovered; throw error; }
  if (batch[0].meta.changes !== 1 || batch[1].meta.changes !== 1) {
    const recovered = await recoverReceipt(); if (recovered) return recovered;
    throw new CareError('Outra edição foi salva primeiro. Atualize antes de tentar novamente.', 409);
  }
  return { cycle: user.role === 'patient' ? patientCycleView(next) : next, result: responseResult };
}
