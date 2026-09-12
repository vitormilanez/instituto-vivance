import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { reopenReport } from "@/modules/reports/publication-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; reportId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para criar uma nova versão." }, 415);
  try {
    const { tenantId, reportId } = await params;
    return json(
      await reopenReport(
        tenantId,
        reportId,
        await boundedJson(request, 2048),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
