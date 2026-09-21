import { InputError } from "./validation";
import { DomainError } from "./errors";

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function apiError(error: unknown) {
  // Every module's error extends DomainError and carries its own status.
  if (error instanceof DomainError)
    return json({ error: error.message }, error.status);
  if (error instanceof InputError || error instanceof SyntaxError)
    return json(
      {
        error: error instanceof InputError ? error.message : "Dados inválidos.",
      },
      400,
    );
  const requestId = crypto.randomUUID();
  // Do not log request bodies, database errors, names, credentials or health data.
  console.error(JSON.stringify({ event: "request_failed", requestId }));
  return json(
    { error: "Não foi possível concluir. Tente novamente.", requestId },
    503,
  );
}

export async function boundedJson(request: Request, maxBytes = 4096) {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Solicitação vazia.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new InputError("Solicitação muito grande.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
