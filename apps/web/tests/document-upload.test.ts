import assert from "node:assert/strict";
import test from "node:test";
import {
  DocumentUploadError,
  uploadDocument,
} from "../lib/document-upload.ts";

const file = () =>
  new File([new Uint8Array([1, 2, 3])], "exame.pdf", {
    type: "application/pdf",
  });

type Call = { url: string; body: unknown };

function fetchStub(
  answers: { ok: boolean; body: Record<string, unknown> }[],
  calls: Call[],
) {
  let index = 0;
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const answer = answers[index++];
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return {
      ok: answer.ok,
      json: async () => answer.body,
    } as Response;
  }) as unknown as typeof fetch;
}

test("reserves, sends to the signed URL and completes, in that order", async () => {
  const calls: Call[] = [];
  const uploaded: { path: string; token: string }[] = [];
  const result = await uploadDocument({
    tenantId: "clinica-1",
    patientId: "paciente-1",
    file: file(),
    category: "exam",
    visibility: "internal",
    fetchImpl: fetchStub(
      [
        {
          ok: true,
          body: {
            documentId: "doc-1",
            uploadPath: "clinica-1/doc-1",
            uploadToken: "token-1",
          },
        },
        { ok: true, body: {} },
      ],
      calls,
    ),
    upload: async ({ path, token }) => {
      // The document only completes after the bytes were accepted.
      assert.equal(calls.length, 1);
      uploaded.push({ path, token });
      return { error: null };
    },
  });
  assert.deepEqual(result, { documentId: "doc-1" });
  assert.deepEqual(uploaded, [{ path: "clinica-1/doc-1", token: "token-1" }]);
  assert.equal(calls[0].url, "/api/v1/clinics/clinica-1/documents");
  assert.deepEqual(calls[0].body, {
    patient_id: "paciente-1",
    filename: "exame.pdf",
    content_type: "application/pdf",
    byte_size: 3,
    category: "exam",
    visibility: "internal",
  });
  assert.equal(
    calls[1].url,
    "/api/v1/clinics/clinica-1/documents/doc-1/complete",
  );
  assert.deepEqual(calls[1].body, { confirmed: true });
});

test("a refused reservation never reaches the storage bucket", async () => {
  const calls: Call[] = [];
  let attempted = false;
  const error = await uploadDocument({
    tenantId: "clinica-1",
    patientId: "paciente-1",
    file: file(),
    category: "exam",
    visibility: "internal",
    fetchImpl: fetchStub(
      [{ ok: false, body: { error: "Vínculo de cuidado inativo." } }],
      calls,
    ),
    upload: async () => {
      attempted = true;
      return { error: null };
    },
  }).catch((reason) => reason);
  assert.equal(attempted, false);
  assert.ok(error instanceof DocumentUploadError);
  assert.equal(error.stage, "prepare");
  assert.equal(error.serverMessage, "Vínculo de cuidado inativo.");
});

test("a rejected upload is reported as upload, not as completion", async () => {
  const calls: Call[] = [];
  const error = await uploadDocument({
    tenantId: "clinica-1",
    patientId: "paciente-1",
    file: file(),
    category: "clinical_document",
    visibility: "shared",
    fetchImpl: fetchStub(
      [
        {
          ok: true,
          body: {
            documentId: "doc-2",
            uploadPath: "clinica-1/doc-2",
            uploadToken: "token-2",
          },
        },
      ],
      calls,
    ),
    upload: async () => ({ error: new Error("storage") }),
  }).catch((reason) => reason);
  assert.ok(error instanceof DocumentUploadError);
  assert.equal(error.stage, "upload");
  // The document is never confirmed when the bytes did not arrive.
  assert.equal(calls.length, 1);
});
