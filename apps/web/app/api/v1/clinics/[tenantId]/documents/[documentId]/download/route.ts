import { apiError } from "@/lib/api";
import { documentDownload } from "@/modules/documents/service";
import { documentDownloadResponse } from "@/modules/documents/download-response";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ tenantId: string; documentId: string }> },
) {
  try {
    const { tenantId, documentId } = await params;
    const document = await documentDownload(tenantId, documentId);
    return documentDownloadResponse(document.url);
  } catch (error) {
    return apiError(error);
  }
}
