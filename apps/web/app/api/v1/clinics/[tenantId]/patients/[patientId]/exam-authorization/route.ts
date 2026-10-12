import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin, InputError } from "@/lib/validation";
import { authorizeExamDocuments } from "@/modules/documents/service";
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string; patientId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const body = await boundedJson(request, 4096) as Record<string, unknown>;
    if (!Array.isArray(body.document_ids) || body.document_ids.length < 1 || body.document_ids.length > 15 || body.document_ids.some(id => typeof id !== "string") || body.confirmed_synthetic !== true || Object.keys(body).some(key => !["document_ids", "confirmed_synthetic"].includes(key))) throw new InputError("Confirme os dados de teste e selecione até 15 documentos.");
    const p = await params;
    return json(await authorizeExamDocuments(p.tenantId, p.patientId, body.document_ids as string[], true));
  } catch (error) { return apiError(error); }
}
