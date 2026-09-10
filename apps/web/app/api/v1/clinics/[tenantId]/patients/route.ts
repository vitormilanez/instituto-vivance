import { createPatient, listPatients } from "@/modules/patients/service";
import { apiError, json } from "@/lib/api";
import { pageNumber, sameOrigin } from "@/lib/validation";
type Context = { params: Promise<{ tenantId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    return json(
      await listPatients(
        (await params).tenantId,
        pageNumber(new URL(request.url).searchParams.get("page")),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    // Bound the streamed body, not only its optional Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Cadastro vazio." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return json({ error: "Cadastro muito grande." }, 413);
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return json(
      { patient: await createPatient((await params).tenantId, body) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
