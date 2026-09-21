import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { savePatientIntake } from "@/modules/patient-intake/service";
import { patientIntakeMaxBodyBytes } from "@/modules/patient-intake/validation";

type Context = {
  params: Promise<{ tenantId: string; patientId: string }>;
};

export async function PATCH(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, patientId } = await params;
    return json({
      intake: await savePatientIntake(
        tenantId,
        patientId,
        await boundedJson(request, patientIntakeMaxBodyBytes),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
