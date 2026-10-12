import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { examUploadQuota, changeExamUploadQuota } from "@/modules/documents/quota-service";
type Context = { params: Promise<{ tenantId: string; patientId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { const p = await params; return json(await examUploadQuota(p.tenantId, p.patientId)); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  try { const p = await params; return json(await changeExamUploadQuota(p.tenantId, p.patientId, await boundedJson(request, 4096))); }
  catch (error) { return apiError(error); }
}
