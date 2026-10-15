import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";

const db = new PGlite({ extensions: { btree_gist } });
const tenant=randomUUID(),otherTenant=randomUUID(),doctor=randomUUID(),colleague=randomUUID(),patient=randomUUID(),account=randomUUID();
const doctorSession=randomUUID(),colleagueSession=randomUUID(),patientSession=randomUUID(),appointment=randomUUID(),secondAppointment=randomUUID();

type State = { role:"doctor"|"patient"; consent:{decision:string}; capture?:{id:string|null;status:string;nextChunkIndex:number;segments:unknown[];sourceHash:string|null}; summary?:{status:string;draft:{id:string;version:number;summary:unknown}|null;review:{decision:string}|null} };
type Claim = { claim:{jobId:string;leaseToken:string;sourceHash:string;consentEventId:string;consentVersion:string;segments:{id:string;text:string;speaker:string}[]} };
type History = {items:Array<{appointmentId:string;summaryStatus:string;summary:null|{id:string;version:number;mode:string;incomplete:boolean;reviewDecision:string|null;categories:unknown}}>;truncated:boolean;limit:number};

async function rpc(operation:string,payload:object={},actor=doctor,session=doctorSession,id=appointment,clinic=tenant) {
  return (await db.query<{value:State|Claim}>(
    "select public.consultation_workflow_operation($1,$2,$3,$4,$5,$6::jsonb) value",
    [operation,clinic,actor,session,id,JSON.stringify(payload)],
  )).rows[0].value;
}
async function denied(operation:string,payload:object={},actor=doctor,session=doctorSession,id=appointment,code="42501") {
  await assert.rejects(rpc(operation,payload,actor,session,id), (error:unknown) => {
    assert.equal((error as {code:string}).code,code); return true;
  });
}
async function history(actor=doctor,session=doctorSession,clinic=tenant,targetPatient=patient) {
  return (await db.query<{value:History}>(
    "select public.consultation_workflow_patient_history($1,$2,$3,$4) value",
    [clinic,actor,session,targetPatient],
  )).rows[0].value;
}
const decide = (decision:"granted"|"refused"|"withdrawn", decisionId=randomUUID(), id=appointment) =>
  rpc("consent_decide",{decisionId,consentVersion:"consultation-assistance-v1",decision},account,patientSession,id);
const segment = (captureId:string,index=0,clientChunkId=randomUUID(),startSeconds=index*5) => ({
  captureId,chunkIndex:index,clientChunkId,text:`Trecho fictício ${index}.`,capturedAt:new Date(Date.now()+index*1000).toISOString(),
  startSeconds,endSeconds:startSeconds+4,speaker:"unknown",
});

before(async()=>{
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null,created_at timestamptz not null default now(),unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema auth to anon,authenticated; grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;`);
  const migrations=new URL("../../../supabase/migrations/",import.meta.url);
  for(const name of readdirSync(migrations).filter(name=>name.endsWith(".sql")&&!name.endsWith(" 2.sql")).sort())
    await db.exec(readFileSync(new URL(name,migrations),"utf8"));
  await db.query("insert into auth.users(id) values($1),($2),($3)",[doctor,colleague,account]);
  await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4),($5,$6)",[
    doctorSession,doctor,colleagueSession,colleague,patientSession,account,
  ]);
  await db.query("insert into public.tenants(id,name) values($1,'Synthetic consultation clinic'),($2,'Other clinic')",[tenant,otherTenant]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,display_name) values($1,$2,'doctor','Doctor'),($1,$3,'doctor','Colleague'),($1,$4,'patient','Patient')",[tenant,doctor,colleague,account]);
  await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic patient',$3)",[patient,tenant,doctor]);
  await db.query("insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",[tenant,patient,account]);
  await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$3)",[tenant,patient,doctor]);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:doctor,session_id:doctorSession,role:"authenticated"})]);
  await db.query(`insert into public.appointments(id,tenant_id,patient_id,doctor_id,starts_at,ends_at)
    values($1,$2,$3,$4,now()+interval '1 day',now()+interval '1 day 1 hour'),
      ($5,$2,$3,$4,now()+interval '2 days',now()+interval '2 days 1 hour')`,[appointment,tenant,patient,doctor,secondAppointment]);
});
after(()=>db.close());

test("workflow tables are private and patient output never exposes capture or summary",async()=>{
  for(const role of ["anon","authenticated"])
    assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege($1,'public.consultation_workflow_operation(text,uuid,uuid,uuid,uuid,jsonb)','EXECUTE') allowed",[role])).rows[0].allowed,false);
  for(const role of ["anon","authenticated","service_role"]) for(const table of [
    "consultation_consent_events","consultation_capture_sessions","consultation_capture_chunks","consultation_sources",
    "consultation_summary_jobs","consultation_summary_versions","consultation_summary_reviews",
  ]) assert.equal((await db.query<{allowed:boolean}>("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') allowed",[role,`public.${table}`])).rows[0].allowed,false);
  const patientView=await rpc("list",{},account,patientSession);
  assert.deepEqual(Object.keys(patientView).sort(),["appointmentId","consent","patientId","role"]);
  await denied("list",{},colleague,colleagueSession);
  await denied("consent_decide",{decisionId:randomUUID(),consentVersion:"consultation-assistance-v1",decision:"granted"});
});

test("only linked patient grants versioned consent and retries cannot rewrite it",async()=>{
  const decisionId=randomUUID();
  assert.equal((await decide("granted",decisionId) as State).consent.decision,"granted");
  assert.equal((await decide("granted",decisionId) as State).consent.decision,"granted");
  await denied("consent_decide",{decisionId,consentVersion:"consultation-assistance-v1",decision:"withdrawn"},account,patientSession,appointment,"23505");
  assert.equal((await db.query<{n:number}>("select count(*)::int n from public.consultation_consent_events where appointment_id=$1",[appointment])).rows[0].n,1);
  assert.match((await db.query<{consent_text:string}>("select consent_text from public.consultation_consent_events where appointment_id=$1",[appointment])).rows[0].consent_text,/resumo por IA/);
});

test("capture checkpoints are ordered, idempotent, recoverable and finalized independently from the encounter",async()=>{
  const captureId=randomUUID(),first=segment(captureId);
  assert.equal((await rpc("begin",{captureId}) as State).capture?.status,"capturing");
  assert.equal((await rpc("append_chunk",first) as State).capture?.nextChunkIndex,1);
  assert.equal((await rpc("append_chunk",first) as State).capture?.nextChunkIndex,1);
  await denied("append_chunk",{...first,text:"changed"},doctor,doctorSession,appointment,"23505");
  await denied("append_chunk",segment(captureId,2),doctor,doctorSession,appointment,"40001");
  assert.equal((await rpc("pause",{captureId}) as State).capture?.status,"paused");
  assert.equal((await rpc("list") as State).capture?.segments.length,1);
  assert.equal((await rpc("begin",{captureId}) as State).capture?.status,"capturing");
  await rpc("append_chunk",segment(captureId,1,randomUUID(),5));
  const ended=await rpc("end",{captureId}) as State;
  assert.equal(ended.capture?.status,"finalized"); assert.equal(ended.summary?.status,"pending");
  assert.equal((await db.query<{status:string}>("select status from public.appointments where id=$1",[appointment])).rows[0].status,"scheduled");
  const sourceId=(await db.query<{id:string}>("select id from public.consultation_sources where appointment_id=$1",[appointment])).rows[0].id;
  await assert.rejects(db.query("update public.consultation_sources set original_text='overwrite' where id=$1",[sourceId]),(error:unknown)=>(error as {code:string}).code==="42501");
});

test("lease token, source hash and current consent guard summary completion",async()=>{
  const claim=await rpc("summary_claim",{contractVersion:"consultation-summary-v1",generatorKey:"synthetic-v1",leaseSeconds:30}) as Claim;
  assert.equal(claim.claim.segments.length,2); assert.equal(claim.claim.segments[0].speaker,"unknown");
  await denied("summary_claim",{contractVersion:"consultation-summary-v1",generatorKey:"synthetic-v1",leaseSeconds:30},doctor,doctorSession,appointment,"40001");
  await denied("summary_complete",{jobId:claim.claim.jobId,leaseToken:randomUUID(),sourceHash:claim.claim.sourceHash,
    consentEventId:claim.claim.consentEventId,consentVersion:claim.claim.consentVersion,summary:{},metadata:{}},doctor,doctorSession,appointment,"40001");
  await decide("withdrawn");
  await denied("summary_complete",{jobId:claim.claim.jobId,leaseToken:claim.claim.leaseToken,sourceHash:claim.claim.sourceHash,
    consentEventId:claim.claim.consentEventId,consentVersion:claim.claim.consentVersion,summary:{},metadata:{}},doctor,doctorSession,appointment,"23514");
  const cancelled=await rpc("list") as State; assert.equal(cancelled.summary?.status,"cancelled"); assert.equal(cancelled.capture?.segments.length,2);
});

test("new grant can create a new source; generated draft and correction remain private and versioned",async()=>{
  await decide("granted",randomUUID(),secondAppointment);
  const captureId=randomUUID(); await rpc("begin",{captureId},doctor,doctorSession,secondAppointment);
  await rpc("append_chunk",segment(captureId),doctor,doctorSession,secondAppointment);
  await rpc("end",{captureId},doctor,doctorSession,secondAppointment);
  const claim=await rpc("summary_claim",{contractVersion:"consultation-summary-v1",generatorKey:"synthetic-v1",leaseSeconds:120},doctor,doctorSession,secondAppointment) as Claim;
  const summary={contractVersion:"consultation-summary-v1",mode:"extractive",categories:{discussed:[],patient_goals:[],difficulties:[],conditions_and_history:[],medications_and_supplements:[],goals:[],actions_and_followup:[],uncertainties:[{text:"Trecho fictício 0.",assertion:"uncertainty",evidence:[{sourceId:claim.claim.segments[0].id,quote:"Trecho fictício 0."}]}]},incomplete:true,limitations:["Fictício."]};
  const ready=await rpc("summary_complete",{jobId:claim.claim.jobId,leaseToken:claim.claim.leaseToken,sourceHash:claim.claim.sourceHash,
    consentEventId:claim.claim.consentEventId,consentVersion:claim.claim.consentVersion,summary,metadata:{provider:"none"}},doctor,doctorSession,secondAppointment) as State;
  assert.equal(ready.summary?.status,"ready"); assert.equal(ready.summary?.draft?.version,1);
  const reviewed=await rpc("review_summary",{summaryId:ready.summary!.draft!.id,expectedVersion:1,decision:"accepted",note:"Conferido em fixture.",correctedSummary:summary},doctor,doctorSession,secondAppointment) as State;
  assert.equal(reviewed.summary?.draft?.version,2); assert.equal(reviewed.summary?.review?.decision,"accepted");
  const patientView=await rpc("list",{},account,patientSession,secondAppointment) as State;
  assert.equal(patientView.role,"patient"); assert.equal("capture" in patientView,false); assert.equal("summary" in patientView,false);
  await denied("review_summary",{summaryId:reviewed.summary!.draft!.id,expectedVersion:2,decision:"accepted",note:"blocked"},account,patientSession,secondAppointment);
});

test("patient history is bounded, doctor-only, assignment-safe and exposes rejected review without source",async()=>{
  for(const role of ["anon","authenticated"])
    assert.equal((await db.query<{allowed:boolean}>(
      "select has_function_privilege($1,'public.consultation_workflow_patient_history(uuid,uuid,uuid,uuid)','EXECUTE') allowed",
      [role],
    )).rows[0].allowed,false);
  assert.equal((await db.query<{allowed:boolean}>(
    "select has_function_privilege('service_role','public.consultation_workflow_patient_history(uuid,uuid,uuid,uuid)','EXECUTE') allowed",
  )).rows[0].allowed,true);

  const state=await rpc("list",{},doctor,doctorSession,secondAppointment) as State;
  await rpc("review_summary",{summaryId:state.summary!.draft!.id,expectedVersion:2,decision:"rejected",note:"Não utilizar."},doctor,doctorSession,secondAppointment);
  const value=await history();
  assert.equal(value.limit,20); assert.equal(value.truncated,false); assert.equal(value.items.length,2);
  const rejected=value.items.find(item=>item.appointmentId===secondAppointment)!;
  assert.equal(rejected.summaryStatus,"ready"); assert.equal(rejected.summary?.version,2);
  assert.equal(rejected.summary?.mode,"extractive"); assert.equal(rejected.summary?.incomplete,true);
  assert.equal(rejected.summary?.reviewDecision,"rejected");
  assert.doesNotMatch(JSON.stringify(value),/"(?:capture|segments|sourceHash|metadata|note)"/);

  for(const attempt of [
    history(account,patientSession),
    history(colleague,colleagueSession),
    history(doctor,randomUUID()),
    history(doctor,doctorSession,otherTenant),
  ]) await assert.rejects(attempt,(error:unknown)=>(error as {code:string}).code==="42501");

  await db.query("update public.appointments set doctor_id=$1,expected_version=version where id=$2",[colleague,secondAppointment]);
  const afterReassignment=await history();
  assert.equal(afterReassignment.items.length,1);
  assert.equal(afterReassignment.items.some(item=>item.appointmentId===secondAppointment),false);
  await db.query("update public.appointments set doctor_id=$1,expected_version=version where id=$2",[doctor,secondAppointment]);
  assert.equal((await history()).items.length,2);
});

test("live care assignment is rechecked for reads and writes",async()=>{
  await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and patient_id=$2 and professional_id=$3",[tenant,patient,doctor]);
  await assert.rejects(history(),(error:unknown)=>(error as {code:string}).code==="42501");
  await denied("list",{},doctor,doctorSession,secondAppointment);
  await denied("begin",{captureId:randomUUID()},doctor,doctorSession,secondAppointment);
});
