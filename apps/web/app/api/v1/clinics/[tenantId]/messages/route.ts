import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { sendDirectMessage } from "@/modules/messages/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para enviar a mensagem." }, 415);
  try {
    return json(
      await sendDirectMessage(
        (await params).tenantId,
        await boundedJson(request, 8192),
      ),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
