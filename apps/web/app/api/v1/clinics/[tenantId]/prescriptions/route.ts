import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { addPrescription, listPrescriptions } from "@/modules/prescriptions/service";
import { prescriptionCursor } from "@/modules/prescriptions/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const search = new URL(request.url).searchParams;
    const patientId = search.get("patient_id");
    if (!patientId) return json({ error: "Paciente não informado." }, 400);
    const cursor = prescriptionCursor(
      search.get("before_prescribed_on"),
      search.get("before_created_at"),
      search.get("before_id"),
    );
    return json(await listPrescriptions((await params).tenantId, patientId, cursor));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para adicionar ao histórico." }, 415);
  try {
    return json(
      await addPrescription((await params).tenantId, await boundedJson(request, 12_000)),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
