import { getD1 } from '@/db';
import type { AppUser } from './auth';
export type CarePerson = { id: string; name: string; email: string; phone: string; relationshipId: string | null; doctorName: string | null; doctorId: string | null };
export async function careDirectory(user: AppUser): Promise<CarePerson[]> {
  if (user.role === 'admin') return [];
  const result = await getD1().prepare(`SELECT p.patient_id AS id, p.display_name AS name, p.email, p.phone,
    r.id AS relationshipId, d.display_name AS doctorName, d.id AS doctorId
    FROM users p LEFT JOIN care_relationships r ON r.patient_user_id = p.id AND r.status = 'active'
    LEFT JOIN users d ON d.id = r.professional_user_id
    WHERE p.role = 'patient' AND ((? = 'professional' AND r.professional_user_id = ?) OR (? = 'patient' AND p.id = ? AND p.patient_id = ?))
    ORDER BY p.display_name COLLATE NOCASE`).bind(user.role, user.id, user.role, user.id, user.patientId).all<CarePerson>();
  return result.results;
}
export async function carePerson(user: AppUser, patientId: string) { return (await careDirectory(user)).find(person => person.id === patientId) ?? null; }
