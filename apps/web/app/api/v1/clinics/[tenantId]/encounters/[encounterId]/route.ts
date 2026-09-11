import { loadEncounter, saveEncounter } from "@/modules/encounters/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string; encounterId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const p = await params;
    return json(await loadEncounter(p.tenantId, p.encounterId));
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const p = await params;
    return json(
      await saveEncounter(
        p.tenantId,
        p.encounterId,
        await boundedJson(request, 64000),
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
