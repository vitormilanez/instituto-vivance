import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { approveReport } from "@/modules/reports/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; reportId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para aprovar o relatório." }, 415);
  try {
    const { tenantId, reportId } = await params;
    return json(
      await approveReport(
        tenantId,
        reportId,
        await boundedJson(request, 2048),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
