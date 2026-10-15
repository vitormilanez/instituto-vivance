// Synthetic fixtures run only in an ephemeral in-process PostgreSQL engine.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";

const db = new PGlite({ extensions: { btree_gist } });
const tenant = randomUUID(), otherTenant = randomUUID(), patient = randomUUID();
const doctor = randomUUID(), colleague = randomUUID(), admin = randomUUID();
const nurse = randomUUID(), patientUser = randomUUID();
const sessions = new Map<string, string>(
  [doctor, colleague, admin, nurse, patientUser].map((id) => [id, randomUUID()]),
);

async function actor(user: string) {
  await db.exec("reset role");
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: user, session_id: sessions.get(user) }),
  ]);
}
async function block(
  user: string,
  assignedDoctor = doctor,
  start = "2098-01-10T12:00:00Z",
  end = "2098-01-10T13:00:00Z",
) {
  await actor(user);
  return db.query<{ id: string; version: number; doctor_display_name: string }>(
    "insert into public.agenda_blocks(tenant_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4) returning id,version,doctor_display_name",
    [tenant, assignedDoctor, start, end],
  );
}
async function appointment(start: string, end: string) {
  await actor(admin);
  return db.query(
    "insert into public.appointments(tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,$5) returning id",
    [tenant, patient, doctor, start, end],
  );
}

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create role service_role nologin bypassrls;
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
    grant select,insert,delete on storage.objects to authenticated;
  `);
  const migrations = new URL("../../../supabase/migrations/", import.meta.url);
  for (const name of readdirSync(migrations)
    .filter((name) => name.endsWith(".sql") && !name.endsWith(" 2.sql"))
    .sort())
    await db.exec(readFileSync(new URL(name, migrations), "utf8"));
  for (const id of [doctor, colleague, admin, nurse, patientUser]) {
    await db.query("insert into auth.users(id,email_confirmed_at) values($1,now())", [id]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [sessions.get(id), id]);
  }
  await db.query(
    "insert into public.tenants(id,name) values($1,'Agenda blocks clinic'),($2,'Other clinic')",
    [tenant, otherTenant],
  );
  for (const [id, role, name] of [
    [doctor, "doctor", "Dra. Agenda"],
    [colleague, "doctor", "Dr. Colega"],
    [admin, "admin", "Admin Agenda"],
    [nurse, "nurse", "Enfermagem Agenda"],
    [patientUser, "patient", "Paciente Agenda"],
  ])
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,$3,'active',$4)",
      [tenant, id, role, name],
    );
  await db.query(
    "insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Paciente sintético',$3)",
    [patient, tenant, admin],
  );
});
after(() => db.close());

test("doctor owns blocks while admin and nurse can manage another active doctor", async () => {
  const own = await block(doctor);
  assert.equal(own.rows[0].doctor_display_name, "Dra. Agenda");
  await assert.rejects(
    block(doctor, colleague, "2098-01-10T14:00:00Z", "2098-01-10T15:00:00Z"),
    (error: unknown) =>
      ["23514", "42501"].includes((error as { code: string }).code),
  );
  await block(admin, colleague, "2098-01-10T14:00:00Z", "2098-01-10T15:00:00Z");
  await block(nurse, colleague, "2098-01-10T15:00:00Z", "2098-01-10T16:00:00Z");
});

test("patient cannot see or mutate agenda blocks", async () => {
  await actor(patientUser);
  assert.equal((await db.query("select id from public.agenda_blocks")).rows.length, 0);
  await assert.rejects(
    db.query(
      "insert into public.agenda_blocks(tenant_id,doctor_id,starts_at,ends_at) values($1,$2,'2098-01-11T12:00Z','2098-01-11T13:00Z')",
      [tenant, doctor],
    ),
    (error: unknown) =>
      ["23514", "42501"].includes((error as { code: string }).code),
  );
});

test("direct writes reject block-to-appointment conflicts in both directions", async () => {
  await block(admin, doctor, "2098-01-12T12:00:00Z", "2098-01-12T13:00:00Z");
  await assert.rejects(
    appointment("2098-01-12T12:30:00Z", "2098-01-12T13:30:00Z"),
    (error: unknown) => (error as { code: string }).code === "23P01",
  );
  await appointment("2098-01-13T12:00:00Z", "2098-01-13T13:00:00Z");
  await assert.rejects(
    block(admin, doctor, "2098-01-13T11:30:00Z", "2098-01-13T12:30:00Z"),
    (error: unknown) => (error as { code: string }).code === "23P01",
  );
  await block(admin, doctor, "2098-01-12T13:00:00Z", "2098-01-12T14:00:00Z");
});

test("active blocks do not overlap; cancellation is versioned, audited and frees the slot", async () => {
  const created = await block(
    admin,
    doctor,
    "2098-01-14T12:00:00Z",
    "2098-01-14T13:00:00Z",
  );
  await assert.rejects(
    block(admin, doctor, "2098-01-14T12:30:00Z", "2098-01-14T13:30:00Z"),
    (error: unknown) => (error as { code: string }).code === "23P01",
  );
  await actor(admin);
  const cancelled = await db.query<{ version: number; status: string }>(
    "update public.agenda_blocks set status='cancelled',expected_version=$2 where id=$1 returning version,status",
    [created.rows[0].id, created.rows[0].version],
  );
  assert.deepEqual(cancelled.rows[0], { version: 2, status: "cancelled" });
  await assert.rejects(
    db.query(
      "update public.agenda_blocks set status='cancelled',expected_version=1 where id=$1",
      [created.rows[0].id],
    ),
    (error: unknown) => ["23514", "40001"].includes((error as { code: string }).code),
  );
  await appointment("2098-01-14T12:00:00Z", "2098-01-14T13:00:00Z");
  await db.exec("reset role");
  const audits = await db.query<{ action: string }>(
    "select action from public.audit_events where entity_type='agenda_blocks' and entity_id=$1 order by created_at,id",
    [created.rows[0].id],
  );
  assert.deepEqual(audits.rows.map((row) => row.action), ["insert", "update"]);
});

test("same doctor lock is present on both cross-table writers", async () => {
  const definitions = await db.query<{ name: string; definition: string }>(`
    select p.proname name, pg_get_functiondef(p.oid) definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private'
      and p.proname in ('validate_agenda_block','prevent_appointment_in_agenda_block')
    order by p.proname
  `);
  assert.equal(definitions.rows.length, 2);
  for (const row of definitions.rows) {
    assert.match(row.definition, /pg_advisory_xact_lock/);
    assert.match(row.definition, /20261015/);
  }
});
