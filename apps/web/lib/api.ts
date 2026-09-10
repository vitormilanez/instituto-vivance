import { AccessError } from '@/modules/identity/service';
import { InputError } from './validation';

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function apiError(error: unknown) {
  if (error instanceof AccessError) return json({ error: error.message }, error.status);
  if (error instanceof InputError || error instanceof SyntaxError) return json({ error: error instanceof InputError ? error.message : 'Dados inválidos.' }, 400);
  const requestId = crypto.randomUUID();
  // Do not log request bodies, database errors, names, credentials or health data.
  console.error(JSON.stringify({ event: 'request_failed', requestId }));
  return json({ error: 'Não foi possível concluir. Tente novamente.', requestId }, 503);
}
