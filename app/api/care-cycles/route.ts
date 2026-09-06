import { getCurrentUser } from '@/app/lib/auth';
import { careAccess, loadCycle, mutateCycle, CareError } from '@/app/lib/care-cycle';
import { validCycleMutation, patientCycleView } from '@/app/lib/care-cycle-contract';
import { jsonResponse as json, sameOrigin, boundedBody } from '@/app/lib/api-response';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await getCurrentUser(); if (!user) return json({ error: 'Sessão expirada.' }, 401);
    const access = await careAccess(user);
    const cycles = await Promise.all(access.map(async (item) => {
      const { cycle } = await loadCycle(item); return user.role === 'patient' ? patientCycleView(cycle) : cycle;
    }));
    return json({ actorId: user.id, role: user.role, cycles });
  } catch { console.error('care-cycles: load failed'); return json({ error: 'Não foi possível atualizar o acompanhamento.' }, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Origem inválida.' }, 403);
  try {
    const user = await getCurrentUser(); if (!user) return json({ error: 'Sessão expirada.' }, 401);
    let input: unknown;
    try { input = JSON.parse(new TextDecoder().decode(await boundedBody(request, 120_000))); }
    catch { return json({ error: 'Envio inválido ou acima do limite.' }, 400); }
    if (!validCycleMutation(input)) return json({ error: 'Ação inválida.' }, 400);
    return json(await mutateCycle(user, input));
  } catch (error) {
    if (error instanceof CareError) return json({ error: error.message }, error.status);
    console.error('care-cycles: mutation failed');
    return json({ error: 'Não foi possível salvar. Preserve o texto e tente novamente.' }, 503);
  }
}
