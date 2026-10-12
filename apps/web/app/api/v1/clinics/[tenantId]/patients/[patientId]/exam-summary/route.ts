import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { generateExamSummary, getExamSummary, reviewExamSummary } from "@/modules/exam-summary/service";
type Context = { params: Promise<{ tenantId: string; patientId: string }> };
export const maxDuration = 120;
export async function GET(_request: Request, context: Context) {
  try { const p=await context.params; return json(await getExamSummary(p.tenantId,p.patientId)); } catch(e) {return apiError(e);}
}
export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return json({ error: "Origem não permitida." },403);
  try { const p=await context.params; return json(await generateExamSummary(p.tenantId,p.patientId)); } catch(e) {return apiError(e);}
}
export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return json({ error: "Origem não permitida." },403);
  try { const p=await context.params; return json(await reviewExamSummary(p.tenantId,p.patientId,await boundedJson(request))); } catch(e) {return apiError(e);}
}
