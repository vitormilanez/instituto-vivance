import assert from "node:assert/strict";
import test from "node:test";
import { displayedExamValue, displayedExamUnit, displayedExamReference, displayedExamObservedDate, examBriefTopics, examReferencePosition, latestExamReview, examProcessingMessage, type ExamResult } from "../modules/exams/results.ts";

test("processing failure distinguishes available PDF text from unfinished result organization", () => {
  const document = { id: "d", title: "Fictício", receivedAt: "2026-10-10", observedOn: null, issuer: null,
    summary: [], qualityNotes: [], items: [], processingStatus: "failed" as const, pageCount: 25, extractedPageCount: 25 };
  assert.match(examProcessingMessage(document)!, /texto das 25 páginas está disponível/);
  assert.match(examProcessingMessage(document)!, /organização dos resultados/);
  assert.doesNotMatch(examProcessingMessage({ ...document, extractedPageCount: 24 })!, /texto das 25/);
  assert.equal(examProcessingMessage({ ...document, processingStatus: "completed" }), null);
});

const item: ExamResult = {
  id: "item-1", document_id: "document-1", page_number: 2, item_index: 1,
  item_kind: "laboratory", literal_name: "Glicose", literal_value: "108",
  numeric_value: 108, unit_text: "mg/dL", reference_text: "70–99 mg/dL",
  observed_on: "2026-10-09", narrative_text: null,
  source_excerpt: "Glicose 108 mg/dL", requires_review_reason: "ai_extraction", reviews: [],
};

test("comparison accepts only an unambiguous interval with matching unit", () => {
  assert.equal(examReferencePosition(item), "above");
  assert.equal(examReferencePosition({ ...item, numeric_value: 80, literal_value: "80" }), "within");
  assert.equal(examReferencePosition({ ...item, numeric_value: 60, literal_value: "60" }), "below");
  assert.equal(examReferencePosition({ ...item, reference_text: "< 100 mg/dL" }), null);
  assert.equal(examReferencePosition({ ...item, reference_text: "70–99 mmol/L" }), null);
  assert.equal(examReferencePosition({ ...item, reference_text: "70–99 mg/dL, adultos" }), null);
  assert.equal(examReferencePosition({ ...item, numeric_value: null }), null);
  assert.equal(examReferencePosition({ ...item, literal_value: "108?" }), null);
  assert.equal(examReferencePosition({ ...item, literal_value: "109" }), null);
});

test("latest review governs display and simple corrected text is compared without conversion", () => {
  const corrected = { ...item, reviews: [
    { id: "r1", version: 1, decision: "confirmed", corrected_data: null, reviewed_at: "2026-10-09T10:00:00Z" },
    { id: "r2", version: 2, decision: "corrected", corrected_data: { literal_value: "101" }, reviewed_at: "2026-10-10T10:00:00Z" },
  ] };
  assert.equal(latestExamReview(corrected)?.id, "r2");
  assert.equal(displayedExamValue(corrected), "101");
  assert.equal(examReferencePosition(corrected), "above");
  assert.equal(displayedExamValue({ ...corrected, reviews: [{ id: "r3", version: 3, decision: "rejected", corrected_data: null, reviewed_at: "2026-10-10T11:00:00Z" }] }), null);
  assert.equal(examReferencePosition({ ...corrected, reviews: [{ id: "r3", version: 3, decision: "rejected", corrected_data: null, reviewed_at: "2026-10-10T11:00:00Z" }] }), null);
});

test("date-only correction preserves the simple range position", () => {
  const dateOnly = { ...item, reviews: [{ id: "date", version: 1, decision: "corrected",
    corrected_data: { observed_on: "2026-10-08" }, reviewed_at: "2026-10-10T10:00:00Z" }] };
  assert.equal(examReferencePosition(dateOnly), "above");
  assert.equal(examReferencePosition({ ...dateOnly, literal_value: "1.234", numeric_value: 1.234 }), null);
});

test("corrected value and reference update range position only with matching explicit unit", () => {
  const reviewed = { ...item, reviews: [{ id: "fields", version: 1, decision: "corrected",
    corrected_data: { literal_value: "80", reference_text: "75–85 mg/dL" },
    reviewed_at: "2026-10-10T10:00:00Z" }] };
  assert.equal(examReferencePosition(reviewed), "within");
  assert.equal(examReferencePosition({ ...reviewed, reviews: [{ ...reviewed.reviews[0],
    corrected_data: { literal_value: "80", reference_text: "90–100 mg/dL" } }] }), "below");
  assert.equal(examReferencePosition({ ...reviewed, reviews: [{ ...reviewed.reviews[0],
    corrected_data: { literal_value: "80", unit_text: "mmol/L", reference_text: "75–85 mg/dL" } }] }), null);
  assert.equal(examReferencePosition({ ...reviewed, reviews: [{ ...reviewed.reviews[0],
    corrected_data: { literal_value: "1.234", reference_text: "1–2 mg/dL" } }] }), null);
});

test("briefing includes reviewed values with item provenance and counts pending only", () => {
  const confirmed = { ...item, reviews: [{ id: "r1", version: 1, decision: "confirmed", corrected_data: null, reviewed_at: "2026-10-09T10:00:00Z" }] };
  const view = { documents: [{ id: "document-1", title: "Laudo", receivedAt: "2026-10-10", observedOn: "2026-10-09", issuer: null, summary: [], qualityNotes: [], items: [confirmed, { ...item, id: "item-2", literal_value: "777", reviews: [] }] }] };
  const brief = examBriefTopics(view, "clinic-1", "patient-1");
  assert.equal(brief.topics.length, 1);
  assert.equal(brief.topics[0].itemId, "item-1");
  assert.match(brief.topics[0].text, /Glicose: 108 mg\/dL · 9 de out\. de 2026/);
  assert.equal(brief.pending, 1);
});

test("partial corrections retain prior fields, explicit null clears, and confirmation preserves corrections", () => {
  const reviews = [
    { id: "r1", version: 1, decision: "corrected", corrected_data: {
      unit_text: "mmol/L", reference_text: "4–6 mmol/L", observed_on: "2026-02-28",
    }, reviewed_at: "2026-10-09T10:00:00Z" },
    { id: "r2", version: 2, decision: "corrected", corrected_data: {
      unit_text: "mmol/L", reference_text: null, observed_on: "2026-02-28",
    }, reviewed_at: "2026-10-09T11:00:00Z" },
  ];
  const corrected = { ...item, reviews };
  assert.equal(displayedExamValue(corrected), "108");
  assert.equal(displayedExamUnit(corrected), "mmol/L");
  assert.equal(displayedExamReference(corrected), null);
  assert.equal(displayedExamObservedDate(corrected), "2026-02-28");
  const confirmed = { ...corrected, reviews: [...reviews,
    { id: "r3", version: 3, decision: "confirmed", corrected_data: null, reviewed_at: "2026-10-09T12:00:00Z" }] };
  assert.equal(displayedExamUnit(confirmed), "mmol/L");
  assert.equal(displayedExamReference(confirmed), null);
  assert.equal(examReferencePosition(confirmed), null);
  const view = { documents: [{ id: "document-1", title: "Laudo", receivedAt: "2026-10-10",
    observedOn: "2026-10-09", issuer: null, summary: [], qualityNotes: [], items: [confirmed] }] };
  assert.match(examBriefTopics(view, "clinic-1", "patient-1").topics[0].text,
    /108 mmol\/L · 28 de fev\. de 2026/);
});
