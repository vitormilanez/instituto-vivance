import { meetPost } from "@/modules/google-meet/http";
import { confirmMeetConsent } from "@/modules/google-meet/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; appointmentId: string }> }) {
  return meetPost(request, async (body) => { const p = await params; return confirmMeetConsent(p.tenantId, p.appointmentId, body); }, true);
}
