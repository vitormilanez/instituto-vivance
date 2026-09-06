import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { listSynthesisVersions, saveSynthesisVersion, synthesisAccess } from '@/app/lib/clinical-synthesis';
import { parseSynthesisSave } from '@/app/lib/clinical-synthesis-contract';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return response({ error: 'Sessão expirada.' }, 401);
    const params = new URL(request.url).searchParams;
    const encounterId = params.get('encounterId') ?? '';
    const access = await synthesisAccess(user, params.get('patientId') ?? '', encounterId);
    if (!access) return response({ error: 'Síntese indisponível para este vínculo de acompanhamento.' }, 403);
    return response({ artifacts: await listSynthesisVersions(access.id, encounterId) });
  } catch {
    console.error('clinical-synthesis: failed to load versions');
    return response({ error: 'Não foi possível carregar a síntese salva. Tente novamente.' }, 503);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return response({ error: 'Solicitação inválida.' }, 403);
  }
  try {
    const user = await getCurrentUser();
    if (!user) return response({ error: 'Sessão expirada.' }, 401);
    if (user.role !== 'professional') return response({ error: 'Apenas o médico responsável pode salvar uma revisão.' }, 403);
    // Bound the body before parsing, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return response({ error: 'Síntese inválida.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 100_000) { await reader.cancel(); return response({ error: 'Síntese muito extensa.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input;
    try { input = parseSynthesisSave(JSON.parse(new TextDecoder().decode(bytes))); }
    catch { return response({ error: 'Síntese inválida.' }, 400); }
    if (!input) return response({ error: 'Síntese inválida.' }, 400);
    const access = await synthesisAccess(user, input.patientId, input.encounterId);
    if (!access) return response({ error: 'Síntese indisponível para este vínculo de acompanhamento.' }, 403);
    const result = await saveSynthesisVersion(user, access.id, input);
    return 'error' in result ? response({ error: result.error }, result.status) : response(result, 201);
  } catch {
    console.error('clinical-synthesis: failed to save revision');
    return response({ error: 'Não foi possível salvar. Seu texto continua no editor; tente novamente.' }, 503);
  }
}
