import { meetPost } from "@/modules/google-meet/http";
import { connectMeet } from "@/modules/google-meet/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  return meetPost(request, async () => connectMeet((await params).tenantId));
}
