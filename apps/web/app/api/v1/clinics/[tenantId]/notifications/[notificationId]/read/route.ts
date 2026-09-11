import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { markInAppNotificationRead } from "@/modules/notifications/service";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ tenantId: string; notificationId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const { tenantId, notificationId } = await params;
    return json(await markInAppNotificationRead(tenantId, notificationId));
  } catch (error) {
    return apiError(error);
  }
}
