import assert from "node:assert/strict";
import test from "node:test";
import { buildExamOverview, type ExamDocumentSummary, type ExamExtractionSummary } from "../modules/exams/overview.ts";

test("reconcilia todos os arquivos, inclusive os posteriores à primeira página", () => {
  const documents: ExamDocumentSummary[] = Array.from({ length: 205 }, (_, index) => ({
    id: `document-${index}`,
    category: index === 204 ? "clinical_document" : "exam",
    content_type: "application/pdf",
    original_filename: `sintetico-${index}.pdf`,
    display_title: null,
    created_at: "2026-10-03T12:00:00Z",
    available_at: null,
  }));
  const runs: ExamExtractionSummary[] = [
    {
      document_id: "document-0", id: "older", status: "failed", page_count: 0,
      extracted_page_count: 0, review_page_count: 0, failed_page_count: 0,
      created_at: "2026-10-03T12:01:00Z",
    },
    {
      document_id: "document-0", id: "latest", status: "extracted", page_count: 25,
      extracted_page_count: 25, review_page_count: 0, failed_page_count: 0,
      created_at: "2026-10-03T12:02:00Z",
    },
  ];
  const overview = buildExamOverview(documents, runs);
  assert.equal(overview.totalFiles, 205);
  assert.equal(overview.examFiles, 204);
  assert.equal(overview.otherFiles, 1);
  assert.equal(overview.extractedFiles, 1);
  assert.equal(overview.toCheckFiles, 204);
  assert.equal(overview.toCheck.at(-1)?.document.id, "document-204");
  assert.equal(overview.files[0].extraction?.status, "extracted");
});
