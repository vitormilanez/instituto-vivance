import { meetPost } from "@/modules/google-meet/http";
import { reviewMeetTranscript } from "@/modules/google-meet/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; appointmentId: string; transcriptId: string }> }) {
  return meetPost(request, async (body) => { const p = await params; return reviewMeetTranscript(p.tenantId, p.appointmentId, p.transcriptId, body); }, true);
}
