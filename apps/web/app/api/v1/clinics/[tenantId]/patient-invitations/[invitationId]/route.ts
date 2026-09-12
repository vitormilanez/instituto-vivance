import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { revokePatientInvitation } from "@/modules/onboarding/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string; invitationId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try {
    const body = await boundedJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || (body as { action?: unknown }).action !== "revoke")
      return json({ error: "Confirme a revogação do convite." }, 400);
    const { tenantId, invitationId } = await params;
    return json(await revokePatientInvitation(tenantId, invitationId));
  } catch (error) { return apiError(error); }
}
