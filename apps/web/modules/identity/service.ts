import 'server-only';
import { createClient } from '@/lib/supabase/server';

export class AccessError extends Error {
  constructor(public status: 401 | 403) { super(status === 401 ? 'Entre na sua conta.' : 'Você não tem acesso a esta clínica.'); }
}
export const roleLabels: Record<string, string> = { admin: 'Administrador', doctor: 'Médico', nurse: 'Enfermagem', patient: 'Paciente' };
export type ClinicAccess = { id: string; name: string; role: string };

export async function identity() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessError(401);
  return { client, user: data.user };
}

export async function clinics() {
  const { client, user } = await identity();
  const { data, error } = await client.from('memberships')
    .select('tenant_id, role, tenants!inner(id, name)').eq('user_id', user.id).eq('status', 'active');
  if (error) throw new Error('Unable to load memberships');
  return { client, user, clinics: (data ?? []).map(m => ({ ...m.tenants, role: m.role })) satisfies ClinicAccess[] };
}

export async function requireClinic(id: string, roles = ['admin', 'doctor', 'nurse']) {
  const context = await clinics();
  const clinic = context.clinics.find(c => c.id === id && roles.includes(c.role));
  if (!clinic) throw new AccessError(403);
  return { ...context, clinic };
}
