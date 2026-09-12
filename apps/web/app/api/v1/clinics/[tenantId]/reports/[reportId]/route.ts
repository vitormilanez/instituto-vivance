import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { saveReport } from "@/modules/reports/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; reportId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para salvar o relatório." }, 415);
  try {
    const { tenantId, reportId } = await params;
    return json(
      await saveReport(
        tenantId,
        reportId,
        await boundedJson(request, 24_000),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
