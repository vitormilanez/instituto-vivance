import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { startRequiredPreparation } from "@/modules/return-preparation/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    return json(await startRequiredPreparation((await params).tenantId), 201);
  } catch (error) {
    return apiError(error);
  }
}
