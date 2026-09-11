import { acknowledgePlan } from "@/modules/care-plans/publication-service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; publicationId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const p = await params;
    return json(
      await acknowledgePlan(
        p.tenantId,
        p.publicationId,
        await boundedJson(request),
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
