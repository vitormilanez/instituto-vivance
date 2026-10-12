import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";

const db = new PGlite({ extensions: { btree_gist } });
const tenant=randomUUID(), patient=randomUUID(), doctor=randomUUID(), patientUser=randomUUID(), nurse=randomUUID(), outsider=randomUUID();
const sessions=new Map<string,string>([doctor,patientUser,nurse,outsider].map(user=>[user,randomUUID()]));
async function claims(user?: string) { await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(user ? {role:'authenticated',sub:user,session_id:sessions.get(user)} : {role:'service_role'})]); }
async function denied(sql: string,args: unknown[],code: string) {
  await assert.rejects(db.query(sql,args),(error: unknown)=>{assert.equal((error as {code:string}).code,code);return true;});
}
async function reserve(name='exam.pdf',category='exam',contentType='application/pdf',actor:string=patientUser) {
  await claims();
  const result=await db.query<{document_id:string;storage_path:string}>("select * from public.reserve_patient_document($1,$2,$3,$4,$6,1000,$5,'shared')",[tenant,patient,actor,name,category,contentType]);
  const d=result.rows[0];
  await db.query("insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",[d.storage_path]);
  return d.document_id;
}
async function complete(document: string,hash: string,actor:string=patientUser) {
  await claims();
  return (await db.query<{result:{id?:string;canonicalId?:string;duplicate?:boolean;quota_full?:boolean}}>("select public.complete_verified_patient_document($1,$2,$3,$4) result",[tenant,document,actor,hash])).rows[0].result;
}
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
    grant usage on schema auth to anon,authenticated;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;`);
  const migrations=new URL('../../../supabase/migrations/',import.meta.url);
  for(const name of readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(name,migrations),'utf8'));
  for(const user of sessions.keys()) {
    await db.query("insert into auth.users(id) values($1)",[user]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)",[sessions.get(user),user]);
  }
  await db.query("insert into public.tenants(id,name) values($1,'Synthetic clinic')",[tenant]);
  for(const [user,role] of [[doctor,'doctor'],[patientUser,'patient'],[nurse,'nurse'],[outsider,'doctor']]) await db.query("insert into public.memberships(tenant_id,user_id,role,status) values($1,$2,$3,'active')",[tenant,user,role]);
  await db.query("insert into public.patients(id,tenant_id,display_name,created_by) values($1,$2,'Synthetic patient',$3)",[patient,tenant,doctor]);
  await db.query("insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",[tenant,patient,patientUser]);
  for(const user of [doctor,nurse]) await db.query("insert into public.care_relationships(tenant_id,patient_id,professional_id,status,created_by) values($1,$2,$3,'active',$4)",[tenant,patient,user,doctor]);
});
after(()=>db.close());

test('15 distinct receipts, capacity preflight, duplicate aliases and simultaneous conclusions',async()=>{
  const docs:string[]=[];
  for(let i=0;i<14;i++){const d=i===0 ? await reserve('exam.png','exam','image/png',doctor) : await reserve();await complete(d,i.toString(16).padStart(64,'0'),i===0 ? doctor : patientUser);docs.push(d);}
  const a=await reserve('same.pdf','clinical_document'),b=await reserve('other.pdf');
  const results=await Promise.all([complete(a,'a'.repeat(64)),complete(b,'b'.repeat(64))]);
  assert.equal(results.filter(r=>r.id).length,1); assert.equal(results.filter(r=>r.quota_full).length,1);
  const duplicate=await reserve('renamed.pdf');
  assert.deepEqual(await complete(duplicate,'0'.repeat(64)),{id:duplicate,canonicalId:docs[0],duplicate:true});
  assert.deepEqual(await complete(duplicate,'0'.repeat(64)),{id:duplicate,canonicalId:docs[0],duplicate:true});
  const receipt=(await db.query<{uploaded_by:string;status:string;duplicate_of:string}>('select uploaded_by,status,duplicate_of from public.patient_documents where id=$1',[duplicate])).rows[0];
  assert.deepEqual(receipt,{uploaded_by:patientUser,status:'available',duplicate_of:docs[0]});
  assert.equal((await db.query<{uploaded_by:string}>('select uploaded_by from public.patient_documents where id=$1',[docs[0]])).rows[0].uploaded_by,doctor);
  await claims(patientUser);
  const quota=(await db.query<{q:{received:number;remaining:number;reserved:number}}>('select public.get_exam_upload_quota($1,$2) q',[tenant,patient])).rows[0].q;
  assert.equal(quota.received,15); assert.equal(quota.remaining,0); assert.equal(quota.reserved,0);
  await denied("select public.record_patient_meal($1,$2,'lunch',clock_timestamp(),null,$3)",[tenant,randomUUID(),duplicate],'23514');
  await claims();
  const photo=(await db.query<{document_id:string;storage_path:string}>("select * from public.reserve_context_photo($1,$2,$3,'meal.png','image/png',1000,'shared','meal_log')",[tenant,patient,patientUser])).rows[0];
  await db.query("insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",[photo.storage_path]);
  assert.equal((await complete(photo.document_id,'e'.repeat(64))).id,photo.document_id);
  await claims(patientUser);
  await db.query("select public.record_patient_meal($1,$2,'lunch',clock_timestamp(),null,$3)",[tenant,randomUUID(),photo.document_id]);
  assert.equal((await db.query<{q:{received:number}}>('select public.get_exam_upload_quota($1,$2) q',[tenant,patient])).rows[0].q.received,15);
  await claims();
  assert.equal((await db.query<{n:number}>('select count(*) n from public.processing_jobs')).rows[0].n,0);
  const r1=await reserve(),r2=await reserve();
  await denied("select * from public.reserve_patient_document($1,$2,$3,'x.pdf','application/pdf',1000,'exam','shared')",[tenant,patient,patientUser],'P0015');
  await db.query("update public.patient_documents set reservation_expires_at=clock_timestamp()-interval '1 minute' where id=any($1::uuid[])",[[r1,r2]]);
  await reserve();
});

test('patient request and doctor grant are idempotent; live scope rejects other roles and revocation',async()=>{
  await claims(patientUser);
  const request='select public.request_exam_upload_capacity($1,$2) id';
  const reqs=await Promise.all([db.query<{id:string}>(request,[tenant,patient]),db.query<{id:string}>(request,[tenant,patient])]);
  assert.equal(reqs[0].rows[0].id,reqs[1].rows[0].id);
  const cycle=(await db.query<{q:{cycle_id:string}}>('select public.get_exam_upload_quota($1,$2) q',[tenant,patient])).rows[0].q.cycle_id;
  const grant="select public.grant_exam_upload_cycle($1,$2,$3,'Need additional synthetic records',$4) id";
  for(const user of [patientUser,nurse,outsider]) {await claims(user);await denied(grant,[tenant,patient,cycle,randomUUID()],'42501');}
  await claims(doctor);
  const key=randomUUID();
  const grants=await Promise.all([db.query<{id:string}>(grant,[tenant,patient,cycle,key]),db.query<{id:string}>(grant,[tenant,patient,cycle,key])]);
  assert.equal(grants[0].rows[0].id,grants[1].rows[0].id);
  await denied(grant,[tenant,patient,cycle,randomUUID()],'23514');
  const quota=(await db.query<{q:{received:number;remaining:number;request_pending:boolean}}>('select public.get_exam_upload_quota($1,$2) q',[tenant,patient])).rows[0].q;
  assert.equal(quota.remaining,15);assert.equal(quota.request_pending,false);
  await db.query("delete from auth.sessions where id=$1",[sessions.get(doctor)]);
  await denied('select public.get_exam_upload_quota($1,$2)',[tenant,patient],'42501');
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)",[sessions.get(doctor),doctor]);
});

test('explicit synthetic medical authorization queues once; category changes never bypass quota; revoked care blocks eligibility',async()=>{
  const d=await reserve(); await complete(d,'c'.repeat(64));
  await claims(doctor);
  await denied('select public.authorize_exam_documents($1,$2,$3::uuid[])',[tenant,patient,[d]],'42501');
  await claims();await db.query('select public.register_exam_ai_test_patient($1,$2)',[tenant,patient]);
  await claims(doctor);
  const authorize='select public.authorize_exam_documents($1,$2,$3::uuid[]) result';
  const result=await db.query<{result:{job_id:string}[]}>(authorize,[tenant,patient,[d]]);
  assert.ok(result.rows[0].result[0].job_id);
  assert.deepEqual((await db.query(authorize,[tenant,patient,[d]])).rows,result.rows);
  const fresh=await reserve();await complete(fresh,'d'.repeat(64));
  assert.equal((await db.query<{n:number}>('select count(*) n from public.processing_jobs')).rows[0].n,2);
  await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and professional_id=$2",[tenant,doctor]);
  assert.equal((await db.query<{eligible:boolean}>('select private.exam_ai_document_eligible($1,$2,$3) eligible',[tenant,fresh,patient])).rows[0].eligible,false);
});
