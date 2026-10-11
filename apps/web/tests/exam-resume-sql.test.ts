// Synthetic in-process contract test. Never connects to a remote project.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";

const db = new PGlite({ extensions: { btree_gist } });
const tenant = randomUUID(), patient = randomUUID(), doctor = randomUUID();
const nurse = randomUUID(), outsider = randomUUID(), otherDoctor = randomUUID(), document = randomUUID();
const session = randomUUID(), nurseSession = randomUUID(), outsiderSession = randomUUID(), otherSession = randomUUID();
let job = "", run = "", sourcePage = "";

async function claims(role: string, user?: string, sessionId?: string) {
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ role, sub: user, session_id: sessionId })]);
}
async function denied(sql: string, args: unknown[], code: string) {
  await db.exec("savepoint expected_denial");
  try {
    await assert.rejects(db.query(sql, args), (error: unknown) => {
      assert.equal((error as { code?: string }).code, code);
      return true;
    });
  } finally { await db.exec("rollback to savepoint expected_denial; release savepoint expected_denial"); }
}

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
  for (const user of [doctor, nurse, outsider, otherDoctor])
    await db.query("insert into auth.users(id) values($1)", [user]);
  for (const [id, user] of [[session, doctor], [nurseSession, nurse], [outsiderSession, outsider], [otherSession, otherDoctor]])
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [id, user]);
  await db.query("insert into public.tenants(id,name) values($1,'Synthetic clinic')", [tenant]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'doctor','active','Doctor')", [tenant, doctor]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'nurse','active','Nurse')", [tenant, nurse]);
  await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic patient',$3)", [patient, tenant, doctor]);
  await db.query(`insert into public.patient_documents(
    id,tenant_id,patient_id,uploaded_by,original_filename,storage_path,
    content_type,byte_size,category,visibility,status,available_at
  ) values($1,$2,$3,$4,'synthetic.pdf',$5,'application/pdf',1000,'exam','shared','available',clock_timestamp())`,
  [document, tenant, patient, doctor, `patient-documents/${document}`]);
  await db.query("insert into private.exam_ai_test_patients(tenant_id,patient_id) values($1,$2)", [tenant, patient]);
  await db.query("insert into private.synthetic_exam_pilot_documents(tenant_id,document_id,patient_id) values($1,$2,$3)",
    [tenant, document, patient]);
  job = (await db.query<{ id: string }>(
    "insert into public.processing_jobs(tenant_id,patient_id,job_type,idempotency_key,created_by) values($1,$2,'exam_text_extraction',$3,$4) returning id",
    [tenant, patient, document, doctor],
  )).rows[0].id;
  run = (await db.query<{ id: string }>(`insert into public.document_extraction_runs(
    tenant_id,patient_id,document_id,processing_job_id,source_content_sha256,
    extractor_name,extractor_version,status,page_count,extracted_page_count,
    review_page_count,failed_page_count,created_by
  ) values($1,$2,$3,$4,$5,'unpdf-embedded-text','test','extracted',1,1,0,0,$6) returning id`,
  [tenant, patient, document, job, "a".repeat(64), doctor])).rows[0].id;
  sourcePage = (await db.query<{ id: string }>(`insert into public.document_extracted_pages(
    tenant_id,patient_id,document_id,extraction_run_id,page_number,status,
    extraction_method,extracted_text,text_sha256
  ) values($1,$2,$3,$4,1,'extracted','embedded_text','SYNTHETIC SOURCE',$5) returning id`,
  [tenant, patient, document, run, "b".repeat(64)])).rows[0].id;
  await db.query(`insert into public.exam_extraction_batch_checkpoints(
    extraction_run_id,prompt_version,batch_key,page_numbers,result
  ) values($1,'prompt.1',$2,'[1]'::jsonb,'{"pages":[],"metadata":{}}'::jsonb)`,
  [run, "c".repeat(64)]);
});
after(async () => db.close());

test("resume and voluntary continuation retain one job/run, refund attempt, and invalidate lease", async () => {
  await db.exec("begin");
  try {
    await db.exec("set local role authenticated");
    await claims("authenticated", doctor, session);
    const resume = "select * from public.resume_exam_extraction($1,$2)";
    assert.deepEqual((await db.query(resume, [tenant, document])).rows,
      [{ job_id: job, status: "pending", resumed: false }]);
    await db.exec("set local role service_role");
    await claims("service_role");
    const first = (await db.query<{ lease_token: string; attempt_count: number }>(
      "select * from public.claim_next_exam_text_extraction_job()",
    )).rows[0];
    assert.equal(first.attempt_count, 1);
    await db.exec("set local role authenticated");
    await claims("authenticated", doctor, session);
    assert.deepEqual((await db.query(resume, [tenant, document])).rows,
      [{ job_id: job, status: "processing", resumed: false }]);
    await denied("select public.continue_exam_text_extraction_job($1,$2)", [job, first.lease_token], "42501");
    await db.exec("set local role service_role");
    await claims("service_role");
    assert.equal((await db.query<{ continued: boolean }>(
      "select public.continue_exam_text_extraction_job($1,$2) continued", [job, first.lease_token],
    )).rows[0].continued, true);
    await denied("select public.continue_exam_text_extraction_job($1,$2)", [job, first.lease_token], "42501");
    await db.exec("reset role");
    assert.deepEqual((await db.query<{ status: string; attempt_count: number; lease_token: string | null }>(
      "select status,attempt_count,lease_token from public.processing_jobs where id=$1", [job],
    )).rows, [{ status: "pending", attempt_count: 0, lease_token: null }]);
    await db.exec("set local role service_role");
    const second = (await db.query<{ lease_token: string; attempt_count: number }>(
      "select * from public.claim_next_exam_text_extraction_job()",
    )).rows[0];
    assert.equal(second.attempt_count, 1);
    assert.notEqual(second.lease_token, first.lease_token);
    await denied("select public.complete_processing_job($1,$2)", [job, first.lease_token], "42501");
    await db.query("select public.fail_processing_job($1,$2,'permanent')", [job, second.lease_token]);
    await db.exec("set local role authenticated");
    await claims("authenticated", doctor, session);
    const overlapping = await Promise.all([
      db.query<{ job_id: string; status: string; resumed: boolean }>(resume, [tenant, document]),
      db.query<{ job_id: string; status: string; resumed: boolean }>(resume, [tenant, document]),
    ]);
    assert.deepEqual(overlapping.map((response) => response.rows[0].resumed).sort(), [false, true]);
    assert.ok(overlapping.every((response) => response.rows[0].job_id === job
      && response.rows[0].status === "pending"));
    assert.equal((await db.query<{ attempt_count: number }>(
      "select attempt_count from public.processing_jobs where id=$1", [job],
    )).rows[0].attempt_count, 0);
    assert.equal((await db.query<{ count: string }>(
      "select count(*) from public.document_extraction_runs where id=$1 and processing_job_id=$2", [run, job],
    )).rows[0].count, 1);
    assert.deepEqual((await db.query<{ extracted_text: string }>(
      "select extracted_text from public.document_extracted_pages where extraction_run_id=$1", [run],
    )).rows, [{ extracted_text: "SYNTHETIC SOURCE" }]);
    await db.exec("reset role");
    assert.equal((await db.query<{ count: number }>(
      "select count(*) from public.exam_extraction_batch_checkpoints where extraction_run_id=$1", [run],
    )).rows[0].count, 1);
    assert.equal((await db.query<{ count: string }>(
      "select count(*) from public.audit_events where entity_type='processing_jobs' and entity_id=$1 and actor_user_id=$2 and 'attempt_count'=any(changed_fields)", [job, doctor],
    )).rows[0].count, 1);

    // A crashed lease can be recovered by the doctor without deleting the run.
    await db.exec("set local role service_role");
    await claims("service_role");
    const staleLease = (await db.query<{ lease_token: string }>(
      "select * from public.claim_next_exam_text_extraction_job()",
    )).rows[0].lease_token;
    await db.exec("reset role");
    await db.query("update public.processing_jobs set last_started_at=clock_timestamp()-interval '10 minutes', lease_expires_at=clock_timestamp()-interval '1 minute' where id=$1", [job]);
    await db.exec("set local role authenticated");
    await claims("authenticated", doctor, session);
    assert.deepEqual((await db.query(resume, [tenant, document])).rows,
      [{ job_id: job, status: "pending", resumed: true }]);
    await db.exec("set local role service_role");
    await claims("service_role");
    await denied("select public.complete_processing_job($1,$2)", [job, staleLease], "42501");
    const newLease = (await db.query<{ lease_token: string }>(
      "select * from public.claim_next_exam_text_extraction_job()",
    )).rows[0].lease_token;
    const finalWrite = "select public.persist_queued_exam_ai_extraction($1,$2,$3,'claude-test','1',$4::jsonb,$5::jsonb) count";
    const metadata = { document_type: "laudo", title: "Exame sintético", issuer: null,
      observed_on: null, identity_text: null, summary: [], quality_notes: [],
      model: "claude-test", prompt_version: "1", input_tokens: 0, output_tokens: 0 };
    await denied(finalWrite, [run, job, staleLease, "[]", JSON.stringify(metadata)], "42501");
    await denied(finalWrite, [run, randomUUID(), newLease, "[]", JSON.stringify(metadata)], "42501");
    await denied("select public.persist_exam_ai_extraction($1,'claude-test','1','[]'::jsonb,$2::jsonb)",
      [run, JSON.stringify(metadata)], "42501");
    assert.equal((await db.query<{ count: number }>(finalWrite,
      [run, job, newLease, "[]", JSON.stringify(metadata)])).rows[0].count, 0);
    await db.query("select public.complete_processing_job($1,$2)", [job, newLease]);
    await denied(finalWrite, [run, job, newLease, "[]", JSON.stringify(metadata)], "42501");
  } finally { await db.exec("rollback"); }
});

test("pilot fixture final write requires the same fenced lease without metadata", async () => {
  await db.exec("begin");
  try {
    await db.exec("set local role service_role");
    await claims("service_role");
    const lease = (await db.query<{ lease_token: string }>(
      "select * from public.claim_next_exam_text_extraction_job()",
    )).rows[0].lease_token;
    const item = { source_page_id: sourcePage, page_number: 1, item_index: 1,
      item_kind: "narrative", literal_name: "Texto sintético", literal_value: null,
      numeric_value: null, unit_text: null, reference_text: null, issuer_flag: null,
      method_text: null, specimen_text: null, observed_on: null,
      narrative_text: "SYNTHETIC SOURCE", source_excerpt: "SYNTHETIC SOURCE",
      source_start: 0, source_end: 16, extraction_confidence: null,
      requires_review_reason: "synthetic_pilot" };
    const write = "select public.persist_queued_exam_ai_extraction($1,$2,$3,'vivance-synthetic-fixture','1',$4::jsonb,null) count";
    await denied(write, [run, job, randomUUID(), JSON.stringify([item])], "42501");
    assert.equal((await db.query<{ count: number }>(write,
      [run, job, lease, JSON.stringify([item])])).rows[0].count, 1);
    assert.equal((await db.query<{ count: number }>(write,
      [run, job, lease, JSON.stringify([item])])).rows[0].count, 0);
  } finally { await db.exec("rollback"); }
});

test("resume enforces role, tenant, active session, care and creator; completed is final", async () => {
  await db.exec("begin");
  try {
    const resume = "select * from public.resume_exam_extraction($1,$2)";
    await db.exec("set local role authenticated");
    await claims("authenticated", nurse, nurseSession);
    await denied(resume, [tenant, document], "42501");
    await claims("authenticated", outsider, outsiderSession);
    await denied(resume, [tenant, document], "42501");
    await claims("authenticated", doctor, randomUUID());
    await denied(resume, [tenant, document], "42501");
    await claims("authenticated", doctor, session);
    await denied(resume, [randomUUID(), document], "42501");
    await db.exec("reset role");
    await db.query("insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'doctor','active','Other doctor')", [tenant, otherDoctor]);
    await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$3)", [tenant, patient, otherDoctor]);
    await db.exec("set local role authenticated");
    await claims("authenticated", otherDoctor, otherSession);
    await denied(resume, [tenant, document], "40001");
    await db.exec("reset role");
    await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and patient_id=$2 and professional_id=$3", [tenant, patient, doctor]);
    await db.exec("set local role authenticated");
    await claims("authenticated", doctor, session);
    await denied(resume, [tenant, document], "42501");
    await db.exec("reset role");
    await db.query("update public.care_relationships set status='active' where tenant_id=$1 and patient_id=$2 and professional_id=$3", [tenant, patient, doctor]);
    await db.exec("set local role service_role");
    await claims("service_role");
    await denied("select public.continue_exam_text_extraction_job($1,$2)", [job, randomUUID()], "42501");
    const lease = (await db.query<{ lease_token: string }>(
      "select * from public.claim_next_exam_text_extraction_job()",
    )).rows[0].lease_token;
    await db.query("select public.complete_processing_job($1,$2)", [job, lease]);
    await db.exec("set local role authenticated");
    await claims("authenticated", doctor, session);
    await denied(resume, [tenant, document], "40001");
  } finally { await db.exec("rollback"); }
});
