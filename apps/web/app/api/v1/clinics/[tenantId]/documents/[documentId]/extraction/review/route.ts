import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { reviewExamItem } from "@/modules/exams/service";

type RouteContext = { params: Promise<{ tenantId: string; documentId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const { tenantId, documentId } = await params;
    return json(await reviewExamItem(tenantId, documentId, await request.json()), 201);
  } catch (error) {
    return apiError(error);
  }
}
