import { listEncounters, startEncounter } from "@/modules/encounters/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    return json(await listEncounters((await params).tenantId));
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    return json(
      {
        id: await startEncounter(
          (await params).tenantId,
          await boundedJson(request),
        ),
      },
      201,
    );
  } catch (e) {
    return apiError(e);
  }
}
