// Synthetic, in-process SQL verification. No remote Supabase access.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";

const db = new PGlite({ extensions: { btree_gist } });
const tenant = randomUUID();
const patient = randomUUID();
const doctor = randomUUID();
const document = randomUUID();
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
let job = "", lease = "", run = "", sourcePage = "";

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
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
  await db.query("insert into auth.users(id) values($1)", [doctor]);
  await db.query("insert into public.tenants(id,name) values($1,'Checkpoint clinic')", [tenant]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'doctor','active','Doctor')", [tenant, doctor]);
  await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic patient',$3)", [patient, tenant, doctor]);
  await db.query(`insert into public.patient_documents(
    id,tenant_id,patient_id,uploaded_by,original_filename,storage_path,
    content_type,byte_size,category,visibility,status,available_at
  ) values($1,$2,$3,$4,'synthetic.pdf',$5,'application/pdf',1000,'exam','shared','available',clock_timestamp())`,
  [document, tenant, patient, doctor, `patient-documents/${document}`]);
  await db.query("insert into private.exam_ai_test_patients(tenant_id,patient_id) values($1,$2)", [tenant, patient]);
  await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$3) on conflict do nothing", [tenant, patient, doctor]);
  await db.query("insert into public.exam_processing_authorizations(tenant_id,patient_id,document_id,authorized_by) values($1,$2,$3,$4)", [tenant,patient,document,doctor]);
  job = (await db.query<{ id: string }>(
    "insert into public.processing_jobs(tenant_id,patient_id,job_type,idempotency_key,created_by) values($1,$2,'exam_text_extraction',$3,$4) returning id",
    [tenant, patient, document, doctor],
  )).rows[0].id;
  run = (await db.query<{ id: string }>(`insert into public.document_extraction_runs(
    tenant_id,patient_id,document_id,processing_job_id,source_content_sha256,
    extractor_name,extractor_version,status,page_count,extracted_page_count,
    review_page_count,failed_page_count,created_by
  ) values($1,$2,$3,$4,$5,'unpdf-embedded-text','test','extracted',2,2,0,0,$6) returning id`,
  [tenant, patient, document, job, "a".repeat(64), doctor])).rows[0].id;
  const text = "Marcador\t\nliteral: 12\r\n3";
  sourcePage = (await db.query<{ id: string }>(`insert into public.document_extracted_pages(
    tenant_id,patient_id,document_id,extraction_run_id,page_number,status,
    extraction_method,extracted_text,text_sha256
  ) values($1,$2,$3,$4,1,'extracted','embedded_text',$5,$6) returning id`,
  [tenant, patient, document, run, text, sha(text)])).rows[0].id;
  await db.query(`insert into public.document_extracted_pages(
    tenant_id,patient_id,document_id,extraction_run_id,page_number,status,
    extraction_method,extracted_text,text_sha256
  ) values($1,$2,$3,$4,2,'extracted','embedded_text','Sem resultados',$5)`,
  [tenant, patient, document, run, sha("Sem resultados")]);
  await db.query("select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)");
  lease = (await db.query<{ lease_token: string }>(
    "select lease_token from public.claim_next_exam_text_extraction_job()",
  )).rows[0].lease_token;
});

after(async () => db.close());

async function denied(sql: string, args: unknown[] = []) {
  await db.exec("savepoint denied_checkpoint");
  try { await assert.rejects(db.query(sql, args)); }
  finally { await db.exec("rollback to savepoint denied_checkpoint; release savepoint denied_checkpoint"); }
}

test("checkpoint stores complete pages privately, idempotently, and only on the active lease", async () => {
  await db.exec("begin");
  try {
    await db.exec("set local role service_role");
    const call = `select public.save_exam_extraction_batch_checkpoint(
      $1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) saved`;
    const result = { pages: [
      { page_number: 1, source_text: null, items: [] },
      { page_number: 2, source_text: null, items: [] },
    ], metadata: { title: "Exame sintético" } };
    const args = [run, job, lease, "prompt.1", "b".repeat(64), JSON.stringify([1, 2]), JSON.stringify(result)];
    await denied(call, [run, job, randomUUID(), ...args.slice(3)]);
    assert.equal((await db.query<{ saved: boolean }>(call, args)).rows[0].saved, true);
    assert.equal((await db.query<{ saved: boolean }>(call, args)).rows[0].saved, true);
    assert.equal((await db.query("select * from public.exam_extraction_batch_checkpoints")).rows.length, 1);
    await denied("insert into public.exam_extraction_batch_checkpoints(extraction_run_id,prompt_version,batch_key,page_numbers,result) values($1,'prompt.1',$2,'[1]'::jsonb,'{}'::jsonb)", [run, "c".repeat(64)]);
    await denied(call, [...args.slice(0, 6), JSON.stringify({ ...result, metadata: { title: "Changed" } })]);
    await denied(call, [...args.slice(0, 5), JSON.stringify([1, 3]), args[6]]);
    await denied(call, [...args.slice(0, 6), JSON.stringify({ ...result, pages: [result.pages[0], result.pages[0]] })]);
    await denied(call, [...args.slice(0, 6), JSON.stringify({ ...result, pages: [{ ...result.pages[0], items: Array(101).fill({}) }, result.pages[1]] })]);
    await denied(call, [...args.slice(0, 6), JSON.stringify({ ...result, pages: [{ page_number: 1, items: [] }, result.pages[1]] })]);
    await denied("update public.exam_extraction_batch_checkpoints set result='{}'::jsonb");
    await db.exec("set local role authenticated");
    await denied("select * from public.exam_extraction_batch_checkpoints");
    await denied(call, args);
    await db.exec("reset role");
    await db.query("select public.complete_processing_job($1,$2)", [job, lease]);
    await denied(call, args);
  } finally { await db.exec("rollback"); }
});

test("literal names and values keep PDF layout but reject other controls", async () => {
  await db.exec("begin");
  try {
    await db.exec("set local role service_role");
    const text = "Marcador\t\nliteral: 12\r\n3";
    const item = {
      source_page_id: sourcePage, page_number: 1, item_index: 1,
      item_kind: "laboratory", literal_name: "Marcador\t\nliteral",
      literal_value: "12\r\n3", numeric_value: null, unit_text: null,
      reference_text: null, issuer_flag: null, method_text: null,
      specimen_text: null, observed_on: null, narrative_text: null,
      source_excerpt: text, source_start: 0, source_end: text.length,
      extraction_confidence: null, requires_review_reason: "ai_extraction",
    };
    const call = "select public.persist_queued_exam_ai_extraction($1,$2,$3,'claude-test','1',$4::jsonb,$5::jsonb) count";
    const metadata = { document_type: "laudo", title: "Laudo sintético", issuer: null,
      observed_on: null, identity_text: null, summary: [], quality_notes: [],
      model: "claude-test", prompt_version: "1", input_tokens: 0, output_tokens: 0 };
    const args = (items: unknown) => [run, job, lease, JSON.stringify(items), JSON.stringify(metadata)];
    assert.equal((await db.query<{ count: number }>(call, args([item]))).rows[0].count, 1);
    await db.exec("reset role");
    assert.deepEqual((await db.query<{ literal_name: string; literal_value: string }>(
      "select literal_name,literal_value from public.exam_result_items where extraction_run_id=$1", [run],
    )).rows, [{ literal_name: item.literal_name, literal_value: item.literal_value }]);
    await db.exec("set local role service_role");
    await denied(call, args([{ ...item, item_index: 2, literal_name: "Bad\u0007name" }]));
    await denied(call, args([{ ...item, item_index: 2, literal_value: "Bad\fvalue" }]));
    await denied(call, args([{ ...item, item_index: 2, literal_name: " \n\t " }]));
  } finally { await db.exec("rollback"); }
});
