import 'server-only';
import { requireClinic } from '@/modules/identity/service';
import { tenantId } from '@/lib/validation';

export async function listAudit(id: string) {
  const { client } = await requireClinic(tenantId(id), ['admin']);
  const { data, error } = await client.from('audit_events')
    .select('id, action, entity_type, entity_id, actor_user_id, changed_fields, created_at')
    .eq('tenant_id', id).order('created_at', { ascending: false }).order('id').limit(50);
  if (error) throw new Error('Unable to load audit events');
  return data ?? [];
}
