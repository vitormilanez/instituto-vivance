import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractEmbeddedPdfText } from "../modules/exams/text.ts";

test("extrai texto por página e sinaliza página sem texto para conferência", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("EXAME SINTETICO\nGlicose 90 mg/dL", { x: 40, y: 700, font });
  pdf.addPage();
  const bytes = await pdf.save();

  const result = await extractEmbeddedPdfText(bytes);
  assert.equal(result.pageCount, 2);
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages[0].page_number, 1);
  assert.match(result.pages[0].extracted_text ?? "", /Glicose 90 mg\/dL/);
  assert.equal(result.pages[0].status, "extracted");
  assert.equal(result.pages[0].text_sha256?.length, 64);
  assert.deepEqual(result.pages[1], {
    page_number: 2,
    status: "requires_review",
    extraction_method: "none",
    extracted_text: null,
    text_sha256: null,
    failure_code: null,
  });
  assert.equal(result.sourceContentSha256.length, 64);
});

test("rejeita entrada que não é PDF", async () => {
  await assert.rejects(
    extractEmbeddedPdfText(new TextEncoder().encode("arquivo sintético")),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "invalid_pdf",
  );
});

test("cobre um painel sintético de 25 páginas sem perder a origem", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let page = 1; page <= 25; page++)
    pdf.addPage().drawText(`PAINEL SINTETICO - PAGINA ${page}`, { x: 40, y: 700, font });
  const result = await extractEmbeddedPdfText(await pdf.save());
  assert.equal(result.pageCount, 25);
  assert.deepEqual(result.pages.map((page) => page.page_number), Array.from({ length: 25 }, (_, index) => index + 1));
  assert.match(result.pages[24].extracted_text ?? "", /PAGINA 25/);
});
