import type { OutreachResult } from "./outreach.ts";

export type OutreachAttempt = {
  tenantId: string; doctorId: string; batchKey: string; content: string;
  patientIds: string[]; results: OutreachResult[];
};
export function pendingOutreachRecipients(attempt: OutreachAttempt) {
  return attempt.patientIds.filter((id) => {
    const result = attempt.results.find((item) => item.patientId === id);
    return !result || (result.status === "failed" && result.retryable !== false);
  });
}
export function mergeOutreachResults(attempt: OutreachAttempt, results: OutreachResult[]): OutreachAttempt {
  const byPatient = new Map(attempt.results.map((result) => [result.patientId, result]));
  for (const result of results) {
    if (attempt.patientIds.includes(result.patientId) && byPatient.get(result.patientId)?.status !== "sent") byPatient.set(result.patientId, result);
  }
  return { ...attempt, results: [...byPatient.values()] };
}
