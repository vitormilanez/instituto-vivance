import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { claimPatientInvitation } from "@/modules/onboarding/service";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await claimPatientInvitation(await boundedJson(request)), 202); }
  catch (error) { return apiError(error); }
}
