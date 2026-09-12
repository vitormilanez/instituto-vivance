import { apiError, json } from "@/lib/api";
import { getSubmittedPatientOnboarding } from "@/modules/onboarding/service";

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string; patientId: string }> }) {
  try { const { tenantId, patientId } = await params; return json({ submission: await getSubmittedPatientOnboarding(tenantId, patientId) }); }
  catch (error) { return apiError(error); }
}
