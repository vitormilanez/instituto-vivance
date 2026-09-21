import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { recordMeal } from "@/modules/meals/service";

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await recordMeal((await params).tenantId, await boundedJson(request, 4000)), 201); }
  catch (error) { return apiError(error); }
}
