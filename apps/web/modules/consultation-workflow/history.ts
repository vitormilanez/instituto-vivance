import type { ConsultationSummary } from "./summary-types.ts";
import type { ConsultationWorkflowView } from "./types.ts";

export type ConsultationHistoryItem = {
  appointmentId: string;
  startsAt: string;
  endsAt: string;
  deliveryMode: "video" | "in_person";
  doctorName: string;
  appointmentStatus: string;
  summaryStatus: ConsultationWorkflowView["summary"]["status"];
  summary: {
    id: string;
    version: number;
    createdAt: string;
    mode: ConsultationSummary["mode"];
    incomplete: boolean;
    reviewDecision: "accepted" | "rejected" | null;
    reviewedAt: string | null;
    categories: ConsultationSummary["categories"];
  } | null;
};

export type PatientConsultationHistory = {
  items: ConsultationHistoryItem[];
  truncated: boolean;
  limit: 20;
};
