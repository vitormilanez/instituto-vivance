import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { saveReminderPreference } from "@/modules/reminders/service";

export async function PUT(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await saveReminderPreference((await params).tenantId, await boundedJson(request, 512))); }
  catch (error) { return apiError(error); }
}
