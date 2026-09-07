import { boundedBody } from '@/app/lib/api-response';
import { getCurrentUser } from '@/app/lib/auth';
import { AdminError, mutateAdmin, readAdmin } from '@/app/lib/admin';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: 'Entre novamente para continuar.' }, 401);
  try { return json(await readAdmin(user)); }
  catch (e) { return json({ error: e instanceof AdminError ? e.message : 'Não foi possível carregar a administração.' }, e instanceof AdminError ? e.status : 503); }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Solicitação inválida.' }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: 'Entre novamente para continuar.' }, 401);
  let body;
  try { body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 50_000))); } catch { return json({ error: 'Revise os dados enviados.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Revise os dados enviados.' }, 400);
  try { return json(await mutateAdmin(user, body as Record<string, unknown>)); }
  catch (e) { return json({ error: e instanceof AdminError ? e.message : 'Não foi possível salvar. Tente novamente.' }, e instanceof AdminError ? e.status : 503); }
}
