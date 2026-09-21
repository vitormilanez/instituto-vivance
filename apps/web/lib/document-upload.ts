
// One reserve → signed upload → complete path for every surface that sends a
// file (documentos da equipe, foto do cadastro, exames do onboarding). Each
// surface keeps its own wording by reading `stage`; the mechanics — timeout,
// payload shape, bucket, order of the three calls — live here only.
export type DocumentUploadStage = "prepare" | "upload" | "complete";

export class DocumentUploadError extends Error {
  readonly stage: DocumentUploadStage;
  // What the API answered, when it answered something usable.
  readonly serverMessage?: string;
  constructor(
    stage: DocumentUploadStage,
    message: string,
    serverMessage?: string,
  ) {
    super(message);
    this.name = "DocumentUploadError";
    this.stage = stage;
    this.serverMessage = serverMessage;
  }
}

type SignedUploader = (input: {
  path: string;
  token: string;
  file: File;
}) => Promise<{ error: unknown }>;

// Imported on demand so this module (and its behaviour tests) never pull the
// browser Supabase client into a server or test process.
const signedUpload: SignedUploader = async ({ path, token, file }) => {
  const [{ createClient }, { documentBucket }] = await Promise.all([
    import("@/lib/supabase/browser"),
    import("@/modules/documents/validation"),
  ]);
  return createClient()
    .storage.from(documentBucket)
    .uploadToSignedUrl(path, token, file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: false,
    });
};

export const documentUploadTimeoutMs = 20_000;

export async function uploadDocument(input: {
  tenantId: string;
  patientId: string;
  file: File;
  category: string;
  visibility: string;
  // Injected by tests; production always uses the signed Supabase upload.
  upload?: SignedUploader;
  fetchImpl?: typeof fetch;
}): Promise<{ documentId: string }> {
  const call = input.fetchImpl ?? fetch;
  const upload = input.upload ?? signedUpload;
  const intent = await call(`/api/v1/clinics/${input.tenantId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(documentUploadTimeoutMs),
    body: JSON.stringify({
      patient_id: input.patientId,
      filename: input.file.name,
      content_type: input.file.type,
      byte_size: input.file.size,
      category: input.category,
      visibility: input.visibility,
    }),
  });
  const prepared = (await intent.json()) as {
    documentId?: string;
    uploadPath?: string;
    uploadToken?: string;
    error?: string;
  };
  if (
    !intent.ok ||
    !prepared.documentId ||
    !prepared.uploadPath ||
    !prepared.uploadToken
  )
    throw new DocumentUploadError(
      "prepare",
      prepared.error ?? "Não foi possível preparar o envio.",
      prepared.error,
    );
  const sent = await upload({
    path: prepared.uploadPath,
    token: prepared.uploadToken,
    file: input.file,
  });
  if (sent.error)
    throw new DocumentUploadError(
      "upload",
      "O arquivo não foi recebido. Tente novamente.",
    );
  const complete = await call(
    `/api/v1/clinics/${input.tenantId}/documents/${prepared.documentId}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(documentUploadTimeoutMs),
      body: JSON.stringify({ confirmed: true }),
    },
  );
  const completed = (await complete.json()) as { error?: string };
  if (!complete.ok)
    throw new DocumentUploadError(
      "complete",
      completed.error ?? "Não foi possível conferir o arquivo.",
      completed.error,
    );
  return { documentId: prepared.documentId };
}
