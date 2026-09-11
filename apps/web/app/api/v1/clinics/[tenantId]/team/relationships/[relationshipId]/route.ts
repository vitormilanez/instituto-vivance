import { changeCareRelationship } from "@/modules/team/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ tenantId: string; relationshipId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, relationshipId } = await params;
    return json({
      relationship: await changeCareRelationship(
        tenantId,
        relationshipId,
        await boundedJson(request),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
