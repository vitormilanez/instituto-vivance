import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import {
  publishReport,
  withdrawReport,
} from "@/modules/reports/publication-service";

async function input(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON para alterar a publicação." }, 415);
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; reportId: string }> },
) {
  const invalid = await input(request);
  if (invalid) return invalid;
  try {
    const { tenantId, reportId } = await params;
    return json(
      await publishReport(
        tenantId,
        reportId,
        await boundedJson(request, 16_384),
      ),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; reportId: string }> },
) {
  const invalid = await input(request);
  if (invalid) return invalid;
  try {
    const { tenantId, reportId } = await params;
    return json(
      await withdrawReport(
        tenantId,
        reportId,
        await boundedJson(request, 4096),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
