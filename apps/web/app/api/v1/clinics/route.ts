import { clinics } from '@/modules/identity/service';
import { apiError, json } from '@/lib/api';
export async function GET() {
  try { return json({ clinics: (await clinics()).clinics }); }
  catch (error) { return apiError(error); }
}
