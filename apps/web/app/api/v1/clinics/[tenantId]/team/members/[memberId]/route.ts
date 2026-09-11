import { manageTeamMember } from "@/modules/team/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ tenantId: string; memberId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, memberId } = await params;
    return json({
      member: await manageTeamMember(
        tenantId,
        memberId,
        await boundedJson(request),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
