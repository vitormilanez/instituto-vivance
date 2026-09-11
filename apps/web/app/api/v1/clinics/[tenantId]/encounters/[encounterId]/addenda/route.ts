import { createEncounterAddendum } from "@/modules/encounters/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";

type Context = { params: Promise<{ tenantId: string; encounterId: string }> };

export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, encounterId } = await params;
    return json(
      await createEncounterAddendum(
        tenantId,
        encounterId,
        await boundedJson(request, 48000),
      ),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
