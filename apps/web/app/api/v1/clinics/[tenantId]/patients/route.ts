import { createPatient, listPatients } from "@/modules/patients/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { pageNumber, sameOrigin, patientSearch } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    return json(
      await listPatients(
        (await params).tenantId,
        pageNumber(new URL(request.url).searchParams.get("page")),
        patientSearch(new URL(request.url).searchParams.get("q")),
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
    // The same bounded streamed reader every other mutation route uses.
    const body = await boundedJson(request);
    return json(
      { patient: await createPatient((await params).tenantId, body) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
