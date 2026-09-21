import assert from "node:assert/strict";
import test from "node:test";
import { documentDownloadResponse } from "../modules/documents/download-response.ts";

test("authorized document downloads redirect privately to the signed original", async () => {
  const signedUrl =
    "https://storage.example.test/object/sign/vivance-documents/exam.pdf?token=synthetic%2Btoken&download=exam.pdf";
  // Use the real Web Response implementation: mutating Response.redirect's
  // headers throws in the production Node runtime before it can return a 302.
  const response = documentDownloadResponse(signedUrl);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), signedUrl);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(await response.text(), "");
});
