export type ExamDocumentSummary = {
  id: string;
  category: string;
  content_type: string;
  original_filename: string;
  display_title: string | null;
  created_at: string;
  available_at: string | null;
};

export type ExamExtractionSummary = {
  document_id: string;
  status: string;
  page_count: number;
  extracted_page_count: number;
  review_page_count: number;
  failed_page_count: number;
  created_at: string;
  id: string;
};

export function buildExamOverview(
  documents: ExamDocumentSummary[],
  runs: ExamExtractionSummary[],
) {
  const latestByDocument = new Map<string, ExamExtractionSummary>();
  for (const run of runs) {
    const previous = latestByDocument.get(run.document_id);
    if (!previous || run.created_at > previous.created_at
      || (run.created_at === previous.created_at && run.id > previous.id))
      latestByDocument.set(run.document_id, run);
  }

  const files = documents.map((document) => ({
    document,
    extraction: latestByDocument.get(document.id) ?? null,
  }));
  const examFiles = files.filter((file) => file.document.category === "exam");
  const toCheck = files.filter((file) => !file.extraction || file.extraction.status !== "extracted");

  return {
    totalFiles: files.length,
    examFiles: examFiles.length,
    otherFiles: files.length - examFiles.length,
    extractedFiles: files.length - toCheck.length,
    toCheckFiles: toCheck.length,
    latestReceivedAt: files.reduce<string | null>((latest, file) => {
      const received = file.document.available_at ?? file.document.created_at;
      return !latest || received > latest ? received : latest;
    }, null),
    files,
    toCheck,
  };
}
