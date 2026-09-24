import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import {
  getAppointmentTeleconsultation,
  saveAppointmentTeleconsultation,
} from "@/modules/teleconsultations/service";

type Context = {
  params: Promise<{ tenantId: string; appointmentId: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  try {
    const { tenantId, appointmentId } = await params;
    return json({
      teleconsultation: await getAppointmentTeleconsultation(
        tenantId,
        appointmentId,
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, appointmentId } = await params;
    return json({
      teleconsultation: await saveAppointmentTeleconsultation(
        tenantId,
        appointmentId,
        await boundedJson(request),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
