import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { documentCompletion } from "@/modules/documents/validation";
import { completeDocument } from "@/modules/documents/service";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ tenantId: string; documentId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para concluir o envio." }, 415);
  try {
    documentCompletion(await boundedJson(request, 512));
    const { tenantId, documentId } = await params;
    return json(await completeDocument(tenantId, documentId));
  } catch (error) {
    return apiError(error);
  }
}
