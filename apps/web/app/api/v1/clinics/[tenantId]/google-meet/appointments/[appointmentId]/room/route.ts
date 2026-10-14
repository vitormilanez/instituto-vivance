import { meetPost } from "@/modules/google-meet/http";
import { createMeetRoom } from "@/modules/google-meet/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; appointmentId: string }> }) {
  return meetPost(request, async () => { const p = await params; return createMeetRoom(p.tenantId, p.appointmentId); });
}
