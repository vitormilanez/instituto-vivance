import { loadTeamWorkspace } from "@/modules/team/service";
import { apiError, json } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    return json({ team: await loadTeamWorkspace((await params).tenantId) });
  } catch (error) {
    return apiError(error);
  }
}
