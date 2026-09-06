import type { CarePlanActionConfirmation, CarePlanVersion } from './care-demo-types';
import type { ClinicalExamDocument } from './clinical-intelligence-context';

// Doctor and patient surfaces must derive their labels from the same records.
export function selectPatientExams(exams: ClinicalExamDocument[], patientId: string) {
  return exams.filter((exam) => exam.patientId === patientId)
    .toSorted((left, right) => Date.parse(right.receivedAtIso) - Date.parse(left.receivedAtIso)
      || right.id.localeCompare(left.id));
}

export function examReviewPresentation(exam: ClinicalExamDocument) {
  return exam.reviewStatus === 'approved'
    ? { label: `Revisado · v${exam.reviewVersion}`, tone: 'green' as const }
    : { label: 'Em revisão médica', tone: 'amber' as const };
}

export function selectExamIntake(exams: ClinicalExamDocument[], patientId: string, reminderSent = false) {
  const patientExams = selectPatientExams(exams, patientId);
  const latest = patientExams[0] ?? null;
  const pendingCount = patientExams.filter((exam) => exam.reviewStatus === 'awaiting_review').length;
  return {
    patientExams,
    latest,
    pendingCount,
    // A reminder records contact, never whether a document was received/reviewed.
    label: pendingCount > 0 ? `${pendingCount} em revisão médica`
      : latest ? examReviewPresentation(latest).label
        : reminderSent ? 'Lembrete enviado · sem exame recebido' : 'Nenhum exame recebido',
    tone: latest && pendingCount === 0 ? 'green' as const : 'amber' as const,
    canRemind: !latest && !reminderSent,
  };
}

export function selectCarePlans(plans: CarePlanVersion[], patientId: string, encounterId: string) {
  const carePlans = plans
    .filter((plan) => plan.patientId === patientId && plan.encounterId === encounterId)
    .toSorted((left, right) => left.version - right.version);
  const latestCarePlan = carePlans.at(-1) ?? null;
  const activeCarePlan = carePlans.findLast((plan) => plan.status === 'draft' || plan.status === 'approved') ?? latestCarePlan;
  const latestPublishedCarePlan = carePlans.findLast((plan) => plan.status === 'published') ?? null;
  return { carePlans, latestCarePlan, activeCarePlan, latestPublishedCarePlan };
}

export function publishedPlanLabel(plan: CarePlanVersion | null) {
  return plan?.status === 'published' ? `v${plan.version} publicado` : 'Ainda não publicado';
}

export function selectConfirmedActionIds(confirmations: CarePlanActionConfirmation[], planId: string | undefined) {
  const latest = new Map<string, CarePlanActionConfirmation>();
  for (const item of confirmations.filter((item) => item.planId === planId).toSorted((a, b) => a.recordedAtIso.localeCompare(b.recordedAtIso))) latest.set(item.actionId, item);
  return [...latest.values()].filter((item) => item.completed).map((item) => item.actionId);
}
