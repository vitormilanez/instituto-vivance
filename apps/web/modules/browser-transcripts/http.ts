import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
export async function browserTranscriptPost(request: Request, run: (body: unknown) => Promise<unknown>, maxBytes = 600000) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await run(await boundedJson(request, maxBytes))); } catch (error) { return apiError(error); }
}
