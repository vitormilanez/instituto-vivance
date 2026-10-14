// All auth identities and messages are ephemeral synthetic fixtures. No network.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { before, after, test } from "node:test";

const db = new PGlite({ extensions: { btree_gist } });
const tenant = randomUUID(), otherTenant = randomUUID();
const doctor = randomUUID(), colleague = randomUUID(), admin = randomUUID(), nurse = randomUUID();
const staffIds: string[] = [doctor, colleague, admin, nurse];
const active = randomUUID(), suspended = randomUUID(), revoked = randomUUID(), noApp = randomUUID(), unrelated = randomUUID(), otherClinic = randomUUID();
const users = new Map<string, { account: string; session: string }>([doctor, colleague, admin, nurse, active, suspended, revoked, unrelated, otherClinic].map((id) => [id, { account: randomUUID(), session: randomUUID() }]));
// For patient fixtures, keys are patient IDs and account is the auth user.
const send = "select * from public.send_doctor_outreach_message($1,$2,$3,$4)";
async function claims(actor: string = doctor) {
  const actorId = staffIds.includes(actor) ? actor : users.get(actor)!.account;
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ role: "authenticated", sub: actorId, session_id: users.get(actor)!.session })]);
}
async function denied(sql: string, args: unknown[], code = "42501") {
  await assert.rejects(db.query(sql, args), (error: unknown) => { assert.equal((error as { code: string }).code, code); return true; });
}
before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null,created_at timestamptz not null default now(),unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema auth to anon,authenticated;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;`);
  const migrations = new URL("../../../supabase/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql") && !name.endsWith(" 2.sql")).sort()) await db.exec(readFileSync(new URL(name, migrations), "utf8"));
  for (const [key, value] of users) {
    const id = staffIds.includes(key) ? key : value.account;
    await db.query("insert into auth.users(id,email_confirmed_at) values($1,clock_timestamp())", [id]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [value.session, id]);
  }
  await db.query("insert into public.tenants(id,name) values($1,'Synthetic outreach clinic'),($2,'Other synthetic clinic')", [tenant, otherTenant]);
  for (const [id, role] of [[doctor, "doctor"], [colleague, "doctor"], [admin, "admin"], [nurse, "nurse"]]) await db.query("insert into public.memberships(tenant_id,user_id,role,status) values($1,$2,$3,'active')", [tenant, id, role]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,status) values($1,$2,'doctor','active')", [otherTenant, doctor]);
  for (const patient of [active, suspended, revoked, noApp, unrelated, otherClinic]) {
    const clinic = patient === otherClinic ? otherTenant : tenant;
    await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,$3,$4)", [patient, clinic, `Synthetic ${patient}`, doctor]);
    if (patient !== noApp) {
      await db.query("insert into public.memberships(tenant_id,user_id,role,status) values($1,$2,'patient',$3)", [clinic, users.get(patient)!.account, patient === suspended ? "suspended" : "active"]);
      await db.query("insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)", [clinic, patient, users.get(patient)!.account]);
    }
    await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$4) on conflict (tenant_id,patient_id,professional_id) do nothing", [clinic, patient, patient === unrelated ? colleague : doctor, doctor]);
  }
  await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and patient_id=$2", [tenant, revoked]);
  await claims();
});
after(() => db.close());

test("preview contains only this physician's active app patients and grants no directory widening", async () => {
  await claims();
  const preview = (await db.query<{ result: { id: string }[] }>("select public.preview_doctor_outreach($1) result", [tenant])).rows[0].result;
  assert.deepEqual(preview.map((row) => row.id), [active]);
  const grants = (await db.query<{ allowed: boolean }>("select has_function_privilege('anon','public.preview_doctor_outreach(uuid)','EXECUTE') allowed")).rows[0];
  assert.equal(grants.allowed, false);
  await db.exec("set role authenticated");
  assert.equal((await db.query("select user_id from public.memberships where role='patient'")).rows.length, 0);
  await db.exec("reset role");
});

test("only the authenticated responsible doctor may preview or send", async () => {
  for (const actor of [admin, nurse, active]) {
    await claims(actor);
    await denied("select public.preview_doctor_outreach($1)", [tenant]);
    await denied(send, [tenant, active, "Um passo de cada vez.", randomUUID()]);
  }
  await claims(colleague);
  await denied(send, [tenant, active, "Um passo de cada vez.", randomUUID()]);
  await claims();
  for (const patient of [suspended, revoked, noApp, unrelated, otherClinic]) await denied(send, [tenant, patient, "Um passo de cada vez.", randomUUID()]);
});

test("same recipient request is idempotent and immutable; notification remains individual", async () => {
  await claims();
  const key = randomUUID();
  const first = await db.query(send, [tenant, active, "Um passo de cada vez.", key]);
  const retry = await db.query(send, [tenant, active, "Um passo de cada vez.", key]);
  assert.deepEqual(retry.rows, first.rows);
  await denied(send, [tenant, active, "Outro texto", key], "23505");
  assert.equal((await db.query<{ n: number }>("select count(*)::int n from public.care_messages where client_request_id=$1", [key])).rows[0].n, 1);
  assert.equal((await db.query<{ n: number }>("select count(*)::int n from public.in_app_notifications where recipient_user_id=$1", [users.get(active)!.account])).rows[0].n, 1);
});

test("revoked app access, auth identity and live sender session are rechecked after preview", async () => {
  await claims();
  await db.query("update public.memberships set status='suspended' where tenant_id=$1 and user_id=$2", [tenant, users.get(active)!.account]);
  await denied(send, [tenant, active, "Mensagem", randomUUID()]);
  await db.query("update public.memberships set status='active' where tenant_id=$1 and user_id=$2", [tenant, users.get(active)!.account]);
  await db.query("update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=$1", [users.get(active)!.account]);
  await denied(send, [tenant, active, "Mensagem", randomUUID()]);
  await db.query("update auth.users set banned_until=null where id=$1", [users.get(active)!.account]);
  await db.query("delete from auth.sessions where id=$1", [users.get(doctor)!.session]);
  await denied(send, [tenant, active, "Mensagem", randomUUID()]);
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [users.get(doctor)!.session, doctor]);
});

test("a failing recipient leaves successful messages intact and retries reuse their receipt", async () => {
  await claims();
  const key = randomUUID();
  const first = await db.query(send, [tenant, active, "Estamos juntos.", key]);
  await denied(send, [tenant, suspended, "Estamos juntos.", randomUUID()]);
  assert.deepEqual((await db.query(send, [tenant, active, "Estamos juntos.", key])).rows, first.rows);
  const recipient = (await db.query<{ patient_id: string }>("select patient_id from public.care_messages where client_request_id=$1", [key])).rows[0];
  assert.equal(recipient.patient_id, active);
});

test("outreach rate checks do not duplicate or reject already successful retries", async () => {
  await claims();
  const key = randomUUID();
  const receipt = await db.query(send, [tenant, active, "Mensagem para verificar o limite.", key]);
  const count = (await db.query<{ n: number }>("select count(*)::int n from public.care_messages where sender_id=$1", [doctor])).rows[0].n;
  for (let index = count; index < 60; index++) await db.query(send, [tenant, active, "Mensagem sintética de limite.", randomUUID()]);
  await denied(send, [tenant, active, "Acima do limite.", randomUUID()], "P0060");
  assert.deepEqual((await db.query(send, [tenant, active, "Mensagem para verificar o limite.", key])).rows, receipt.rows);
  assert.equal((await db.query<{ n: number }>("select count(*)::int n from public.care_messages where sender_id=$1", [doctor])).rows[0].n, 60);
});
