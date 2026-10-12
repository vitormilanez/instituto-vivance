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
  await db.query("insert into public.exam_processing_authorizations(tenant_id,patient_id,document_id,authorized_by) values($1,$2,$3,$4)",[tenant,patient,document,doctor]);
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


test("document validation requires terminal item review, records exclusions and invalidates after correction",async()=>{
 await db.exec("begin");
 try {
  const id=randomUUID();
  await db.query(`insert into public.exam_result_items(id,tenant_id,patient_id,document_id,extraction_run_id,source_page_id,page_number,item_index,item_kind,literal_name,literal_value,numeric_value,unit_text,reference_text,observed_on,source_excerpt,source_excerpt_sha256,source_start,source_end,requires_review_reason,extractor_name,extractor_version,structured_content_sha256) values($1,$2,$3,$4,$5,$6,1,1,'laboratory','Glicose','105',105,'mg/dL','70–99 mg/dL','2026-10-01','SOURCE',$7,0,6,'synthetic_pilot','test','1',$7)`,[id,tenant,patient,document,run,sourcePage,"a".repeat(64)]);
  await db.query("update public.processing_jobs set status='completed',completed_at=now() where id=$1",[job]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const save="select public.review_exam_document_validation($1,$2,$3,$4,$5,$6,$7::integer[]) id";
  await denied(save,[tenant,document,randomUUID(),0,"reviewed",null,[]],"23514");
  await denied(save,[tenant,document,randomUUID(),0,"excluded","short",[]],"22023");
  await denied(save,[tenant,document,randomUUID(),0,"excluded",null,[]],"23514");
  await claims("authenticated",nurse,nurseSession);await denied("select public.get_exam_document_validation($1,$2)",[tenant,document],"42501");
  await claims("authenticated",doctor,session);await denied("select public.get_exam_document_validation($1,$2)",[randomUUID(),document],"42501");
  await db.exec("reset role");
  await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,reviewed_by) values($1,$2,$3,$4,1,'confirmed',$5)",[tenant,patient,id,randomUUID(),doctor]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const request=randomUUID();
  const validated=(await db.query<{id:string}>(save,[tenant,document,request,0,"reviewed",null,[]])).rows[0].id;
  assert.equal((await db.query<{id:string}>(save,[tenant,document,request,0,"reviewed",null,[]])).rows[0].id,validated);
  const complete=(await db.query<{v:{manifest:{coverage:{complete:boolean;reviewedDocuments:number}}}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;
  assert.equal(complete.manifest.coverage.complete,true);assert.equal(complete.manifest.coverage.reviewedDocuments,1);
  await denied(save,[tenant,document,randomUUID(),0,"excluded","Excluído por conferência médica.",[]],"40001");
  await db.exec("reset role");
  await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,corrected_data,reviewed_by) values($1,$2,$3,$4,2,'corrected','{\"literal_value\":\"106\"}',$5)",[tenant,patient,id,randomUUID(),doctor]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const stale=(await db.query<{v:{stale:boolean}}>("select public.get_exam_document_validation($1,$2) v",[tenant,document])).rows[0].v;assert.equal(stale.stale,true);
  const incomplete=(await db.query<{v:{manifest:{coverage:{complete:boolean}}}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;assert.equal(incomplete.manifest.coverage.complete,false);
  await db.query(save,[tenant,document,randomUUID(),1,"excluded","Documento excluído após conferência médica.",[]]);
  const excluded=(await db.query<{v:{manifest:{facts:unknown[];coverage:{complete:boolean;excludedDocuments:number}}}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;assert.equal(excluded.manifest.facts.length,0);assert.equal(excluded.manifest.coverage.complete,true);assert.equal(excluded.manifest.coverage.excludedDocuments,1);
  await db.exec("reset role");assert.equal((await db.query<{n:number}>("select count(*) n from public.patient_documents where id=$1",[document])).rows[0].n,1);
  await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,reviewed_by) values($1,$2,$3,$4,3,'confirmed',$5)",[tenant,patient,id,randomUUID(),doctor]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const stillExcluded=(await db.query<{v:{manifest:{facts:unknown[]}}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;assert.equal(stillExcluded.manifest.facts.length,0);
 }finally{await db.exec("rollback");}
});
test("quality notes and unresolved pages require explicit resolution with justified exclusions",async()=>{
 await db.exec("begin");
 try{
  await db.query("update public.processing_jobs set status='completed',completed_at=now() where id=$1",[job]);
  await db.query("alter table public.document_extraction_runs disable trigger all");
  await db.query("update public.document_extraction_runs set status='requires_review',page_count=2,extracted_page_count=1,review_page_count=1 where id=$1",[run]);
  await db.query("alter table public.document_extraction_runs enable trigger all");
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const save="select public.review_exam_document_validation($1,$2,$3,0,'reviewed',$4,$5::integer[]) id";
  await denied(save,[tenant,document,randomUUID(),null,[2]],"23514");
  await denied(save,[tenant,document,randomUUID(),"Página ilegível excluída pelo médico.",[]],"23514");
  await denied(save,[tenant,document,randomUUID(),"Página ilegível excluída pelo médico.",[3]],"22023");
  const reviewed=await db.query(save,[tenant,document,randomUUID(),"Página 2 ilegível excluída pelo médico.",[2]]);assert.equal(reviewed.rows.length,1);
  const state=(await db.query<{v:{validation:{excluded_pages:number[];decision:string}}}>("select public.get_exam_document_validation($1,$2) v",[tenant,document])).rows[0].v;
  assert.deepEqual(state.validation.excluded_pages,[2]);assert.equal(state.validation.decision,"reviewed");
 }finally{await db.exec("rollback");}
});
test("quality notes require medical explanation even when all pages were read",async()=>{
 await db.exec("begin");
 try{
  await db.query("update public.processing_jobs set status='completed',completed_at=now() where id=$1",[job]);
  await db.query(`insert into public.exam_document_metadata(extraction_run_id,tenant_id,patient_id,document_id,document_type,title,summary,quality_notes,model,prompt_version) values($1,$2,$3,$4,'laudo','Sintético','[]','["Conferir possíveis omissões"]','test','1')`,[run,tenant,patient,document]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const save="select public.review_exam_document_validation($1,$2,$3,0,'reviewed',$4,'{}'::integer[]) id";
  await denied(save,[tenant,document,randomUUID(),null],"23514");
  assert.equal((await db.query(save,[tenant,document,randomUUID(),"Original integral conferido, nota resolvida pelo médico."])).rows.length,1);
 }finally{await db.exec("rollback");}
});
test("correção de outra página não revoga páginas excluídas pelo médico",async()=>{
 await db.exec("begin");
 try {
  await db.query("update public.processing_jobs set status='completed',completed_at=now() where id=$1",[job]);
  await db.exec("alter table public.document_extraction_runs disable trigger all");
  await db.query("update public.document_extraction_runs set page_count=2,extracted_page_count=2 where id=$1",[run]);
  await db.exec("alter table public.document_extraction_runs enable trigger all");
  const page2=(await db.query<{id:string}>("insert into public.document_extracted_pages(tenant_id,patient_id,document_id,extraction_run_id,page_number,status,extraction_method,extracted_text,text_sha256) values($1,$2,$3,$4,2,'extracted','embedded_text','SYNTHETIC SOURCE',$5) returning id",[tenant,patient,document,run,"b".repeat(64)])).rows[0].id;
  const first=randomUUID(),second=randomUUID();
  for(const [id,page,source] of [[first,1,sourcePage],[second,2,page2]]) {
   await db.query("insert into public.exam_result_items(id,tenant_id,patient_id,document_id,extraction_run_id,source_page_id,page_number,item_index,item_kind,literal_name,literal_value,numeric_value,unit_text,reference_text,observed_on,source_excerpt,source_excerpt_sha256,source_start,source_end,requires_review_reason,extractor_name,extractor_version,structured_content_sha256) values($1,$2,$3,$4,$5,$6,$7,1,'laboratory','Glicose','105',105,'mg/dL','70–99 mg/dL','2026-10-01','SOURCE',$8,0,6,'synthetic_pilot','test','1',$8)",[id,tenant,patient,document,run,source,page,"a".repeat(64)]);
   await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,reviewed_by) values($1,$2,$3,$4,1,'confirmed',$5)",[tenant,patient,id,randomUUID(),doctor]);
  }
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  await db.query("select public.review_exam_document_validation($1,$2,$3,0,'reviewed','Página 2 excluída após conferência.',array[2])",[tenant,document,randomUUID()]);
  const read=async()=>(await db.query<{v:{manifest:{facts:{itemId:string}[]}}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v.manifest.facts;
  assert.deepEqual((await read()).map(f=>f.itemId),[first]);
  await db.exec("reset role");
  await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,corrected_data,reviewed_by) values($1,$2,$3,$4,2,'corrected','{\"literal_value\":\"106\"}',$5)",[tenant,patient,first,randomUUID(),doctor]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  assert.deepEqual((await read()).map(f=>f.itemId),[first]);
 } finally {await db.exec("rollback");}
});
