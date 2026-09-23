import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { deletePushSubscription, savePushSubscription } from "@/modules/reminders/service";

type Context = { params: Promise<{ tenantId: string }> };

async function handle(request: Request, context: Context, action: typeof savePushSubscription) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await action((await context.params).tenantId, await boundedJson(request, 4096))); }
  catch (error) { return apiError(error); }
}

export function POST(request: Request, context: Context) {
  return handle(request, context, savePushSubscription);
}

export function DELETE(request: Request, context: Context) {
  return handle(request, context, deletePushSubscription);
}
