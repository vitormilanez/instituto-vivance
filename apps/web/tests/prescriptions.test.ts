import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";
import {
  prescriptionCursor,
  prescriptionDraftInput,
  prescriptionInput,
} from "../modules/prescriptions/validation.ts";

const db = new PGlite({ extensions: { btree_gist } });
const tenant = randomUUID();
const patient = randomUUID();
const documentId = randomUUID();
const people = Object.fromEntries(
  ["admin", "doctor", "nurse", "patient"].map((role) => [
    role,
    { id: randomUUID(), session: randomUUID() },
  ]),
) as Record<string, { id: string; session: string }>;

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users, not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null,created_at timestamptz not null default now(),unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
  `);
  const migrations = new URL("../../../supabase/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(readFileSync(new URL(name, migrations), "utf8"));
  for (const actor of Object.values(people)) {
    await db.query("insert into auth.users(id) values($1)", [actor.id]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [actor.session, actor.id]);
  }
  await db.query("insert into public.tenants(id,name) values($1,'Prescription test clinic')", [tenant]);
  for (const [role, actor] of Object.entries(people))
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,$3,'active',$4)",
      [tenant, actor.id, role, `Synthetic ${role}`],
    );
  await db.query(
    "insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic patient',$3)",
    [patient, tenant, people.admin.id],
  );
  await db.query(
    "insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",
    [tenant, patient, people.patient.id],
  );
  // Creating a patient in a clinic with one doctor establishes the repository's
  // existing sole-doctor active relationship; this fixture uses that same path.
  await db.query(
    `insert into public.patient_documents(
      id,tenant_id,patient_id,uploaded_by,original_filename,storage_path,
      content_type,byte_size,category,visibility,status,available_at
    ) values($1,$2,$3,$4,'receita.jpg',$5,'image/jpeg',1000,'clinical_document','shared','available',clock_timestamp())`,
    [documentId, tenant, patient, people.patient.id, `patient-documents/${documentId}`],
  );
  await db.query("select set_config('request.jwt.claims','{}',false)");
});

after(async () => db.close());

async function actor(name: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: people[name].id, session_id: people[name].session }),
  ]);
}

async function denied(query: string, values: unknown[] = []) {
  await db.exec("savepoint denied_action");
  try {
    await assert.rejects(db.query(query, values));
  } finally {
    await db.exec("rollback to savepoint denied_action; release savepoint denied_action");
  }
}

test("recipe archive RLS limits clinical metadata and RPC writes to the patient and active care", async () => {
  await db.exec("begin");
  try {
    await actor("doctor");
    const documentKey = randomUUID();
    const documentRecipe = await db.query<{ id: string }>(
      "select public.record_patient_prescription($1,$2,$3,'Receita em imagem',current_date,'document',$4,null,'shared',false) id",
      [tenant, patient, documentKey, documentId],
    );
    const memedKey = randomUUID();
    const memedRecipe = await db.query<{ id: string }>(
      "select public.record_patient_prescription($1,$2,$3,'Receita Memed',current_date,'memed',null,'https://receita.memed.com.br/p/abc','shared',false) id",
      [tenant, patient, memedKey],
    );
    const retry = await db.query<{ id: string }>(
      "select public.record_patient_prescription($1,$2,$3,'Receita Memed',current_date,'memed',null,'https://receita.memed.com.br/p/abc','shared',false) id",
      [tenant, patient, memedKey],
    );
    assert.equal(retry.rows[0].id, memedRecipe.rows[0].id, "same request is idempotent");
    await denied(
      "select public.record_patient_prescription($1,$2,$3,'Changed intent',current_date,'memed',null,'https://receita.memed.com.br/p/abc','shared',false)",
      [tenant, patient, memedKey],
    );
    // Direct RPC calls must not bypass the browser URL parser.
    await denied(
      "select public.record_patient_prescription($1,$2,$3,'Forged host',current_date,'memed',null,'https://memed.com.br:443@evil.example/x','shared',false)",
      [tenant, patient, randomUUID()],
    );

    await actor("patient");
    assert.equal((await db.query("select id from public.patient_prescriptions")).rows.length, 2);
    await denied(
      "select public.record_patient_prescription($1,$2,$3,'Sem consentimento',current_date,'memed',null,'https://receita.memed.com.br/p/own','shared',false)",
      [tenant, patient, randomUUID()],
    );
    await denied(
      "select public.record_patient_prescription($1,$2,$3,'Arquivo sem consentimento',current_date,'document',$4,null,'shared',false)",
      [tenant, patient, randomUUID(), documentId],
    );
    await db.query(
      "select public.record_patient_prescription($1,$2,$3,'Receita compartilhada pelo paciente',current_date,'memed',null,'https://receita.memed.com.br/p/own','shared',true)",
      [tenant, patient, randomUUID()],
    );
    await db.query(
      "select public.record_patient_prescription($1,$2,$3,'Arquivo compartilhado pelo paciente',current_date,'document',$4,null,'shared',true)",
      [tenant, patient, randomUUID(), documentId],
    );

    await db.exec("reset role");
    await db.query("update public.patient_documents set visibility='internal' where id=$1", [documentId]);
    await actor("patient");
    const patientRows = await db.query<{ id: string }>("select id from public.patient_prescriptions");
    assert.equal(patientRows.rows.length, 2, "hidden source also hides its archive metadata");
    assert.ok(!patientRows.rows.some((row) => row.id === documentRecipe.rows[0].id));

    await actor("admin");
    assert.equal((await db.query("select id from public.patient_prescriptions")).rows.length, 0);
    await denied(
      "select public.record_patient_prescription($1,$2,$3,'Admin denied',current_date,'memed',null,'https://receita.memed.com.br/p/admin','shared',true)",
      [tenant, patient, randomUUID()],
    );
    await denied("insert into public.patient_prescriptions(tenant_id) values($1)", [tenant]);

    await db.exec("reset role");
    const audits = await db.query(
      "select id from public.audit_events where entity_type='patient_prescriptions'",
    );
    assert.equal(audits.rows.length, 4);
  } finally {
    await db.exec("rollback");
  }
});

test("recipe input accepts only past metadata, PDF/JPG references and official HTTPS Memed links", () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.deepEqual(
    prescriptionDraftInput({
      title: " Receita de retorno ",
      prescribed_on: today,
      source_type: "memed",
      memed_url: "https://receita.memed.com.br/p/abc",
    }),
    {
      title: "Receita de retorno",
      prescribedOn: today,
      sourceType: "memed",
      memedUrl: "https://receita.memed.com.br/p/abc",
    },
  );
  assert.throws(() =>
    prescriptionDraftInput({
      title: "Falsa",
      prescribed_on: today,
      source_type: "memed",
      memed_url: "https://memed.com.br:443@evil.example/x",
    }),
  );
  assert.throws(() =>
    prescriptionInput({
      patient_id: patient,
      request_key: randomUUID(),
      title: "Sem documento",
      prescribed_on: today,
      source_type: "document",
      document_id: null,
    }),
  );
  assert.equal(prescriptionCursor(null, null, null), null);
  assert.throws(() => prescriptionCursor(today, null, randomUUID()));
});

test("recipe archive keyset pagination reaches every older item without overlap", async () => {
  await db.exec("begin");
  try {
    await actor("doctor");
    for (let index = 0; index < 22; index += 1)
      await db.query(
        "select public.record_patient_prescription($1,$2,$3,$4,current_date,'memed',null,$5,'shared',false)",
        [
          tenant,
          patient,
          randomUUID(),
          `Receita ${String(index).padStart(2, "0")}`,
          `https://receita.memed.com.br/p/${index}`,
        ],
      );
    const first = await db.query<{
      id: string;
      prescribed_on: string;
      created_at: string;
    }>(
      "select id,prescribed_on,created_at from public.list_patient_prescriptions_page($1,$2,null,null,null,21)",
      [tenant, patient],
    );
    assert.equal(first.rows.length, 21);
    const cursor = first.rows[19];
    const second = await db.query<{ id: string }>(
      "select id from public.list_patient_prescriptions_page($1,$2,$3,$4,$5,21)",
      [tenant, patient, cursor.prescribed_on, cursor.created_at, cursor.id],
    );
    assert.equal(second.rows.length, 2);
    const displayed = [...first.rows.slice(0, 20), ...second.rows];
    assert.equal(new Set(displayed.map((row) => row.id)).size, 22);
  } finally {
    await db.exec("rollback");
  }
});
