import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { markDirectMessagesRead } from "@/modules/messages/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para registrar a leitura." }, 415);
  try {
    return json(
      await markDirectMessagesRead(
        (await params).tenantId,
        await boundedJson(request, 4096),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
