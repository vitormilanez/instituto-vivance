import { meetPost } from "@/modules/google-meet/http";
import { syncMeetTranscripts } from "@/modules/google-meet/service";
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; appointmentId: string }> }) {
  return meetPost(request, async () => { const p = await params; return syncMeetTranscripts(p.tenantId, p.appointmentId); });
}
