import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { before, after, test } from "node:test";
const db = new PGlite({ extensions: { btree_gist } });
const tenant=randomUUID(),otherTenant=randomUUID(),doctor=randomUUID(),colleague=randomUUID(),patient=randomUUID(),account=randomUUID(),admin=randomUUID();
const session=randomUUID(),colleagueSession=randomUUID(),patientSession=randomUUID(),adminSession=randomUUID(),appointment=randomUUID(),second=randomUUID();
type Import = {id:string;segments:unknown[];originalText:string;sourceHash:string;review:{decision:string;note:string}|null};
async function rpc(operation:string,payload:object={},id=appointment,actor=doctor,actorSession=session,clinic=tenant) {
  return (await db.query<{value:{imports:Import[]}}>("select public.browser_transcript_operation($1,$2,$3,$4,$5,$6::jsonb) value",[operation,clinic,actor,actorSession,id,JSON.stringify(payload)])).rows[0].value;
}
async function denied(operation:string,payload:object={},id=appointment,actor=doctor,actorSession=session,clinic=tenant,code="42501") {
  await assert.rejects(rpc(operation,payload,id,actor,actorSession,clinic),(e:unknown)=>{assert.equal((e as {code:string}).code,code);return true;});
}
const capture=()=>({idempotencyKey:randomUUID(),source:"browser_speech_recognition",captureMode:"microphone",startedAt:"2026-10-14T12:00:00Z",endedAt:"2026-10-14T12:02:00Z",patientPermissionConfirmed:true,permissionNote:"Paciente sintético autorizou verbalmente antes de iniciar às 12h.",segments:[{text:"  Texto literal. ",capturedAt:"2026-10-14T12:01:00Z",speaker:"unknown"},{text:"Segundo trecho",capturedAt:"2026-10-14T12:02:00Z",speaker:"unknown"}]});
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
  for(const name of readdirSync(migrations).filter(n=>n.endsWith(".sql")&&!n.endsWith(" 2.sql")).sort()) await db.exec(readFileSync(new URL(name,migrations),"utf8"));
  await db.query("insert into auth.users(id) values($1),($2),($3),($4)",[doctor,colleague,account,admin]);
  await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4),($5,$6),($7,$8)",[session,doctor,colleagueSession,colleague,patientSession,account,adminSession,admin]);
  await db.query("insert into public.tenants(id,name) values($1,'Synthetic browser clinic'),($2,'Other synthetic clinic')",[tenant,otherTenant]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,display_name) values($1,$2,'doctor','Synthetic Doctor'),($1,$3,'doctor','Synthetic Colleague'),($1,$4,'patient','Synthetic Patient'),($1,$5,'admin','Synthetic Admin')",[tenant,doctor,colleague,account,admin]);
  await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic patient',$3)",[patient,tenant,doctor]);
  await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$3)",[tenant,patient,doctor]);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:doctor,session_id:session,role:"authenticated"})]);
  await db.query("insert into public.appointments(id,tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,now()+interval '1 day',now()+interval '1 day 1 hour'),($5,$2,$3,$4,now()+interval '2 days',now()+interval '2 days 1 hour')",[appointment,tenant,patient,doctor,second]);
});
after(()=>db.close());
test("source and reviews are private even from service table writes; RPC is server only",async()=>{
  for(const role of ["anon","authenticated"]) assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege($1,'public.browser_transcript_operation(text,uuid,uuid,uuid,uuid,jsonb)','EXECUTE') allowed",[role])).rows[0].allowed,false);
  for(const role of ["anon","authenticated","service_role"]) for(const table of ["browser_transcripts","browser_transcript_reviews"]) assert.equal((await db.query<{allowed:boolean}>("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') allowed",[role,`public.${table}`])).rows[0].allowed,false);
  assert.deepEqual(await rpc("list"),{imports:[]},"no Google credentials/connection required");
  await denied("save",capture(),appointment,account,patientSession);
  await denied("list",{},appointment,admin,adminSession);
  await denied("list",{},appointment,colleague,colleagueSession);
  await denied("list",{},appointment,doctor,session,otherTenant);
});
test("SQL validates consent, literal source, windows, segments and combined text limits",async()=>{
  const value=capture();
  for(const changed of [{patientPermissionConfirmed:false},{permissionNote:""},{source:"google_meet"},{captureMode:"audio"},{idempotencyKey:"not-uuid"},{endedAt:"2026-10-14T11:59:00Z"},{endedAt:"2026-10-14T16:00:01Z"},{endedAt:"2036-10-14T12:00:00Z"},{startedAt:"infinity"},{segments:[{...value.segments[0],speaker:"doctor"}]},{segments:[{...value.segments[0],capturedAt:"2026-10-14T12:03:00Z"}]},{segments:[]},{segments:Array.from({length:1001},()=>value.segments[0])},{segments:[{...value.segments[0],text:"x".repeat(100001)}]}]) await denied("save",{...value,...changed},appointment,doctor,session,tenant,"23514");
  assert.equal((await rpc("list")).imports.length,0);
});
test("same key retries are idempotent; mismatched originals and bindings cannot overwrite",async()=>{
  const value=capture(),first=(await rpc("save",value)).imports[0];
  assert.equal((await rpc("save",value)).imports.length,1);
  assert.deepEqual(first.segments,value.segments);assert.equal(first.originalText,"  Texto literal. \nSegundo trecho");assert.equal(first.review,null);
  await denied("save",{...value,segments:[{...value.segments[0],text:"Changed"}]},appointment,doctor,session,tenant,"23505");
  await denied("save",{...value,permissionNote:"Permission claim changed"},appointment,doctor,session,tenant,"23505");
  await denied("save",value,second,doctor,session,tenant,"23505");
  await assert.rejects(db.query("update public.browser_transcripts set original_text='overwritten' where id=$1",[first.id]),(e:unknown)=>(e as {code:string}).code==="42501");
  await assert.rejects(db.query("delete from public.browser_transcripts where id=$1",[first.id]),(e:unknown)=>(e as {code:string}).code==="42501");
  assert.equal((await db.query<{n:number}>("select count(*)::int n from public.audit_events where entity_id=$1 and action in ('browser_transcript_consent','browser_transcript_save')",[first.id])).rows[0].n,2);
});
test("review is append-only and preserves the source; current appointment and care linkage gate access",async()=>{
  const original=(await rpc("list")).imports[0];
  await denied("review",{transcriptId:original.id,decision:"reviewed",note:""},appointment,doctor,session,tenant,"23514");
  await denied("review",{transcriptId:original.id,decision:"reviewed",note:"a"},second);
  await rpc("review",{transcriptId:original.id,decision:"reviewed",note:"Conferido, sem publicação."});
  await rpc("review",{transcriptId:original.id,decision:"rejected",note:"Trecho incompleto."});
  const reviewed=(await rpc("list")).imports[0];assert.deepEqual(reviewed.segments,original.segments);assert.equal(reviewed.sourceHash,original.sourceHash);assert.equal(reviewed.review?.decision,"rejected");
  assert.equal((await db.query<{n:number}>("select count(*)::int n from public.browser_transcript_reviews where transcript_id=$1",[original.id])).rows[0].n,2);
  await assert.rejects(db.query("update public.browser_transcript_reviews set note='overwrite' where transcript_id=$1",[original.id]),(e:unknown)=>(e as {code:string}).code==="42501");
  await db.query("update public.appointments set doctor_id=$1,expected_version=version where id=$2",[colleague,appointment]);await denied("list");
  await db.query("update public.appointments set doctor_id=$1,expected_version=version where id=$2",[doctor,appointment]);
  await db.query("delete from auth.sessions where id=$1",[session]);await denied("list");
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)",[session,doctor]);
  await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and patient_id=$2",[tenant,patient]);await denied("list");await denied("save",capture());await denied("review",{transcriptId:original.id,decision:"reviewed",note:"Denied"});
});
