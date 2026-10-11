import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { resumeDocumentExtraction } from "@/modules/exams/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; documentId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const { tenantId, documentId } = await params;
    const data = await resumeDocumentExtraction(tenantId, documentId);
    return json({ data }, data.resumed ? 202 : 200);
  } catch (error) {
    return apiError(error);
  }
}
