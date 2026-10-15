import { apiError, json } from "@/lib/api";
import { getPatientConsultationHistory } from "@/modules/consultation-workflow/service";

type Context = { params: Promise<{ tenantId: string; patientId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const value = await params;
    return json(await getPatientConsultationHistory(value.tenantId, value.patientId));
  } catch (error) {
    return apiError(error);
  }
}
