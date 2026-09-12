import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { reviewDocument } from "@/modules/documents/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; documentId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para registrar a revisão." }, 415);
  try {
    const { tenantId, documentId } = await params;
    return json(
      await reviewDocument(
        tenantId,
        documentId,
        await boundedJson(request, 4096),
      ),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
