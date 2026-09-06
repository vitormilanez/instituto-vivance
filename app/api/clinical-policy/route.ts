import { getCurrentUser } from '@/app/lib/auth';
import { boundedBody, jsonResponse, sameOrigin } from '@/app/lib/api-response';
import { mutatePolicy, PolicyError, readPolicy } from '@/app/lib/clinical-policy';

export const dynamic = 'force-dynamic';
function failure(error: unknown) {
  if (error instanceof PolicyError) return jsonResponse({ error: error.message }, error.status);
  if (error instanceof RangeError) return jsonResponse({ error: 'Configuração acima do limite permitido.' }, 413);
  if (error instanceof SyntaxError) return jsonResponse({ error: 'Configuração inválida.' }, 400);
  console.error('clinical-policy: operation failed');
  return jsonResponse({ error: 'Central indisponível. Seu rascunho permanece no editor; atualize antes de repetir uma ação.' }, 503);
}
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonResponse({ error: 'Entre novamente para acessar a Central.' }, 401);
    return jsonResponse(await readPolicy(user));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonResponse({ error: 'Solicitação inválida.' }, 403);
  try {
    const user = await getCurrentUser();
    if (!user) return jsonResponse({ error: 'Entre novamente para acessar a Central.' }, 401);
    if (user.role !== 'professional') return jsonResponse({ error: 'Acesso exclusivo dos médicos autorizados.' }, 403);
    const input: unknown = JSON.parse(new TextDecoder().decode(await boundedBody(request, 300_000)));
    return jsonResponse(await mutatePolicy(user, input));
  } catch (error) { return failure(error); }
}
