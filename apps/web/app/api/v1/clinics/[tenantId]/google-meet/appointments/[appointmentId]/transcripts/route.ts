import { apiError, json } from "@/lib/api";
import { listMeetTranscripts } from "@/modules/google-meet/service";
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string; appointmentId: string }> }) {
  try { const p = await params; return json(await listMeetTranscripts(p.tenantId, p.appointmentId)); } catch (error) { return apiError(error); }
}
