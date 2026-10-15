import { apiError, json } from "@/lib/api";
import { consultationWorkflowPost } from "@/modules/consultation-workflow/http";
import {
  getConsultationWorkflow,
  runConsultationWorkflowAction,
} from "@/modules/consultation-workflow/service";

type Context = { params: Promise<{ tenantId: string; appointmentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const value = await params;
    return json(await getConsultationWorkflow(value.tenantId, value.appointmentId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  return consultationWorkflowPost(request, async (body) => {
    const value = await params;
    return runConsultationWorkflowAction(value.tenantId, value.appointmentId, body);
  });
}
