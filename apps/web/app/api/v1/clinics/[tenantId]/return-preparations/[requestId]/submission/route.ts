import { submitReturnPreparation } from "@/modules/return-preparation/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; requestId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const value = await params;
    return json(await submitReturnPreparation(value.tenantId, value.requestId, await boundedJson(request, 24_000)), 201);
  } catch (error) {
    return apiError(error);
  }
}
