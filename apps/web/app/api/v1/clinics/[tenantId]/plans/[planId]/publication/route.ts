import {
  publishPlan,
  withdrawPlan,
} from "@/modules/care-plans/publication-service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string; planId: string }> };
async function mutate(
  request: Request,
  { params }: Context,
  withdraw: boolean,
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const p = await params,
      input = await boundedJson(request, 8000);
    return json(
      await (withdraw ? withdrawPlan : publishPlan)(
        p.tenantId,
        p.planId,
        input,
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request, context: Context) {
  return mutate(request, context, false);
}
export async function DELETE(request: Request, context: Context) {
  return mutate(request, context, true);
}
