import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";

export const embeddedTextExtractor = {
  name: "unpdf-embedded-text",
  version: "1.8.1+vivance-repeat-review.1",
} as const;

const maxPages = 100;
const maxPageCharacters = 80_000;
const maxDocumentCharacters = 500_000;

export class PdfTextError extends Error {
  readonly code: "invalid_pdf" | "page_limit" | "text_limit" | "incomplete_text";
  constructor(code: "invalid_pdf" | "page_limit" | "text_limit" | "incomplete_text") {
    super("PDF text extraction cannot continue.");
    this.code = code;
  }
}

export type ExtractedPage = {
  page_number: number;
  status: "extracted" | "requires_review";
  extraction_method: "embedded_text" | "none";
  extracted_text: string | null;
  text_sha256: string | null;
  failure_code: null;
  possible_duplicate_of_page: number | null;
};

function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

// A very close page match is a quality signal, never permission to discard a
// page: a single changed digit could be a clinically different result.
function shingles(value: string) {
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const result = new Set<string>();
  for (let index = 0; index <= normalized.length - 8; index++)
    result.add(normalized.slice(index, index + 8));
  return { length: normalized.length, values: result };
}

export function markPossibleRepeatedPages(pages: ExtractedPage[]) {
  const indexed = pages.map((page) => page.extracted_text ? shingles(page.extracted_text) : null);
  return pages.map((page, index) => {
    const current = indexed[index];
    if (!current || current.length < 400) return page;
    for (let earlier = 0; earlier < index; earlier++) {
      const previous = indexed[earlier];
      if (!previous || previous.length < 400
        || Math.min(current.length, previous.length) / Math.max(current.length, previous.length) < 0.97)
        continue;
      let shared = 0;
      for (const value of current.values)
        if (previous.values.has(value)) shared++;
      const similarity = (2 * shared) / (current.values.size + previous.values.size);
      if (similarity >= 0.99) return {
        ...page,
        status: "requires_review" as const,
        possible_duplicate_of_page: pages[earlier].page_number,
      };
    }
    return page;
  });
}

export async function extractEmbeddedPdfText(bytes: Uint8Array) {
  if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-")
    throw new PdfTextError("invalid_pdf");

  const sourceContentSha256 = sha256(bytes);
  const pdf = await getDocumentProxy(bytes.slice());
  try {
    if (pdf.numPages < 1 || pdf.numPages > maxPages)
      throw new PdfTextError("page_limit");
    const extracted = await extractText(pdf);
    if (!Array.isArray(extracted.text) || extracted.totalPages !== pdf.numPages)
      throw new PdfTextError("incomplete_text");
    let totalCharacters = 0;
    const pages: ExtractedPage[] = extracted.text.map((raw, index) => {
      const value = raw.replace(/\r\n?/g, "\n").trim();
      totalCharacters += value.length;
      if (value.length > maxPageCharacters || totalCharacters > maxDocumentCharacters)
        throw new PdfTextError("text_limit");
      return {
        page_number: index + 1,
        status: value ? "extracted" : "requires_review",
        extraction_method: value ? "embedded_text" : "none",
        extracted_text: value || null,
        text_sha256: value ? sha256(value) : null,
        failure_code: null,
        possible_duplicate_of_page: null,
      };
    });
    return { sourceContentSha256, pageCount: pdf.numPages, pages: markPossibleRepeatedPages(pages) };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
