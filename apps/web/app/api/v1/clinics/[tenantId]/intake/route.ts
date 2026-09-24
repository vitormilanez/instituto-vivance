import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { initializeOwnPatientIntake } from "@/modules/patient-intake/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    return json(
      { intake: await initializeOwnPatientIntake((await params).tenantId) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
