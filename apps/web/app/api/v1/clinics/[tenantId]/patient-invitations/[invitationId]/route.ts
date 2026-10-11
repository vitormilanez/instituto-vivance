import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { archivePatientInvitation, revokePatientInvitation } from "@/modules/onboarding/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string; invitationId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try {
    const body = await boundedJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Confirme a ação sobre o convite." }, 400);
    const { tenantId, invitationId } = await params;
    const values = body as { action?: unknown; confirm?: unknown };
    if (values.action === "revoke" && Object.keys(values).length === 1)
      return json(await revokePatientInvitation(tenantId, invitationId));
    if (values.action === "archive" && values.confirm === true && Object.keys(values).length === 2)
      return json(await archivePatientInvitation(tenantId, invitationId));
    return json({ error: values.action === "archive" ? "Confirme a exclusão da lista." : "Confirme a revogação do convite." }, 400);
  } catch (error) { return apiError(error); }
}
