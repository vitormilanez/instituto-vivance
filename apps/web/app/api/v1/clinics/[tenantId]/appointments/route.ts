import { createAppointment, listAppointments } from "@/modules/agenda/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const q = new URL(request.url).searchParams;
    return json(
      await listAppointments(
        (await params).tenantId,
        q.get("from") ?? "",
        q.get("until") ?? "",
      ),
    );
  } catch (error) {
    return apiError(error);
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
        appointment: await createAppointment(
          (await params).tenantId,
          await boundedJson(request),
        ),
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
