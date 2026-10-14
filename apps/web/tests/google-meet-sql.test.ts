import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { before, after, test } from "node:test";
const db = new PGlite({ extensions: { btree_gist } });
const tenant = randomUUID(), doctor = randomUUID(), colleague = randomUUID(), patient = randomUUID(), account = randomUUID();
const doctorSession = randomUUID(), colleagueSession = randomUUID(), patientSession = randomUUID();
const appointment = randomUUID(), manual = randomUUID();
type Result = { generation: number; attempt_id: string; id: string; room: { id: string; space_name: string }; connection: { generation: number }; imports: { id: string; entries: unknown[]; review: { decision: string } | null }[] };
async function rpc(operation: string, payload: object = {}, id: string | null = appointment, actor=doctor, session=doctorSession) {
  if (operation === "import" && !("sources" in payload)) {
    const source=payload as {generation:number;spaceName:string};
    payload={generation:source.generation,spaceName:source.spaceName,sources:[source]};
  }
  return (await db.query<{ value: Result }>("select public.google_meet_operation($1,$2,$3,$4,$5,$6::jsonb) value", [operation,tenant,actor,session,id,JSON.stringify(payload)])).rows[0].value;
}
async function denied(operation: string, payload: object={}, id: string|null=appointment, actor=doctor, session=doctorSession, code="42501") {
  await assert.rejects(rpc(operation,payload,id,actor,session), (e: unknown) => { assert.equal((e as {code:string}).code,code); return true; });
}
async function connect(subject="GoogleDoctor") {
  const stateHash = randomUUID().replaceAll("-", "").repeat(2);
  await rpc("oauth_start",{stateHash,verifier:"encrypted verifier"},null);
  await rpc("oauth_consume",{stateHash},null);
  await rpc("oauth_finish",{stateHash,refreshCiphertext:"encrypted refresh",accountEmail:"synthetic@example.test",googleSubject:subject},null);
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
    grant usage on schema auth to anon,authenticated; grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;`);
  const migrations = new URL("../../../supabase/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql") && !name.endsWith(" 2.sql")).sort()) await db.exec(readFileSync(new URL(name,migrations),"utf8"));
  await db.query("insert into auth.users(id) values($1),($2),($3)",[doctor,colleague,account]);
  await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4),($5,$6)",[doctorSession,doctor,colleagueSession,colleague,patientSession,account]);
  await db.query("insert into public.tenants(id,name) values($1,'Synthetic Meet clinic')",[tenant]);
  await db.query("insert into public.memberships(tenant_id,user_id,role,display_name) values($1,$2,'doctor','Synthetic Doctor'),($1,$3,'doctor','Synthetic Colleague'),($1,$4,'patient','Synthetic Patient')",[tenant,doctor,colleague,account]);
  await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic Patient',$3)",[patient,tenant,doctor]);
  await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$3)",[tenant,patient,doctor]);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:doctor,session_id:doctorSession,role:"authenticated"})]);
  await db.query("insert into public.appointments(id,tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,now()+interval '1 day',now()+interval '1 day 1 hour'),($5,$2,$3,$4,now()+interval '2 days',now()+interval '2 days 1 hour')",[appointment,tenant,patient,doctor,manual]);
  await db.query("insert into public.appointment_teleconsultations(tenant_id,appointment_id,delivery_mode,provider,join_url) values($1,$2,'video','google_meet','https://meet.google.com/abc-defg-hij')",[tenant,manual]);
});
after(() => db.close());
test("no browser role can access secrets, transcripts or server RPC", async () => {
  for (const role of ["anon","authenticated"]) {
    assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege($1,'public.google_meet_operation(text,uuid,uuid,uuid,uuid,jsonb)','EXECUTE') allowed",[role])).rows[0].allowed,false);
    for (const table of ["google_meet_connections","google_meet_transcripts","google_meet_transcript_reviews"]) assert.equal((await db.query<{allowed:boolean}>("select has_table_privilege($1,$2,'SELECT') allowed",[role,`public.${table}`])).rows[0].allowed,false);
  }
  await denied("connection",{},null,account,patientSession);
  await denied("list",{},appointment,colleague,colleagueSession);
});
test("OAuth state is user/session bound, expires, single use and invalidated by disconnect", async () => {
  const stateHash = "a".repeat(64);
  await rpc("oauth_start",{stateHash,verifier:"encrypted"},null);
  await denied("oauth_consume",{stateHash},null,colleague,colleagueSession);
  await rpc("oauth_consume",{stateHash},null);
  await denied("oauth_consume",{stateHash},null);
  await rpc("disconnect",{},null);
  await denied("oauth_finish",{stateHash,refreshCiphertext:"encrypted",googleSubject:"x",accountEmail:"x@example.test"},null);
  const expired="b".repeat(64);
  await rpc("oauth_start",{stateHash:expired,verifier:"encrypted"},null);
  await db.query("update public.google_meet_oauth_states set expires_at=now()-interval '1 second' where state_hash=$1",[expired]);
  await denied("oauth_consume",{stateHash:expired},null);
  const inFlight="e".repeat(64),latest="f".repeat(64);
  await rpc("oauth_start",{stateHash:inFlight,verifier:"encrypted"},null);
  await rpc("oauth_consume",{stateHash:inFlight},null);
  await rpc("oauth_start",{stateHash:latest,verifier:"encrypted"},null);
  await denied("oauth_finish",{stateHash:inFlight,refreshCiphertext:"encrypted",googleSubject:"x",accountEmail:"x@example.test"},null);
  await rpc("oauth_consume",{stateHash:latest},null);
});
test("room reservation is idempotent and creation never replaces a manual room", async () => {
  await connect();
  const generation=(await rpc("connection",{},null)).generation, attemptId=randomUUID();
  await denied("room_reserve",{attemptId,generation},manual,doctor,doctorSession,"23514");
  const first=await rpc("room_reserve",{attemptId,generation});
  assert.equal((await rpc("room_reserve",{attemptId:randomUUID(),generation})).attempt_id,attemptId);
  await denied("room_finish",{attemptId:randomUUID(),spaceName:"spaces/A",meetingUri:"https://meet.google.com/xyz-abcd-efg"},appointment,doctor,doctorSession,"40001");
  await rpc("room_finish",{attemptId,spaceName:"spaces/A",meetingUri:"https://meet.google.com/xyz-abcd-efg"});
  assert.equal((await rpc("room_reserve",{attemptId:randomUUID(),generation})).id,first.id);
  assert.equal((await db.query<{join_url:string}>("select join_url from public.appointment_teleconsultations where appointment_id=$1",[appointment])).rows[0].join_url,"https://meet.google.com/xyz-abcd-efg");
});
test("consent gates import, source is immutable/idempotent, and review is separate", async () => {
  await denied("sync_context",{},appointment,doctor,doctorSession,"23514");
  await rpc("consent",{patientPermissionConfirmed:true,permissionNote:"Paciente sintético autorizou a importação nesta consulta."});
  const bound=await rpc("sync_context"), source={ generation:bound.connection.generation,spaceName:bound.room.space_name,conferenceName:"conferenceRecords/C",transcriptName:"conferenceRecords/C/transcripts/T",entries:[{speaker:"conferenceRecords/C/participants/P",startTime:"2026-10-14T12:00:00Z",endTime:"2026-10-14T12:01:00Z",text:"Relato literal sintético"}],metadata:{origin:"google_meet_api_entries"},sourceHash:"c".repeat(64) };
  await rpc("import",source); await rpc("import",source);
  const imports=(await rpc("list")).imports;
  assert.equal(imports.length,1); assert.equal(imports[0].review,null);
  await denied("import",{...source,sourceHash:"d".repeat(64)},appointment,doctor,doctorSession,"23505");
  await denied("import",{generation:source.generation,spaceName:source.spaceName,sources:[{...source,transcriptName:"conferenceRecords/C/transcripts/NEW"},{...source,sourceHash:"d".repeat(64)}]},appointment,doctor,doctorSession,"23505");
  assert.equal((await db.query<{n:number}>("select count(*)::int n from public.google_meet_transcripts")).rows[0].n,1,"failed second source rolls back the complete batch");
  await rpc("review",{transcriptId:imports[0].id,decision:"reviewed",note:"Conferência documental sintética, sem publicação."});
  const reviewed=(await rpc("list")).imports[0];
  assert.deepEqual(reviewed.entries,imports[0].entries); assert.equal(reviewed.review?.decision,"reviewed");
  assert.equal((await db.query<{n:number}>("select count(*)::int n from public.google_meet_transcripts")).rows[0].n,1);
});
test("live revocation and appointment reassignment fail closed; reconnect same Google identity preserves retrieval", async () => {
  await rpc("disconnect",{},null); await connect();
  assert.ok((await rpc("sync_context")).room.id);
  await db.query("update public.appointments set doctor_id=$1,expected_version=version where id=$2",[colleague,appointment]);
  await denied("list");
  await db.query("update public.appointments set doctor_id=$1,expected_version=version where id=$2",[doctor,appointment]);
  await db.query("delete from auth.sessions where id=$1",[doctorSession]);
  await denied("list");
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)",[doctorSession,doctor]);
  await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and patient_id=$2",[tenant,patient]);
  await denied("list");
});
