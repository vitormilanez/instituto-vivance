import { apiError, json } from "@/lib/api";
import { browserTranscriptPost } from "@/modules/browser-transcripts/http";
import { listBrowserTranscripts, saveBrowserTranscript } from "@/modules/browser-transcripts/service";
type Context = { params: Promise<{ tenantId: string; appointmentId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { const p = await params; return json(await listBrowserTranscripts(p.tenantId, p.appointmentId)); } catch (error) { return apiError(error); }
}
export async function POST(request: Request, { params }: Context) {
  return browserTranscriptPost(request, async (body) => { const p = await params; return saveBrowserTranscript(p.tenantId, p.appointmentId, body); });
}
