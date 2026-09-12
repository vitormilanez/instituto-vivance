import assert from "node:assert/strict";
import test from "node:test";
import {
  documentBytesMatch,
  documentIntent,
  documentReviewInput,
  maxDocumentBytes,
} from "../modules/documents/validation.ts";

const patientId = "11111111-1111-4111-8111-111111111111";

test("document intent accepts only bounded private-document metadata", () => {
  assert.deepEqual(
    documentIntent({
      patient_id: patientId,
      filename: "Resultado setembro.pdf",
      content_type: "application/pdf",
      byte_size: 512,
      category: "exam",
      visibility: "shared",
    }),
    {
      patientId,
      filename: "Resultado setembro.pdf",
      contentType: "application/pdf",
      byteSize: 512,
      category: "exam",
      visibility: "shared",
    },
  );
  assert.throws(() =>
    documentIntent({
      patient_id: patientId,
      filename: "resultado.pdf.exe",
      content_type: "application/pdf",
      byte_size: 512,
      category: "exam",
      visibility: "shared",
    }),
  );
  assert.throws(() =>
    documentIntent({
      patient_id: patientId,
      filename: "../../resultado.pdf",
      content_type: "application/pdf",
      byte_size: 512,
      category: "exam",
      visibility: "shared",
    }),
  );
  assert.throws(() =>
    documentIntent({
      patient_id: patientId,
      filename: "resultado.pdf",
      content_type: "application/pdf",
      byte_size: maxDocumentBytes + 1,
      category: "exam",
      visibility: "shared",
    }),
  );
});

test("document review requires a bounded internal note and explicit confirmation", () => {
  assert.deepEqual(
    documentReviewInput({
      decision: "needs_follow_up",
      internal_note: "  Solicitar nova imagem legível.  ",
      confirmed: true,
    }),
    {
      decision: "needs_follow_up",
      internalNote: "Solicitar nova imagem legível.",
    },
  );
  assert.throws(() =>
    documentReviewInput({
      decision: "approved",
      internal_note: "Sem confirmação",
      confirmed: false,
    }),
  );
  assert.throws(() =>
    documentReviewInput({
      decision: "automatic_diagnosis",
      internal_note: "Inválida",
      confirmed: true,
    }),
  );
});

test("document verification checks the declared binary signature", () => {
  assert.equal(
    documentBytesMatch(
      "application/pdf",
      new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]),
    ),
    true,
  );
  assert.equal(
    documentBytesMatch(
      "image/jpeg",
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    ),
    true,
  );
  assert.equal(
    documentBytesMatch(
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    true,
  );
  assert.equal(
    documentBytesMatch("application/pdf", new Uint8Array([0x50, 0x44, 0x46])),
    false,
  );
  assert.equal(
    documentBytesMatch(
      "image/png",
      new Uint8Array([0xff, 0xd8, 0xff]),
    ),
    false,
  );
});
