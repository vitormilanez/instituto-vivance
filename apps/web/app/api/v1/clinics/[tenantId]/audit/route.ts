import { listAudit } from "@/modules/audit/service";
import { apiError, json } from "@/lib/api";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    return json({ events: await listAudit((await params).tenantId) });
  } catch (error) {
    return apiError(error);
  }
}
