import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { createPatientInvitation, listClinicPatientInvitations } from "@/modules/onboarding/service";

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  try { return json(await listClinicPatientInvitations((await params).tenantId)); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await createPatientInvitation((await params).tenantId, await boundedJson(request)), 201); }
  catch (error) { return apiError(error); }
}
