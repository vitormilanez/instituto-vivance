import assert from "node:assert/strict";
import test from "node:test";
import { documentTitle, isTechnicalFilename } from "../modules/documents/title.ts";

test("nome de arquivo que é só código vira tipo e data; nome que diz algo fica", () => {
  const at = "2026-09-22T15:00:00Z";
  assert.equal(documentTitle({ original_filename: "29f0b309-1a2b-4c3d-8e9f-001122334455.pdf", created_at: at, content_type: "application/pdf" }), "PDF de 22/09/2026");
  assert.equal(documentTitle({ original_filename: "IMG_1234.jpg", created_at: at, content_type: "image/jpeg" }), "Foto de 22/09/2026");
  assert.equal(documentTitle({ original_filename: "image.png", created_at: at, category: "exam" }), "Exame de 22/09/2026");
  assert.equal(documentTitle({ original_filename: "Hemograma setembro.pdf", created_at: at }), "Hemograma setembro.pdf");
  assert.equal(isTechnicalFilename("home-390-primeira-dobra.png"), false);
});
