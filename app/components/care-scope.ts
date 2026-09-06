import type { PreConsultationAnswers } from './care-demo-types';
export const EMPTY_PRECONSULTATION_DRAFT: PreConsultationAnswers = {
  consentGiven: false, aiAssistanceAllowed: false, objective: '', changes: '', questions: '', additionalContext: '',
};
export function getCareDemoScopeKey(patientId: string, encounterId: string) { return `${patientId}::${encounterId}`; }
