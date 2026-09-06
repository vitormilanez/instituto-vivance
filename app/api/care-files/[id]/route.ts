import { getCurrentUser } from '@/app/lib/auth';
import { readCareFile } from '@/app/lib/care-files';
import { CareError } from '@/app/lib/care-cycle';
import { jsonResponse as json } from '@/app/lib/api-response';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return json({ error: 'Sessão expirada.' }, 401);
    const { file, object } = await readCareFile(user, (await context.params).id);
    return new Response(object.body, { headers: {
      'Content-Type': file.mediaType, 'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  } catch (error) { return json({ error: error instanceof CareError ? error.message : 'Arquivo indisponível.' }, error instanceof CareError ? error.status : 503); }
}
