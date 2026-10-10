import assert from "node:assert/strict";
import test from "node:test";
import { displayedExamValue, examBriefTopics, examReferencePosition, latestExamReview, type ExamResult } from "../modules/exams/results.ts";

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

test("latest review governs display and corrected text is never compared automatically", () => {
  const corrected = { ...item, reviews: [
    { id: "r1", version: 1, decision: "confirmed", corrected_data: null, reviewed_at: "2026-10-09T10:00:00Z" },
    { id: "r2", version: 2, decision: "corrected", corrected_data: { literal_value: "101" }, reviewed_at: "2026-10-10T10:00:00Z" },
  ] };
  assert.equal(latestExamReview(corrected)?.id, "r2");
  assert.equal(displayedExamValue(corrected), "101");
  assert.equal(examReferencePosition(corrected), null);
  assert.equal(displayedExamValue({ ...corrected, reviews: [{ id: "r3", version: 3, decision: "rejected", corrected_data: null, reviewed_at: "2026-10-10T11:00:00Z" }] }), null);
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
