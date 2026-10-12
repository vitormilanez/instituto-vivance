import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { createClinicalSource, examClinicalLibrary, reviewClinicalSource } from "@/modules/exam-library/service";
export const runtime = "nodejs";
type Context = { params: Promise<{ tenantId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { return json({ data: await examClinicalLibrary((await params).tenantId) }); }
  catch(error) { return apiError(error); }
}
export async function POST(request: Request,{ params }: Context) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." },403);
  try { return json({ data: await createClinicalSource((await params).tenantId,await boundedJson(request,24000)) },201); }
  catch(error) { return apiError(error); }
}
export async function PATCH(request: Request,{ params }: Context) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." },403);
  try { return json({ data: await reviewClinicalSource((await params).tenantId,await boundedJson(request)) }); }
  catch(error) { return apiError(error); }
}
