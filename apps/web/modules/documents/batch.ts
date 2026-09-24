import { uploadDocument } from "../../lib/document-upload.ts";

type BatchFile = { key: string; file: File };
type Upload = typeof uploadDocument;
type Result = { key: string; documentId: string | null; error: unknown };

// Each document has its own reserve/upload/complete transaction. A failure in
// one file never prevents the remaining selected files from being attempted.
export async function uploadPatientDocumentBatch(
  input: { tenantId: string; patientId: string; category: "exam" | "clinical_document"; files: BatchFile[] },
  onResult: (result: Result) => void,
  upload: Upload = uploadDocument,
) {
  let sent = 0;
  for (const item of input.files) {
    try {
      const { documentId } = await upload({
        tenantId: input.tenantId,
        patientId: input.patientId,
        file: item.file,
        category: input.category,
        visibility: "shared",
      });
      sent++;
      onResult({ key: item.key, documentId, error: null });
    } catch (error) {
      onResult({ key: item.key, documentId: null, error });
    }
  }
  return sent;
}
