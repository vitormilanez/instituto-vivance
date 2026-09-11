import { apiError } from "@/lib/api";
import { documentDownload } from "@/modules/documents/service";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ tenantId: string; documentId: string }> },
) {
  try {
    const { tenantId, documentId } = await params;
    const document = await documentDownload(tenantId, documentId);
    const response = Response.redirect(document.url, 302);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
