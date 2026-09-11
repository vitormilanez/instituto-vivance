import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { reserveDocument } from "@/modules/documents/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para preparar o envio." }, 415);
  try {
    return json(
      await reserveDocument(
        (await params).tenantId,
        await boundedJson(request, 4096),
      ),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
