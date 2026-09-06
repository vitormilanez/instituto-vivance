import { getCurrentUser } from '@/app/lib/auth';
import { boundedBody, sameOrigin, jsonResponse as json } from '@/app/lib/api-response';
import { CareError } from '@/app/lib/care-cycle';
import { MAX_CARE_FILE_BYTES, storeCareFile } from '@/app/lib/care-files';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Origem inválida.' }, 403);
  try {
    const user = await getCurrentUser(); if (!user) return json({ error: 'Sessão expirada.' }, 401);
    if (user.role !== 'patient') return json({ error: 'Use o perfil da paciente para enviar.' }, 403);
    const url = new URL(request.url);
    const bytes = await boundedBody(request, MAX_CARE_FILE_BYTES + 16_384);
    const form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' } }).formData();
    const file = form.get('file');
    if (!file || typeof file === 'string' || form.getAll('file').length !== 1) return json({ error: 'Escolha um arquivo.' }, 400);
    return json({ file: await storeCareFile(user, url.searchParams.get('patientId') ?? '', url.searchParams.get('encounterId') ?? '', file) }, 201);
  } catch (error) {
    if (error instanceof CareError) return json({ error: error.message }, error.status);
    if (error instanceof RangeError) return json({ error: 'O limite é de 8 MB por arquivo.' }, 413);
    console.error('care-files: upload failed'); return json({ error: 'Não foi possível guardar o arquivo. Nenhum envio foi confirmado.' }, 503);
  }
}
