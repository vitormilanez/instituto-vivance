import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { documentExtraction, enqueueDocumentText } from "@/modules/exams/service";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ tenantId: string; documentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { tenantId, documentId } = await params;
    return json(await documentExtraction(tenantId, documentId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const { tenantId, documentId } = await params;
    const queued = await enqueueDocumentText(tenantId, documentId);
    return json(queued, 202);
  } catch (error) {
    return apiError(error);
  }
}
