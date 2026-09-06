import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resetDatabase, getD1 } from './helpers/d1';
import { mutateAdmin, readAdmin } from '../app/lib/admin';
import { authenticate, ensureDemoAccounts, getUserBySessionToken, type AppUser } from '../app/lib/auth';
import { careDirectory } from '../app/lib/care-directory';
import { careAccess, loadCycle, mutateCycle, transitionCycle } from '../app/lib/care-cycle';
import { getDefaultEncounterId } from '../app/components/demo-routes';
import { validCycleMutation } from '../app/lib/care-cycle-contract';
import { listSharedMessages, sendSharedMessage } from '../app/lib/messages';
const admin: AppUser = { id: 'admin', username: 'admin', displayName: 'Admin teste', role: 'admin', patientId: null };
const doctor: AppUser = { id: 'doctor', username: 'doctor', displayName: 'Dr. Teste', role: 'professional', patientId: null };
const patient: AppUser = { id: 'patient', username: 'patient', displayName: 'Marina fictícia', role: 'patient', patientId: 'pac-demo-001' };
const credential = 'SenhaTeste@2026';
beforeEach(async () => {
  resetDatabase();
  await getD1().prepare("INSERT INTO users (id, username, display_name, role, password_hash, password_salt, password_iterations, created_at, updated_at) VALUES ('admin', 'admin', 'Admin teste', 'admin', 'unused', 'unused', 100000, '2026-09-06', '2026-09-06')").bind().run();
});
async function create(role: string, username: string, extra = {}) {
  return mutateAdmin(admin, { action: 'create', role, username, displayName: `${role} ${username}`, password: credential, status: 'active', ...extra });
}
async function user(id: string) { return (await readAdmin(admin)).users.find(item => item.id === id)!; }
async function link(patientUser: AppUser & { revision: number }, doctorId: string | null) {
  return mutateAdmin(admin, { action: 'link', patients: [{ id: patientUser.id, revision: patientUser.revision }], professionalUserId: doctorId, reason: 'Organizar acompanhamento de teste' });
}
test('admin cadastra, vincula pelo médico, paciente entra e compartilha dados sem herdar exemplos', async () => {
  const physician = await create('professional', 'new.doctor');
  const registered = await create('patient', 'new.patient');
  const p = await user(registered.id!), d = await user(physician.id!);
  assert.equal((await careDirectory(p))[0].relationshipId, null);
  await link(p, d.id);
  const login = await authenticate(p.username, credential);
  assert.equal(login?.user.id, p.id);
  assert.equal((await careDirectory(d))[0].id, p.patientId);
  const access = (await careAccess(p))[0];
  const cycle = (await loadCycle(access)).cycle;
  assert.equal(cycle.encounterId, getDefaultEncounterId(p.patientId!));
  assert.deepEqual(cycle.submissions, []); assert.deepEqual(cycle.exams, []);
  const mutation = { patientId: p.patientId!, encounterId: cycle.encounterId, revision: 0, command: 'submitInformation' as const, requestId: crypto.randomUUID(), args: [{ kind: 'text', title: 'Meu primeiro envio', originalText: 'Texto fictício para validar o acompanhamento.', confirmed: true }] };
  assert.equal(validCycleMutation(mutation), true);
  await mutateCycle(p, mutation);
  assert.equal((await loadCycle((await careAccess(d))[0])).cycle.submissions.length, 1);
  const sent = await sendSharedMessage(p, { patientId: p.patientId!, encounterId: cycle.encounterId, context: 'general', body: 'Olá, mensagem fictícia.', clientMessageId: crypto.randomUUID() });
  assert.ok('message' in sent); assert.equal((await listSharedMessages(d, p.patientId!, cycle.encounterId))?.length, 1);
});
test('acesso demonstrativo do Admin VIVANCE é preparado no primeiro login', async () => {
  const login = await authenticate('admin.vivans', 'VivansLocal@2026');
  assert.equal(login?.user.username, 'admin.vivans');
  assert.equal(login?.user.displayName, 'Administrador VIVANCE');
  assert.equal(login?.user.role, 'admin');
  assert.equal(login?.user.patientId, null);
});
test('cadastro pelo paciente cria vínculo e conversa no mesmo salvamento; duplicata não deixa dados parciais', async () => {
  const created = await create('patient', 'new.patient', { professionalUserId: doctor.id });
  const p = await user(created.id!);
  assert.equal((await careDirectory(p))[0].doctorId, doctor.id);
  assert.deepEqual(await listSharedMessages(p, p.patientId!, getDefaultEncounterId(p.patientId!)), []);
  const before = await readAdmin(admin);
  await assert.rejects(create('patient', 'new.patient', { professionalUserId: doctor.id }), { status: 409 });
  assert.deepEqual(await readAdmin(admin), before);
});
test('transferência preserva mensagens e ciclos antigos, revoga antigo médico e impede duplicata e edição obsoleta', async () => {
  const newDoctor = await user((await create('professional', 'second.doctor')).id!);
  const oldAccess = (await careAccess(doctor))[0]; await loadCycle(oldAccess);
  await getD1().prepare("INSERT INTO conversations (id, relationship_id, created_at) VALUES ('conversation', 'relationship', '2026-09-06')").bind().run();
  await sendSharedMessage(patient, { patientId: patient.patientId!, encounterId: 'enc-demo-002', context: 'general', body: 'Mensagem antiga fictícia.', clientMessageId: crypto.randomUUID() });
  const p = await user('patient'); await link(p, newDoctor.id);
  assert.equal((await careDirectory(doctor)).length, 0);
  assert.equal(await listSharedMessages(doctor, p.patientId!, 'enc-demo-002'), null);
  assert.deepEqual(await listSharedMessages(newDoctor, p.patientId!, 'enc-demo-002'), []);
  assert.deepEqual((await loadCycle((await careAccess(newDoctor))[0])).cycle.exams, []);
  assert.equal((await getD1().prepare("SELECT COUNT(*) AS n FROM care_cycles WHERE relationship_id = 'relationship'").bind().first<{ n: number }>())?.n, 1);
  await assert.rejects(link(p, doctor.id), { status: 409 });
  await assert.rejects(link(await user('patient'), newDoctor.id), /já está definido/u);
  await link(await user('patient'), doctor.id);
  assert.equal((await readAdmin(admin)).links.filter(item => item.patientUserId === p.id).length, 1);
});
test('bloqueio persiste após login, encerra sessões e médico com pacientes não pode ser bloqueado', async () => {
  const created = await create('patient', 'blocked.patient'); const p = await user(created.id!);
  const session = await authenticate(p.username, credential); assert.ok(session);
  await mutateAdmin(admin, { action: 'status', id: p.id, revision: p.revision, status: 'blocked' });
  assert.equal(await authenticate(p.username, credential), null);
  assert.equal(await getUserBySessionToken(session.token), null);
  await assert.rejects(mutateAdmin(admin, { action: 'status', id: doctor.id, revision: 0, status: 'blocked' }), /Transfira/u);
  await assert.rejects(mutateAdmin(admin, { action: 'status', id: admin.id, revision: 0, status: 'blocked' }), /próprio acesso/u);
  await ensureDemoAccounts();
  await getD1().prepare("UPDATE users SET status = 'blocked' WHERE id = 'usr-marina'").bind().run();
  await ensureDemoAccounts();
  assert.equal((await user('usr-marina')).status, 'blocked');
});
test('paciente e médico não administram; admin não lê nem altera dados clínicos', async () => {
  await assert.rejects(readAdmin(patient), { status: 403 });
  await assert.rejects(create.call(null, 'invalid-role', 'invalid.user'), { status: 400 });
  await assert.rejects(mutateAdmin(doctor, { action: 'settings', name: 'Inválido' }), { status: 403 });
  assert.deepEqual(await careAccess(admin), []);
  assert.deepEqual(await careDirectory(admin), []);
  assert.equal(await listSharedMessages(admin, patient.patientId!, 'enc-demo-002'), null);
  const { cycle } = await loadCycle((await careAccess(doctor))[0]);
  assert.throws(() => transitionCycle(cycle, admin, { patientId: patient.patientId!, encounterId: 'enc-demo-002', revision: 0, requestId: crypto.randomUUID(), command: 'createCarePlanRevision', args: [null] }), { status: 403 });
});
test('vínculo em lote é atômico quando um paciente mudou, e senhas não aparecem na administração', async () => {
  const one = await user((await create('patient', 'bulk.one')).id!), two = await user((await create('patient', 'bulk.two')).id!);
  await mutateAdmin(admin, { action: 'edit', id: two.id, revision: 0, displayName: 'Nome atualizado' });
  await assert.rejects(mutateAdmin(admin, { action: 'link', professionalUserId: doctor.id, reason: 'Início em lote', patients: [one, two].map(p => ({ id: p.id, revision: 0 })) }), { status: 409 });
  assert.equal((await careDirectory(one))[0].relationshipId, null);
  assert.equal((await user(one.id)).revision, 0);
  const output = JSON.stringify(await readAdmin(admin));
  assert.ok(!output.includes(credential)); assert.ok(!output.includes('passwordHash'));
});
test('migração mantém sessões, vínculos e referências com banco preenchido e foreign keys ligado', () => {
  const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON');
  for (const name of ['0000_outgoing_songbird.sql', '0001_dark_purple_man.sql', '0002_volatile_supreme_intelligence.sql', '0003_daily_exodus.sql']) db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), 'utf8'));
  db.exec(`INSERT INTO users (id, username, display_name, role, patient_id, password_hash, password_salt, password_iterations, created_at, updated_at) VALUES ('d','d','D','professional',NULL,'h','s',100000,'now','now'),('p','p','P','patient','pac-demo-001','h','s',100000,'now','now');
  INSERT INTO care_relationships (id, professional_user_id, patient_user_id, patient_profile_id, created_at, updated_at) VALUES ('r','d','p','pac-demo-001','now','now');
  INSERT INTO sessions (id,user_id,token_hash,created_at,expires_at) VALUES ('s','p','hash','now','future');`);
  db.exec('BEGIN'); db.exec(readFileSync(new URL('../drizzle/0004_chief_the_fallen.sql', import.meta.url), 'utf8')); db.exec('COMMIT');
  assert.equal((db.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n, 2);
  assert.equal((db.prepare('SELECT count(*) AS n FROM sessions').get() as { n: number }).n, 1);
  assert.equal((db.prepare('SELECT count(*) AS n FROM care_relationships').get() as { n: number }).n, 1);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); db.close();
});
