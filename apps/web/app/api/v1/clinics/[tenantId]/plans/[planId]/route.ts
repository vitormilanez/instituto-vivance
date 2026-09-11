import { loadPlan, savePlan } from "@/modules/care-plans/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string; planId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const p = await params;
    return json(await loadPlan(p.tenantId, p.planId));
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const p = await params;
    return json(
      await savePlan(p.tenantId, p.planId, await boundedJson(request, 80000)),
    );
  } catch (e) {
    return apiError(e);
  }
}
