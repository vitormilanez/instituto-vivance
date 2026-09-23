import { markReceivedRead } from "@/modules/workspace/received";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";

// Marca como aberto, pelo profissional logado, um item que o paciente enviou.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    return json(
      await markReceivedRead((await params).tenantId, await boundedJson(request, 500)),
    );
  } catch (error) {
    return apiError(error);
  }
}
