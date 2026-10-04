import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";

export const embeddedTextExtractor = {
  name: "unpdf-embedded-text",
  version: "1.8.1",
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
};

function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
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
      };
    });
    return { sourceContentSha256, pageCount: pdf.numPages, pages };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
