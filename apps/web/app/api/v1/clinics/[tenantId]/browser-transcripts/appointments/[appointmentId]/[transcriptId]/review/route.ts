import { browserTranscriptPost } from "@/modules/browser-transcripts/http";
import { reviewBrowserTranscript } from "@/modules/browser-transcripts/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; appointmentId: string; transcriptId: string }> }) {
  return browserTranscriptPost(request, async (body) => { const p = await params; return reviewBrowserTranscript(p.tenantId, p.appointmentId, p.transcriptId, body); }, 12000);
}
