import { getD1 } from '@/db';
import { hashPassword, type AppUser, type AppRole } from './auth';

export class AdminError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type DirectoryUser = AppUser & { email: string; phone: string; professionalRegistration: string; status: 'active' | 'blocked'; revision: number; createdAt: string };
export type DirectoryLink = { id: string; patientUserId: string; patientId: string; professionalUserId: string; createdAt: string };
export type AdminEvent = { id: string; actorName: string; subjectName: string; subjectId: string; action: string; detail: string; createdAt: string };
export type Institute = { name: string; contact: string; hours: string; revision: number };
export type AdminView = { users: DirectoryUser[]; links: DirectoryLink[]; events: AdminEvent[]; settings: Institute };
const columns = `id, username, display_name AS displayName, role, patient_id AS patientId, email, phone,
  professional_registration AS professionalRegistration, status, revision, created_at AS createdAt`;
const actions: Record<string, string> = { create: 'Cadastro criado', edit: 'Cadastro atualizado', status: 'Acesso alterado', password: 'Senha redefinida', sessions: 'Sessões encerradas', link: 'Vínculo alterado', settings: 'Configurações atualizadas' };
export async function requireAdmin(user: AppUser) {
  if (user.role !== 'admin' || !await getD1().prepare("SELECT id FROM users WHERE id = ? AND role = 'admin' AND status = 'active'").bind(user.id).first()) throw new AdminError('Acesso exclusivo da administração.', 403);
}
export async function readAdmin(user: AppUser): Promise<AdminView> {
  await requireAdmin(user);
  const db = getD1();
  const [users, links, events, settings] = await Promise.all([
    db.prepare(`SELECT ${columns} FROM users ORDER BY display_name COLLATE NOCASE`).bind().all<DirectoryUser>(),
    db.prepare(`SELECT id, patient_user_id AS patientUserId, patient_profile_id AS patientId, professional_user_id AS professionalUserId, created_at AS createdAt FROM care_relationships WHERE status = 'active'`).bind().all<DirectoryLink>(),
    db.prepare(`SELECT e.id, e.subject_id AS subjectId, a.display_name AS actorName, COALESCE(s.display_name, 'Instituto') AS subjectName, e.action, e.detail, e.created_at AS createdAt FROM admin_events e JOIN users a ON a.id = e.actor_id LEFT JOIN users s ON s.id = e.subject_id ORDER BY e.created_at DESC, e.id DESC LIMIT 200`).bind().all<AdminEvent>(),
    db.prepare("SELECT name, contact, hours, revision FROM institute_settings WHERE id = 'institute'").bind().first<Institute>(),
  ]);
  return { users: users.results, links: links.results, events: events.results, settings: settings ?? { name: 'Instituto VIVANCE', contact: '', hours: '', revision: 0 } };
}
function field(value: unknown, name: string, min = 0, max = 160) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AdminError(`Revise ${name}.`);
  return value.trim();
}
function revision(value: unknown) { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new AdminError('Recarregue o cadastro.'); return value as number; }
function password(value: unknown) { if (typeof value !== 'string' || value.length < 10 || value.length > 200) throw new AdminError('A senha deve ter entre 10 e 200 caracteres.'); return value; }
function details(body: Record<string, unknown>) {
  const displayName = field(body.displayName, 'o nome', 3, 120);
  const email = field(body.email ?? '', 'o e-mail', 0, 180).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new AdminError('Informe um e-mail válido.');
  return { displayName, email, phone: field(body.phone ?? '', 'o telefone', 0, 40), registration: field(body.professionalRegistration ?? '', 'o registro profissional', 0, 80) };
}
export async function mutateAdmin(actor: AppUser, body: Record<string, unknown>) {
  await requireAdmin(actor);
  const db = getD1(), now = new Date().toISOString();
  const action = field(body.action, 'a ação', 1, 20);
  const event = (subject: string, detail: string, condition = '1', bindings: (string | number | null)[] = []) => db.prepare(`INSERT INTO admin_events (id, actor_id, action, subject_id, detail, created_at)
    VALUES (?, ?, ?, ?, CASE WHEN (${condition}) AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'admin' AND status = 'active') THEN ? ELSE NULL END, ?)`)
    .bind(crypto.randomUUID(), actor.id, actions[action], subject, ...bindings, actor.id, detail, now);
  try {
    if (action === 'create') {
      const role = body.role as AppRole;
      if (!['patient', 'professional', 'admin'].includes(role)) throw new AdminError('Escolha um perfil válido.');
      const username = field(body.username, 'o usuário', 3, 80).toLowerCase();
      if (!/^[a-z0-9._-]+$/u.test(username)) throw new AdminError('O usuário aceita letras sem acento, números, ponto, hífen e sublinhado.');
      const d = details(body), credentials = await hashPassword(password(body.password));
      const id = `usr-${crypto.randomUUID()}`, patientId = role === 'patient' ? `pac-${crypto.randomUUID()}` : null;
      const status = body.status === 'active' ? 'active' : 'blocked';
      const doctorId = typeof body.professionalUserId === 'string' && body.professionalUserId ? body.professionalUserId : null;
      if (doctorId && role !== 'patient') throw new AdminError('Somente pacientes podem receber um médico responsável.');
      const statements = [event(id, `${d.displayName} · ${role === 'patient' ? 'Paciente' : role === 'professional' ? 'Médico' : 'Administrador'} · ${status === 'active' ? 'Acesso liberado' : 'Acesso bloqueado'}`,
        doctorId ? "EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'professional' AND status = 'active')" : '1', doctorId ? [doctorId] : []),
        db.prepare(`INSERT INTO users (id, username, display_name, role, patient_id, password_hash, password_salt, password_iterations, status, created_at, updated_at, email, phone, professional_registration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(id, username, d.displayName, role, patientId, credentials.hash, credentials.salt, credentials.iterations, status, now, now, d.email, d.phone, role === 'professional' ? d.registration : '')];
      if (role === 'professional') statements.push(db.prepare("INSERT INTO clinical_policy_members (user_id, clinic_id) VALUES (?, 'clinic-vivance-demo')").bind(id));
      if (doctorId) {
        const linkId = crypto.randomUUID();
        statements.push(db.prepare("INSERT INTO care_relationships (id, professional_user_id, patient_user_id, patient_profile_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").bind(linkId, doctorId, id, patientId, now, now));
        statements.push(db.prepare('INSERT INTO conversations (id, relationship_id, created_at) VALUES (?, ?, ?)').bind(crypto.randomUUID(), linkId, now));
      }
      await db.batch(statements); return { id };
    }
    if (action === 'settings') {
      const rev = revision(body.revision), name = field(body.name, 'o nome do instituto', 3, 120), contact = field(body.contact, 'o contato', 0, 180), hours = field(body.hours, 'o horário', 0, 180);
      await db.batch([event('institute', 'Dados institucionais atualizados.', "COALESCE((SELECT revision FROM institute_settings WHERE id = 'institute'), 0) = ?", [rev]),
        db.prepare("INSERT INTO institute_settings (id, name, contact, hours, revision) VALUES ('institute', ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name = excluded.name, contact = excluded.contact, hours = excluded.hours, revision = institute_settings.revision + 1").bind(name, contact, hours)]);
      return {};
    }
    if (action === 'link') {
      if (!Array.isArray(body.patients) || !body.patients.length || body.patients.length > 100) throw new AdminError('Selecione entre 1 e 100 pacientes.');
      const doctorId = body.professionalUserId === null ? null : field(body.professionalUserId, 'o médico', 1, 100);
      const reason = field(body.reason, 'o motivo do vínculo', 3, 300);
      const doctor = doctorId ? await db.prepare("SELECT display_name AS name FROM users WHERE id = ? AND role = 'professional' AND status = 'active'").bind(doctorId).first<{ name: string }>() : null;
      if (doctorId && !doctor) throw new AdminError('Selecione um médico com acesso ativo.');
      const statements = [];
      const seen = new Set<string>();
      for (const item of body.patients) {
        if (!item || typeof item !== 'object') throw new AdminError('Revise os pacientes.');
        const id = field(item.id, 'o paciente', 1, 100), rev = revision(item.revision);
        if (seen.has(id)) throw new AdminError('Paciente repetido na seleção.'); seen.add(id);
        const patient = await db.prepare("SELECT patient_id AS patientId FROM users WHERE id = ? AND role = 'patient'").bind(id).first<{ patientId: string }>();
        if (!patient) throw new AdminError('Paciente não encontrado.', 404);
        const old = await db.prepare("SELECT r.id, r.professional_user_id AS doctorId, u.display_name AS name FROM care_relationships r JOIN users u ON u.id = r.professional_user_id WHERE r.patient_user_id = ? AND r.status = 'active'").bind(id).first<{ id: string; doctorId: string; name: string }>();
        if (old?.doctorId === doctorId || (!old && !doctorId)) throw new AdminError('Esse vínculo já está definido.');
        statements.push(event(id, `${old?.name ?? 'Sem médico'} → ${doctor?.name ?? 'Sem médico'}. Motivo: ${reason}`,
          "EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'patient' AND revision = ?)" + (doctorId ? " AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'professional' AND status = 'active')" : ''), doctorId ? [id, rev, doctorId] : [id, rev]));
        statements.push(db.prepare('UPDATE users SET revision = revision + 1, updated_at = ? WHERE id = ?').bind(now, id));
        statements.push(db.prepare("UPDATE care_relationships SET status = 'inactive', updated_at = ? WHERE patient_user_id = ? AND status = 'active'").bind(now, id));
        if (doctorId) {
          const linkId = crypto.randomUUID();
          statements.push(db.prepare("INSERT INTO care_relationships (id, professional_user_id, patient_user_id, patient_profile_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").bind(linkId, doctorId, id, patient.patientId, now, now));
          statements.push(db.prepare('INSERT INTO conversations (id, relationship_id, created_at) VALUES (?, ?, ?)').bind(crypto.randomUUID(), linkId, now));
        }
      }
      await db.batch(statements); return {};
    }
    if (!['edit', 'status', 'password', 'sessions'].includes(action)) throw new AdminError('Ação inválida.');
    const id = field(body.id, 'o cadastro', 1, 100), rev = revision(body.revision);
    const target = await db.prepare(`SELECT ${columns} FROM users WHERE id = ?`).bind(id).first<DirectoryUser>();
    if (!target) throw new AdminError('Cadastro não encontrado.', 404);
    let condition = 'EXISTS (SELECT 1 FROM users WHERE id = ? AND revision = ?)', bindings: (string | number)[] = [id, rev];
    let detail = actions[action];
    const statements = [];
    if (action === 'edit') {
      const d = details(body);
      statements.push(db.prepare('UPDATE users SET display_name = ?, email = ?, phone = ?, professional_registration = ? WHERE id = ?').bind(d.displayName, d.email, d.phone, target.role === 'professional' ? d.registration : '', id));
    } else if (action === 'status') {
      if (!['active', 'blocked'].includes(body.status as string)) throw new AdminError('Situação de acesso inválida.');
      if (body.status === 'blocked') {
        if (id === actor.id) throw new AdminError('Você não pode bloquear o próprio acesso.');
        if (target.role === 'professional') {
          const linked = await db.prepare("SELECT COUNT(*) AS n FROM care_relationships WHERE professional_user_id = ? AND status = 'active'").bind(id).first<{ n: number }>();
          if (linked?.n) throw new AdminError('Transfira ou encerre os vínculos dos pacientes antes de bloquear este médico.');
          condition += " AND NOT EXISTS (SELECT 1 FROM care_relationships WHERE professional_user_id = ? AND status = 'active')"; bindings = [...bindings, id];
        }
      }
      detail = body.status === 'active' ? 'Acesso liberado.' : 'Acesso bloqueado e sessões encerradas.';
      statements.push(db.prepare('UPDATE users SET status = ? WHERE id = ?').bind(body.status as string, id));
      if (body.status === 'blocked') statements.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
    } else if (action === 'password') {
      const c = await hashPassword(password(body.password));
      statements.push(db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ? WHERE id = ?').bind(c.hash, c.salt, c.iterations, id));
      statements.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
      detail = 'Senha redefinida e sessões encerradas.';
    } else statements.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
    await db.batch([event(id, detail, condition, bindings), ...statements, db.prepare('UPDATE users SET revision = revision + 1, updated_at = ? WHERE id = ?').bind(now, id)]);
    return {};
  } catch (error) {
    if (error instanceof AdminError) throw error;
    const message = error instanceof Error ? error.message : '';
    if (/users.username|users_username_unique/u.test(message)) throw new AdminError('Este usuário já existe. Escolha outro nome de acesso.', 409);
    if (/NOT NULL|UNIQUE|CHECK/u.test(message)) throw new AdminError('O cadastro mudou ou o vínculo não está disponível. Atualize os dados e tente novamente.', 409);
    throw error;
  }
}
