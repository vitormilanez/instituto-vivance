import { assignCareRelationship } from "@/modules/team/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";

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
      {
        relationship: await assignCareRelationship(
          (await params).tenantId,
          await boundedJson(request),
        ),
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
