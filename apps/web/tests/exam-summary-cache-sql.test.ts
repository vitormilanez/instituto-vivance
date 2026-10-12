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


after(async()=>db.close());
async function seedReviewedFact(){
 const id=randomUUID();
 await db.query(`insert into public.exam_result_items(id,tenant_id,patient_id,document_id,extraction_run_id,source_page_id,page_number,item_index,item_kind,literal_name,literal_value,numeric_value,unit_text,reference_text,observed_on,source_excerpt,source_excerpt_sha256,source_start,source_end,requires_review_reason,extractor_name,extractor_version,structured_content_sha256) values($1,$2,$3,$4,$5,$6,1,1,'laboratory','Glicose','105',105,'mg/dL','70–99 mg/dL','2026-10-01','SOURCE',$7,0,6,'synthetic_pilot','test','1',$7)`,[id,tenant,patient,document,run,sourcePage,"a".repeat(64)]);
 await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,reviewed_by) values($1,$2,$3,$4,1,'confirmed',$5)",[tenant,patient,id,randomUUID(),doctor]);
 await db.exec("set local role authenticated");await claims("authenticated",doctor,session);return id;
}
type Started={summaryId:string;leaseToken?:string;cached:boolean;rejected?:boolean;status:string;manifest?:{generationContract:Record<string,string>}};
async function beginSummary(){return(await db.query<{v:Started}>("select public.begin_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;}
test("model prompt and verifier contracts participate in cache identity and stale detection",async()=>{
 await db.exec("begin");
 try{
  await seedReviewedFact();
  let initial=await beginSummary();assert.equal(initial.cached,false);
  assert.deepEqual(initial.manifest?.generationContract,{providerModel:"claude-haiku-5-5",promptVersion:"vivance-exam-summary-20261011.1",verifierVersion:"exam-selection-v2"});
  assert.equal((await beginSummary()).cached,true);
  for(const [key,value] of [["promptVersion","test-prompt-v2"],["verifierVersion","test-verifier-v3"],["providerModel","synthetic-test-model"]]){
   await db.exec("reset role");
   await db.exec(`create or replace function private.exam_summary_manifest(t uuid,p uuid) returns jsonb language sql stable security definer set search_path='' as $$ select private.exam_summary_manifest_before_generation_contract(t,p)||jsonb_build_object('generationContract',jsonb_build_object('providerModel','claude-haiku-5-5','promptVersion','vivance-exam-summary-20261011.1','verifierVersion','exam-selection-v2')||jsonb_build_object('${key}','${value}')) $$`);
   await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
   const view=(await db.query<{v:{stale:boolean}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;assert.equal(view.stale,true);
   const next=await beginSummary();assert.equal(next.cached,false);assert.notEqual(next.summaryId,initial.summaryId);assert.equal((await beginSummary()).cached,true);initial=next;
  }
 }finally{await db.exec("rollback");}
});
test("medical rejection preserves claims without another lease; technical failure still retries",async()=>{
 await db.exec("begin");
 try{
  const item=await seedReviewedFact();const first=await beginSummary();
  await db.exec("set local role service_role");await claims("service_role");
  const finish="select public.finish_exam_summary($1,$2,$3::jsonb,'[]','[]','test',10,5,0)";
  await db.query(finish,[first.summaryId,first.leaseToken,null]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const retry=await beginSummary();assert.equal(retry.cached,false);assert.equal(retry.summaryId,first.summaryId);assert.notEqual(retry.leaseToken,first.leaseToken);
  await db.exec("set local role service_role");await claims("service_role");
  const originalClaims=[{type:"exam_fact",text:"Glicose: 105",sourceIds:[item]}];await db.query(finish,[retry.summaryId,retry.leaseToken,JSON.stringify(originalClaims)]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  await db.query("select public.review_exam_summary($1,$2,$3,'reject','Resumo rejeitado em teste')",[tenant,patient,retry.summaryId]);
  const rejected=await beginSummary();assert.deepEqual(rejected,{summaryId:retry.summaryId,cached:true,status:"failed",rejected:true});
  const view=(await db.query<{v:{rejected:boolean}}>("select public.get_exam_summary($1,$2) v",[tenant,patient])).rows[0].v;assert.equal(view.rejected,true);
  await db.exec("reset role");
  const preserved=(await db.query<{claims:unknown;lease_token:string|null;status:string}>("select claims,lease_token,status from public.exam_longitudinal_summaries where id=$1",[retry.summaryId])).rows[0];assert.deepEqual(preserved.claims,originalClaims);assert.equal(preserved.lease_token,null);assert.equal(preserved.status,"failed");
  await db.query("insert into public.exam_result_item_reviews(tenant_id,patient_id,item_id,review_request_id,version,decision,reviewed_by) values($1,$2,$3,$4,2,'confirmed',$5)",[tenant,patient,item,randomUUID(),doctor]);
  await db.exec("set local role authenticated");await claims("authenticated",doctor,session);
  const changed=await beginSummary();assert.equal(changed.cached,false);assert.notEqual(changed.summaryId,rejected.summaryId);
 }finally{await db.exec("rollback");}
});
