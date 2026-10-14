import { apiError, json } from "@/lib/api";
import { meetStatus } from "@/modules/google-meet/service";
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  try { return json(await meetStatus((await params).tenantId)); } catch (error) { return apiError(error); }
}
