import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
export async function meetPost(request: Request, run: (body: unknown) => Promise<unknown>, needsBody = false) {
  if (!sameOrigin(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  if (needsBody && !request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
  try { return json(await run(needsBody ? await boundedJson(request) : null)); }
  catch (error) { return apiError(error); }
}
