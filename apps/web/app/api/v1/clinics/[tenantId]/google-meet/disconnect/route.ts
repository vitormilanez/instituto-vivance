import { meetPost } from "@/modules/google-meet/http";
import { disconnectMeet } from "@/modules/google-meet/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  return meetPost(request, async () => disconnectMeet((await params).tenantId));
}
