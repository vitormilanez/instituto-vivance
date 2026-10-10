export type ExamReview = {
  id: string;
  version: number;
  decision: string;
  corrected_data: Record<string, unknown> | null;
  reviewed_at: string;
};

export type ExamResult = {
  id: string;
  document_id: string;
  page_number: number;
  item_index: number;
  item_kind: string;
  literal_name: string;
  literal_value: string | null;
  numeric_value: number | null;
  unit_text: string | null;
  reference_text: string | null;
  observed_on: string | null;
  narrative_text: string | null;
  source_excerpt: string;
  requires_review_reason: string;
  reviews: ExamReview[];
};

export type ExamDocumentResult = {
  id: string;
  title: string;
  receivedAt: string;
  processingStatus?: "pending" | "processing" | "failed" | "completed" | null;
  observedOn: string | null;
  issuer: string | null;
  summary: string[];
  qualityNotes: string[];
  items: ExamResult[];
};

export type ExamResultsView = { documents: ExamDocumentResult[]; unavailable?: boolean };

export function latestExamReview(item: ExamResult) {
  return [...item.reviews].sort((a, b) => b.version - a.version || b.reviewed_at.localeCompare(a.reviewed_at))[0] ?? null;
}

export function displayedExamValue(item: ExamResult) {
  const review = latestExamReview(item);
  if (review?.decision === "rejected") return null;
  const field = item.item_kind === "narrative" ? "narrative_text" : "literal_value";
  const corrected = review?.decision === "corrected" ? review.corrected_data?.[field] : null;
  return typeof corrected === "string" && corrected.trim()
    ? corrected.trim()
    : item.item_kind === "narrative" ? item.narrative_text : item.literal_value;
}

// Deliberately accepts only a plain closed interval with the same unit as the
// result. Inequalities, age/sex-specific ranges and corrected values need a
// clinician to interpret the original report.
export function examReferencePosition(item: ExamResult): "below" | "within" | "above" | null {
  if (item.item_kind !== "laboratory" || item.numeric_value === null || !Number.isFinite(item.numeric_value)
    || !item.unit_text || !item.reference_text || latestExamReview(item)?.decision === "corrected") return null;
  const literal = item.literal_value?.trim() ?? "";
  if (!/^-?\d+(?:[.,]\d+)?$/.test(literal)
    || Number(literal.replace(",", ".")) !== item.numeric_value) return null;
  const unit = item.unit_text.trim();
  const ref = item.reference_text.trim();
  const match = /^(-?\d+(?:[.,]\d+)?)\s*(?:-|–|a)\s*(-?\d+(?:[.,]\d+)?)\s*(.*)$/.exec(ref);
  if (!match || (match[3] && match[3].trim() !== unit)) return null;
  const lower = Number(match[1].replace(",", "."));
  const upper = Number(match[2].replace(",", "."));
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) return null;
  return item.numeric_value < lower ? "below" : item.numeric_value > upper ? "above" : "within";
}

export function examBriefTopics(view: ExamResultsView, tenantId: string, patientId: string) {
  const documentsHref = `/clinicas/${encodeURIComponent(tenantId)}/pacientes/${encodeURIComponent(patientId)}?aba=Documentos`;
  const reviewed = view.documents.flatMap((document) => document.items
    .filter((item) => {
      const decision = latestExamReview(item)?.decision;
      return item.item_kind === "laboratory"
        && (decision === "confirmed" || decision === "corrected") && Boolean(displayedExamValue(item));
    })
    .map((item) => ({ document, item })));
  const topics = reviewed.slice(0, 3).map(({ document, item }) => ({
    text: `${item.literal_name}: ${displayedExamValue(item)}${item.unit_text ? ` ${item.unit_text}` : ""}${item.observed_on || document.observedOn ? ` · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item.observed_on ?? document.observedOn}T12:00:00Z`))}` : ""}.`,
    itemId: item.id,
    documentId: document.id,
    href: `${documentsHref}#resultado-${encodeURIComponent(item.id)}`,
  }));
  const pending = view.documents.reduce((count, document) => count + document.items.filter((item) => !latestExamReview(item)).length, 0);
  return { topics, pending, href: documentsHref };
}
