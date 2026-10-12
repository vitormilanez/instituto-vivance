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
  method_text?: string | null;
  specimen_text?: string | null;
  reviews: ExamReview[];
};

export type ExamDocumentResult = {
  id: string;
  title: string;
  receivedAt: string;
  processingStatus?: "pending" | "processing" | "failed" | "completed" | null;
  canResume?: boolean;
  pageCount?: number;
  extractedPageCount?: number;
  observedOn: string | null;
  issuer: string | null;
  summary: string[];
  qualityNotes: string[];
  items: ExamResult[];
};

export type ExamResultsView = { documents: ExamDocumentResult[]; unavailable?: boolean };

export function examProcessingMessage(document: ExamDocumentResult) {
  if (document.processingStatus !== "failed") return null;
  const allPagesRead = Boolean(document.pageCount && document.extractedPageCount === document.pageCount);
  return allPagesRead
    ? `O texto das ${document.pageCount} páginas está disponível. Não foi possível concluir a organização dos resultados. Confira o laudo original.`
    : "Não foi possível concluir o processamento automático. Confira o laudo original.";
}

export function previousReviewedExam(item:ExamResult, view:ExamResultsView):ExamResult|null {
  const observed=displayedExamObservedDate(item);
  if(!observed||!item.method_text||!item.specimen_text||!displayedExamUnit(item))return null;
  return view.documents.flatMap(d=>d.items).filter(candidate=>{
    const decision=latestExamReview(candidate)?.decision;
    const previousDate=displayedExamObservedDate(candidate);
    return candidate.id!==item.id&&(decision==="confirmed"||decision==="corrected")&&candidate.literal_name===item.literal_name&&displayedExamUnit(candidate)===displayedExamUnit(item)&&candidate.method_text===item.method_text&&candidate.specimen_text===item.specimen_text&&Boolean(previousDate&&previousDate<observed);
  }).sort((a,b)=>(displayedExamObservedDate(b)??"").localeCompare(displayedExamObservedDate(a)??""))[0]??null;
}

export function latestExamReview(item: ExamResult) {
  return [...item.reviews].sort((a, b) => b.version - a.version || b.reviewed_at.localeCompare(a.reviewed_at))[0] ?? null;
}

// Each corrected review contains a cumulative snapshot. Confirming a previously
// corrected item keeps that doctor's corrections; rejection hides the item.
export function effectiveExamCorrections(item: ExamResult): Record<string, unknown> | null {
  return [...item.reviews].filter((review) => review.decision === "corrected")
    .sort((a, b) => b.version - a.version)[0]?.corrected_data ?? null;
}

function effectiveText(item: ExamResult, field: "literal_value" | "narrative_text" | "unit_text" | "reference_text" | "observed_on", raw: string | null) {
  const correction = effectiveExamCorrections(item);
  if (correction && Object.prototype.hasOwnProperty.call(correction, field)) {
    const value = correction[field];
    return typeof value === "string" ? value : null;
  }
  return raw;
}

export function displayedExamValue(item: ExamResult) {
  if (latestExamReview(item)?.decision === "rejected") return null;
  const field = item.item_kind === "narrative" ? "narrative_text" : "literal_value";
  return effectiveText(item, field, item.item_kind === "narrative" ? item.narrative_text : item.literal_value);
}

export function displayedExamUnit(item: ExamResult) {
  return latestExamReview(item)?.decision === "rejected" ? null : effectiveText(item, "unit_text", item.unit_text);
}

export function displayedExamReference(item: ExamResult) {
  return latestExamReview(item)?.decision === "rejected" ? null : effectiveText(item, "reference_text", item.reference_text);
}

export function displayedExamObservedDate(item: ExamResult) {
  return latestExamReview(item)?.decision === "rejected" ? null : effectiveText(item, "observed_on", item.observed_on);
}

export function displayedExamValueWithUnit(item: ExamResult) {
  const value = displayedExamValue(item);
  if (!value) return null;
  const unit = item.item_kind === "laboratory" ? displayedExamUnit(item)?.trim() : null;
  const trimmed = value.trimEnd();
  const prefix = unit && trimmed.endsWith(unit) ? trimmed.slice(0, -unit.length) : "";
  return unit && !/[\d\s]$/.test(prefix) ? `${value} ${unit}` : value;
}

// Compare only unambiguous literal numbers against a plain closed interval
// explicitly written in the same unit. This does not convert units or infer
// meaning from inequalities, population-specific ranges or grouped numbers.
function plainExamNumber(literal: string): number | null {
  if (!/^-?\d+(?:[.,]\d+)?$/.test(literal) || /^-?[1-9]\d{0,2}[.,]\d{3}$/.test(literal)) return null;
  const value = Number(literal.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function examReferencePosition(item: ExamResult): "below" | "within" | "above" | null {
  if (item.item_kind !== "laboratory" || latestExamReview(item)?.decision === "rejected") return null;
  const literal = displayedExamValue(item)?.trim() ?? "";
  const unit = displayedExamUnit(item)?.trim() ?? "";
  const ref = displayedExamReference(item)?.trim() ?? "";
  if (!unit || !ref) return null;
  const numericLiteral = literal.endsWith(unit) && plainExamNumber(literal.slice(0, -unit.length).trim()) !== null
    ? literal.slice(0, -unit.length).trim() : literal;
  const numeric = plainExamNumber(numericLiteral);
  if (numeric === null) return null;
  const corrections = effectiveExamCorrections(item);
  if (!corrections || !Object.prototype.hasOwnProperty.call(corrections, "literal_value")) {
    if (item.numeric_value === null || !Number.isFinite(item.numeric_value) || numeric !== item.numeric_value) return null;
  }
  const match = /^(-?\d+(?:[.,]\d+)?)\s*(?:-|–|a)\s*(-?\d+(?:[.,]\d+)?)\s*(.*)$/.exec(ref);
  if (!match || match[3].trim() !== unit) return null;
  const lower = plainExamNumber(match[1]);
  const upper = plainExamNumber(match[2]);
  if (lower === null || upper === null || lower > upper) return null;
  return numeric < lower ? "below" : numeric > upper ? "above" : "within";
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
  const topics = reviewed.slice(0, 3).map(({ document, item }) => {
    const corrections = effectiveExamCorrections(item);
    const correctedDate = corrections && Object.prototype.hasOwnProperty.call(corrections, "observed_on");
    const observedDate = correctedDate ? displayedExamObservedDate(item) : displayedExamObservedDate(item) ?? document.observedOn;
    const dateLabel = observedDate
      ? ` · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${observedDate}T12:00:00Z`))}`
      : "";
    return {
      text: `${item.literal_name}: ${displayedExamValueWithUnit(item)}${dateLabel}.`,
      itemId: item.id,
      documentId: document.id,
      href: `${documentsHref}#resultado-${encodeURIComponent(item.id)}`,
    };
  });
  const pending = view.documents.reduce((count, document) => count + document.items.filter((item) => !latestExamReview(item)).length, 0);
  return { topics, pending, href: documentsHref };
}
