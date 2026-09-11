import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { setInAppNotificationPreference } from "@/modules/notifications/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para atualizar os avisos." }, 415);
  try {
    return json(
      await setInAppNotificationPreference(
        (await params).tenantId,
        await boundedJson(request, 512),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
