import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { outreachPreview, sendOutreachBatch } from "@/modules/messages/outreach-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    return json(await outreachPreview((await params).tenantId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON para enviar a mensagem." }, 415);
  try {
    return json(await sendOutreachBatch((await params).tenantId, await boundedJson(request, 20_000), request.headers.get("idempotency-key")));
  } catch (error) { return apiError(error); }
}
