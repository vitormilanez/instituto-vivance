import { getCurrentUser } from '@/app/lib/auth';
import { jsonResponse } from '@/app/lib/api-response';
import { readPatientPolicy, PolicyError } from '@/app/lib/clinical-policy';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonResponse({ error: 'Entre novamente.' }, 401);
    return jsonResponse(await readPatientPolicy(user));
  } catch (error) {
    return jsonResponse({ error: error instanceof PolicyError ? error.message : 'Contexto da IA indisponível.' }, error instanceof PolicyError ? error.status : 503);
  }
}
