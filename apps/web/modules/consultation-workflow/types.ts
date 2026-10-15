import type {
  ConsultationSourceSegment,
  ConsultationSummary,
  ConsultationSummaryGenerationMetadata,
} from "./summary-types.ts";

export const CONSULTATION_CONSENT_VERSION = "consultation-assistance-v1" as const;
export const CONSULTATION_SUMMARY_VERSION = "consultation-summary-v1" as const;

export type ConsultationConsentState = {
  version: typeof CONSULTATION_CONSENT_VERSION;
  text: string;
  decision: "pending" | "granted" | "refused" | "withdrawn";
  decidedAt: string | null;
};

export type ConsultationConsentView = {
  role: "patient";
  appointmentId: string;
  patientId: string;
  consent: ConsultationConsentState;
};

export type ConsultationWorkflowView = {
  role: "doctor";
  appointmentId: string;
  patientId: string;
  consent: ConsultationConsentState;
  capture: {
    id: string | null;
    status: "idle" | "capturing" | "paused" | "finalized" | "cancelled";
    startedAt: string | null;
    endedAt: string | null;
    nextChunkIndex: number;
    sourceHash: string | null;
    segments: ConsultationSourceSegment[];
  };
  summary: {
    status: "not_requested" | "pending" | "processing" | "ready" | "failed" | "cancelled" | "unavailable";
    attempts: number;
    errorCode: "generation_failed" | "invalid_output" | "timeout" | null;
    draft: {
      id: string;
      version: number;
      summary: ConsultationSummary;
      metadata: ConsultationSummaryGenerationMetadata | Record<string, unknown>;
      createdAt: string;
    } | null;
    review: {
      decision: "accepted" | "rejected";
      note: string;
      reviewedAt: string;
    } | null;
  };
};

export type ConsultationWorkflowState = ConsultationConsentView | ConsultationWorkflowView;

export type ConsultationSummaryClaim = {
  claim: {
    jobId: string;
    leaseToken: string;
    sourceId: string;
    sourceHash: string;
    consentEventId: string;
    consentVersion: typeof CONSULTATION_CONSENT_VERSION;
    segments: ConsultationSourceSegment[];
  };
};

export type ConsultationWorkflowAction =
  | { action: "consent_decide"; payload: { decisionId: string; consentVersion: typeof CONSULTATION_CONSENT_VERSION; decision: "granted" | "refused" | "withdrawn" } }
  | { action: "begin"; payload: { captureId: string } }
  | { action: "append_chunk"; payload: { captureId: string; chunkIndex: number; clientChunkId: string; text: string; capturedAt: string; startSeconds: number; endSeconds: number; speaker: "unknown" } }
  | { action: "pause" | "end"; payload: { captureId: string } }
  | { action: "process_summary"; payload: Record<string, never> }
  | { action: "review_summary"; payload: { summaryId: string; expectedVersion: number; decision: "accepted" | "rejected"; note: string; correctedSummary?: ConsultationSummary } };
