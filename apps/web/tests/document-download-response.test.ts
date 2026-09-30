import assert from "node:assert/strict";
import test from "node:test";
import { documentDownloadResponse } from "../modules/documents/download-response.ts";

test("authorized document downloads stream the original on the app origin", async () => {
  const original = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]);
  const response = documentDownloadResponse(original, "exame de João.pdf", "application/pdf");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Location"), null);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(response.headers.get("Content-Disposition"), "inline; filename*=UTF-8''exame%20de%20Jo%C3%A3o.pdf");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([0x25, 0x50, 0x44, 0x46]));
});

test("unsupported document types are attached with a safe content type", () => {
  const response = documentDownloadResponse(new Blob(["data"]), "file.bin", "text/html");
  assert.equal(response.headers.get("Content-Type"), "application/octet-stream");
  assert.equal(response.headers.get("Content-Disposition"), "attachment; filename*=UTF-8''file.bin");
});
