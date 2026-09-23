import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { setCheckInSettings } from "@/modules/daily-check-ins/service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; patientId: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, patientId } = await params;
    return json(await setCheckInSettings(tenantId, patientId, await boundedJson(request, 1024)));
  } catch (error) {
    return apiError(error);
  }
}
