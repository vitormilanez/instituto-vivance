// Synthetic fixtures exist ONLY in an ephemeral, in-process PostgreSQL engine.
// This suite never connects to the Supabase project or creates real Auth accounts.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const db = new PGlite({ extensions: { btree_gist } });
const a = randomUUID(),
  b = randomUUID();
const users = Object.fromEntries(
  ["admin", "doctor", "nurse", "patient", "other", "suspended", "outsider"].map(
    (role) => [role, { id: randomUUID(), session: randomUUID() }],
  ),
);
const pa = randomUUID(),
  pb = randomUUID();

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users, not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table storage.buckets(
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects(
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null,
      name text not null,
      created_at timestamptz not null default now(),
      unique(bucket_id,name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
  `);
  const migrations = new URL("../../../supabase/migrations/", import.meta.url);
  for (const name of readdirSync(migrations)
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(name, migrations), "utf8"));
  for (const u of Object.values(users)) {
    await db.query("insert into auth.users(id) values ($1)", [u.id]);
    await db.query("insert into auth.sessions(id,user_id) values ($1,$2)", [
      u.session,
      u.id,
    ]);
  }
  await db.query(
    "insert into public.tenants(id,name) values ($1,'Test clinic A'),($2,'Test clinic B')",
    [a, b],
  );
  for (const [name, u] of Object.entries(users)) {
    if (name === "outsider") continue;
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,$3,$4,$5)",
      [
        name === "other" ? b : a,
        u.id,
        ["other", "suspended"].includes(name) ? "doctor" : name,
        name === "suspended" ? "suspended" : "active",
        `Synthetic ${name}`,
      ],
    );
  }
  await db.query(
    "insert into public.patients(id,tenant_id,display_name,created_by) values ($1,$2,'Synthetic A',$3),($4,$5,'Synthetic B',$6)",
    [pa, a, users.admin.id, pb, b, users.other.id],
  );
});
test("care plans preserve approved revision and reject stale writes and skipped review", async () => {
  await asUser("doctor", async () => {
    const source = await startClinical();
    const result = await db.query<{ id: string }>(
      "insert into public.care_plans(tenant_id,patient_id,encounter_id) values($1,$2,$3) returning id",
      [a, pa, source.id],
    );
    const id = result.rows[0].id;
    await denied(
      "update public.care_plans set status='approved',expected_version=1 where id=$1",
      [id],
    );
    await db.query(
      "update public.care_plans set title='Synthetic plan',goals='Synthetic goals',actions='Synthetic actions',frequency='Medical frequency',period='Medical period',review_on='2099-10-01',status='in_review',expected_version=1 where id=$1",
      [id],
    );
    await denied(
      "update public.care_plans set status='approved',expected_version=1 where id=$1",
      [id],
    );
    await denied(
      "update public.care_plans set actions='Unreviewed change',status='approved',expected_version=2 where id=$1",
      [id],
    );
    await db.query(
      "update public.care_plans set status='approved',expected_version=2 where id=$1",
      [id],
    );
    await denied(
      "update public.care_plans set actions='Alter approved',expected_version=3 where id=$1",
      [id],
    );
    await denied(
      "update public.care_plan_versions set actions='Alter history' where plan_id=$1",
      [id],
    );
    await db.query(
      "update public.care_plans set status='draft',expected_version=3 where id=$1",
      [id],
    );
    await db.query(
      "update public.care_plans set actions='New private revision',expected_version=4 where id=$1",
      [id],
    );
    const approved = await db.query<{
      actions: string;
      revision: number;
      approved_at: unknown;
    }>(
      "select actions,revision,approved_at from public.care_plan_versions where plan_id=$1 and status='approved'",
      [id],
    );
    assert.equal(approved.rows[0].actions, "Synthetic actions");
    assert.equal(approved.rows[0].revision, 1);
    assert.ok(approved.rows[0].approved_at);
    const current = await db.query<{
      version: number;
      revision: number;
      status: string;
    }>("select version,revision,status from public.care_plans where id=$1", [
      id,
    ]);
    assert.deepEqual(current.rows[0], {
      version: 5,
      revision: 2,
      status: "draft",
    });
    await db.exec("reset role");
    const audit = await db.query<{ n: number }>(
      "select count(*)::int n from public.audit_events where entity_id=$1 and actor_user_id=$2",
      [id, users.doctor.id],
    );
    assert.equal(audit.rows[0].n, 5);
  });
});
test("care plans deny other tenants, operational admin, patient, unlinked professional and revoked session", async () => {
  await asUser("doctor", async () => {
    await startClinical();
    const result = await db.query<{ id: string }>(
      "insert into public.care_plans(tenant_id,patient_id) values($1,$2) returning id",
      [a, pa],
    );
    const id = result.rows[0].id;
    await denied(
      "insert into public.care_plans(tenant_id,patient_id) values($1,$2)",
      [a, pb],
    );
    for (const role of [
      "admin",
      "patient",
      "nurse",
      "other",
      "outsider",
      "suspended",
    ]) {
      await switchActor(role);
      assert.equal(
        (await db.query("select id from public.care_plans where id=$1", [id]))
          .rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select id from public.care_plan_versions where plan_id=$1",
            [id],
          )
        ).rows.length,
        0,
      );
      await denied(
        "insert into public.care_plans(tenant_id,patient_id) values($1,$2)",
        [a, pa],
      );
    }
    await switchActor("doctor");
    await db.exec("reset role");
    await db.query("delete from auth.sessions where id=$1", [
      users.doctor.session,
    ]);
    await switchActor("doctor");
    assert.equal(
      (await db.query("select id from public.care_plans where id=$1", [id]))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.care_plans set title='Denied',expected_version=1 where id=$1 returning id",
          [id],
        )
      ).rows.length,
      0,
    );
  });
});
test("care plan linked nurse can read but not approve; revoked care immediately removes history", async () => {
  await asUser("doctor", async () => {
    await startClinical();
    const result = await db.query<{ id: string }>(
      "insert into public.care_plans(tenant_id,patient_id) values($1,$2) returning id",
      [a, pa],
    );
    const id = result.rows[0].id;
    await switchActor("admin");
    const link = await db.query<{ id: string }>(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'assigned') returning id",
      [a, pa, users.nurse.id],
    );
    await switchActor("nurse");
    await db.query(
      "update public.care_relationships set status='active',expected_version=1 where id=$1",
      [link.rows[0].id],
    );
    assert.equal(
      (await db.query("select id from public.care_plans where id=$1", [id]))
        .rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.care_plans set status='approved',expected_version=1 where id=$1 returning id",
          [id],
        )
      ).rows.length,
      0,
    );
    await switchActor("admin");
    await db.query(
      "update public.care_relationships set status='revoked',expected_version=2 where id=$1",
      [link.rows[0].id],
    );
    await switchActor("nurse");
    assert.equal(
      (
        await db.query(
          "select id from public.care_plan_versions where plan_id=$1",
          [id],
        )
      ).rows.length,
      0,
    );
  });
});
after(async () => {
  await db.close();
});

async function publicationFixture() {
  await startClinical();
  const result=await db.query<{id:string}>("insert into public.care_plans(tenant_id,patient_id) values($1,$2) returning id",[a,pa]);
  const id=result.rows[0].id;
  await db.exec("reset role");
  await db.query("insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",[a,pa,users.patient.id]);
  await switchActor("doctor");
  return id;
}
async function approveFixture(id:string,version:number,actions="Published synthetic guidance") {
  await db.query("update public.care_plans set title='Synthetic publication',goals='Synthetic goal',actions=$3,frequency='Test frequency',period='Test period',review_on='2099-10-01',status='in_review',expected_version=$2 where id=$1",[id,version,actions]);
  await db.query("update public.care_plans set status='approved',expected_version=$2 where id=$1",[id,version+1]);
  return version+2;
}
async function publishFixture(id:string,version:number,previous:string|null=null) {
  return (await db.query<{id:string}>("select public.publish_care_plan($1,$2,$3,$4,true) id",[a,id,version,previous])).rows[0].id;
}
test("publication is explicit; patient sees only current approved snapshot, never private history",async()=>{
  await asUser("doctor",async()=>{
    const id=await publicationFixture();
    await denied("select public.publish_care_plan($1,$2,1,null,true)",[a,id]);
    const version=await approveFixture(id,1);
    await switchActor("patient");
    assert.equal((await db.query("select id from public.care_plan_publications")).rows.length,0);
    await switchActor("doctor");await denied("select public.publish_care_plan($1,$2,$3,null,false)",[a,id,version]);
    const pub=await publishFixture(id,version);
    await denied("select public.publish_care_plan($1,$2,$3,null,true)",[a,id,version]);
    await denied("update public.care_plan_publications set actions='forged' where id=$1",[pub]);
    await switchActor("patient");
    assert.equal((await db.query<{actions:string}>("select actions from public.care_plan_publications")).rows[0].actions,"Published synthetic guidance");
    assert.equal((await db.query("select id from public.care_plans")).rows.length,0);
    assert.equal((await db.query("select id from public.care_plan_versions")).rows.length,0);
    const receipt=await db.query<{id:string}>("select public.acknowledge_care_plan($1,$2,true) id",[a,pub]);
    assert.equal((await db.query<{id:string}>("select public.acknowledge_care_plan($1,$2,true) id",[a,pub])).rows[0].id,receipt.rows[0].id);
    await denied("update public.care_plan_receipts set acknowledged_at=now()",[]);
    await db.exec("reset role");
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.audit_events where entity_type='care_plan_receipts' and entity_id=$1",[receipt.rows[0].id])).rows[0].n,1);
  });
});
test("publication replacement preserves current guidance during drafting, rejects stale targets and withdraws atomically",async()=>{
  await asUser("doctor",async()=>{
    const id=await publicationFixture(),v=await approveFixture(id,1),first=await publishFixture(id,v);
    await db.query("update public.care_plans set status='draft',expected_version=$2 where id=$1",[id,v]);
    await switchActor("patient");assert.equal((await db.query<{id:string}>("select id from public.care_plan_publications")).rows[0].id,first);
    await switchActor("doctor");const next=await approveFixture(id,v+1,"New approved synthetic guidance");
    await denied("select public.publish_care_plan($1,$2,$3,null,true)",[a,id,next]);
    const second=await publishFixture(id,next,first);
    await switchActor("patient");const visible=await db.query<{id:string;actions:string}>("select id,actions from public.care_plan_publications");
    assert.deepEqual(visible.rows,[{id:second,actions:"New approved synthetic guidance"}]);
    await denied("select public.acknowledge_care_plan($1,$2,true)",[a,first]);
    await switchActor("doctor");await denied("select public.withdraw_care_plan($1,$2,$3,'stale',true)",[a,id,first]);
    await db.query("select public.withdraw_care_plan($1,$2,$3,'Synthetic withdrawal reason',true)",[a,id,second]);
    assert.equal((await db.query("select id from public.care_plan_publications where plan_id=$1",[id])).rows.length,2);
    await switchActor("patient");assert.equal((await db.query("select id from public.care_plan_publications")).rows.length,0);
    await denied("select public.acknowledge_care_plan($1,$2,true)",[a,second]);
  });
});
test("publication denies operational admin, nursing writes, other clinic and revoked care/session",async()=>{
  await asUser("doctor",async()=>{
    const id=await publicationFixture(),version=await approveFixture(id,1),pub=await publishFixture(id,version);
    for(const role of ["admin","nurse","other","outsider","suspended","patient"]){
      await switchActor(role);
      await denied("select public.publish_care_plan($1,$2,$3,$4,true)",[a,id,version,pub]);
      await denied("select public.withdraw_care_plan($1,$2,$3,'Denied',true)",[a,id,pub]);
      if(role!=="patient")assert.equal((await db.query("select id from public.care_plan_publications where id=$1",[pub])).rows.length,0);
    }
    await switchActor("admin");await db.query("update public.care_relationships set status='revoked',expected_version=1 where tenant_id=$1 and patient_id=$2 and professional_id=$3",[a,pa,users.doctor.id]);
    await switchActor("doctor");assert.equal((await db.query("select id from public.care_plan_publications")).rows.length,0);
    await denied("select public.withdraw_care_plan($1,$2,$3,'Denied',true)",[a,id,pub]);
    await db.exec("reset role");await db.query("delete from auth.sessions where id=$1",[users.patient.session]);await switchActor("patient");
    assert.equal((await db.query("select id from public.care_plan_publications")).rows.length,0);
    await denied("select public.acknowledge_care_plan($1,$2,true)",[a,pub]);
  });
});
test("publication rolls back replacement if the audit event fails",async()=>{
  await asUser("doctor",async()=>{
    const id=await publicationFixture(),version=await approveFixture(id,1),first=await publishFixture(id,version);
    await db.query("update public.care_plans set status='draft',expected_version=$2 where id=$1",[id,version]);
    const next=await approveFixture(id,version+1);
    await db.exec("reset role");
    await db.exec("create function private.synthetic_publication_audit_failure() returns trigger language plpgsql as $$ begin if new.entity_type='care_plan_publications' then raise exception 'Synthetic audit failure'; end if; return new; end; $$; create trigger synthetic_publication_audit_failure before insert on public.audit_events for each row execute function private.synthetic_publication_audit_failure();");
    await switchActor("doctor");await denied("select public.publish_care_plan($1,$2,$3,$4,true)",[a,id,next,first]);
    assert.deepEqual((await db.query("select id,status from public.care_plan_publications where plan_id=$1",[id])).rows,[{id:first,status:"published"}]);
  });
});

async function book(
  patient = pa,
  doctor = users.doctor.id,
  tenant = a,
  start = "2099-09-10T12:00:00Z",
  end = "2099-09-10T12:30:00Z",
) {
  const result = await db.query<{ id: string; version: number }>(
    "insert into public.appointments(tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,$5) returning id,version",
    [tenant, patient, doctor, start, end],
  );
  return result.rows[0];
}
test("agenda allows staff scheduling, with atomic audit and server-owned version", async () => {
  for (const role of ["admin", "doctor", "nurse"])
    await asUser(role, async () => {
      const created = await book();
      assert.equal(created.version, 1);
      const row = (
        await db.query<{ created_by: string }>(
          "select created_by from public.appointments where id=$1",
          [created.id],
        )
      ).rows[0];
      assert.equal(row.created_by, users[role].id);
      if (role === "admin")
        assert.equal(
          (
            await db.query(
              "select id from public.audit_events where entity_type='appointments' and entity_id=$1",
              [created.id],
            )
          ).rows.length,
          1,
        );
    });
});
test("agenda prevents overlapping bookings and allows adjacent slots", async () => {
  await asUser("admin", async () => {
    await book();
    await book(
      pa,
      users.doctor.id,
      a,
      "2099-09-10T12:30:00Z",
      "2099-09-10T13:00:00Z",
    );
    await assert.rejects(
      book(
        pa,
        users.doctor.id,
        a,
        "2099-09-10T12:15:00Z",
        "2099-09-10T12:45:00Z",
      ),
      /exclusion constraint/,
    );
  });
});
test("agenda blocks cross-clinic patients, wrong-role and suspended doctors", async () => {
  for (const [patient, doctor] of [
    [pb, users.doctor.id],
    [pa, users.patient.id],
    [pa, users.suspended.id],
    [pa, users.other.id],
  ])
    await asUser("admin", async () => {
      await assert.rejects(
        book(patient, doctor),
        /foreign key|Active doctor required|Registered doctor name required/,
      );
    });
});
test("agenda rejects anonymous, patient, outsider, suspended and cross-tenant writes", async () => {
  for (const role of ["patient", "outsider", "suspended", "other"])
    await asUser(role, async () => {
      await assert.rejects(
        book(),
        /row-level security|Active doctor required|Registered doctor name required/,
      );
    });
  await db.exec("begin; set local role anon");
  try {
    await assert.rejects(
      db.query("select * from public.appointments"),
      /permission denied/,
    );
  } finally {
    await db.exec("rollback");
  }
});
test("agenda rejects past bookings and invalid durations in direct database writes", async () => {
  for (const [start, end] of [
    ["2020-01-01T12:00Z", "2020-01-01T12:30Z"],
    ["2099-01-01T12:00Z", "2099-01-01T12:01Z"],
    ["2099-01-01T12:00Z", "2099-01-01T21:00Z"],
  ])
    await asUser("admin", async () => {
      await assert.rejects(
        book(pa, users.doctor.id, a, start, end),
        /future|check constraint/,
      );
    });
});
test("agenda optimistic edits reject stale version and cancellation preserves record", async () => {
  await asUser("admin", async () => {
    const created = await book();
    const updated = await db.query<{ version: number }>(
      "update public.appointments set expected_version=1,starts_at='2099-09-10T14:00Z', ends_at='2099-09-10T14:30Z' where id=$1 and version=1 returning version",
      [created.id],
    );
    assert.equal(updated.rows[0].version, 2);
    assert.equal(
      (
        await db.query(
          "update public.appointments set kind='return' where id=$1 and version=1 returning id",
          [created.id],
        )
      ).rows.length,
      0,
    );
    await db.query("select public.transition_appointment($1,$2,2,'cancelled')", [
      a,
      created.id,
    ]);
    assert.equal(
      (
        await db.query(
          "select id from public.appointments where id=$1 and status='cancelled'",
          [created.id],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select id from public.audit_events where entity_id=$1",
          [created.id],
        )
      ).rows.length,
      3,
    );
    await book(
      pa,
      users.doctor.id,
      a,
      "2099-09-10T14:00Z",
      "2099-09-10T14:30Z",
    );
    await assert.rejects(
      db.query("select public.transition_appointment($1,$2,3,'cancelled')", [
        a,
        created.id,
      ]),
      /Only scheduled appointments/,
    );
  });
});
test("agenda identity, actor, version and deletion cannot be forged", async () => {
  for (const mutation of [
    "delete from public.appointments",
    "update public.appointments set tenant_id=gen_random_uuid()",
    "update public.appointments set created_by=gen_random_uuid()",
    "update public.appointments set version=999",
  ])
    await asUser("admin", async () => {
      await book();
      await assert.rejects(db.query(mutation), /permission denied/);
    });
});
test("patient sees only linked appointments, doctor name, and cannot edit", async () => {
  await db.exec("begin");
  try {
    await db.query(
      "insert into public.patient_accounts(tenant_id,user_id,patient_id) values($1,$2,$3)",
      [a, users.patient.id, pa],
    );
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.admin.id, session_id: users.admin.session }),
    ]);
    const own = await book();
    await db.query("select public.transition_appointment($1,$2,1,'cancelled')", [
      a,
      own.id,
    ]);
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.other.id, session_id: users.other.session }),
    ]);
    await book(pb, users.other.id, b);
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({
        sub: users.patient.id,
        session_id: users.patient.session,
      }),
    ]);
    assert.deepEqual(
      (
        await db.query<{ id: string }>("select id from public.appointments")
      ).rows.map((r) => r.id),
      [own.id],
    );
    assert.equal(
      (
        await db.query(
          "select user_id from public.memberships where user_id=$1",
          [users.doctor.id],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ doctor_display_name: string }>(
          "select doctor_display_name from public.appointments where id=$1",
          [own.id],
        )
      ).rows[0].doctor_display_name,
      "Synthetic doctor",
    );
    assert.equal(
      (await db.query("select id from public.appointment_status_events")).rows
        .length,
      0,
    );
    await denied(
      "select public.transition_appointment($1,$2,1,'cancelled')",
      [a, own.id],
    );
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.patient.id, session_id: randomUUID() }),
    ]);
    assert.equal(
      (await db.query("select * from public.appointments")).rows.length,
      0,
    );
  } finally {
    await db.exec("rollback");
  }
});
test("doctor cannot read or change colleague appointments; patient overlap is blocked across doctors", async () => {
  await db.exec("begin");
  try {
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role,display_name) values($1,$2,'doctor','Synthetic colleague')",
      [a, users.other.id],
    );
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.admin.id, session_id: users.admin.session }),
    ]);
    const colleague = await book(pa, users.other.id);
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({
        sub: users.doctor.id,
        session_id: users.doctor.session,
      }),
    ]);
    assert.equal(
      (await db.query("select * from public.appointments")).rows.length,
      0,
    );
    await denied(
      "select public.transition_appointment($1,$2,1,'cancelled')",
      [a, colleague.id],
    );
    await denied(
      "insert into public.appointments(tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,$5)",
      [
        a,
        pa,
        users.doctor.id,
        "2099-09-10T12:00:00Z",
        "2099-09-10T12:30:00Z",
      ],
    );
  } finally {
    await db.exec("rollback");
  }
});
test("appointment audit failure rolls back the booking", async () => {
  await db.exec("begin");
  try {
    await db.exec(
      "alter table public.audit_events add constraint test_reject_appointment check (entity_type <> 'appointments') not valid; set local role authenticated",
    );
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.admin.id, session_id: users.admin.session }),
    ]);
    await assert.rejects(book(), /test_reject_appointment/);
  } finally {
    await db.exec("rollback");
  }
  assert.equal(
    (await db.query("select * from public.appointments")).rows.length,
    0,
  );
});

test("doctor names are required for new bookings and existing snapshots never change", async () => {
  await db.exec("begin");
  try {
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.admin.id, session_id: users.admin.session }),
    ]);
    const original = await book();
    await db.exec("reset role");
    await db.query(
      "update public.memberships set display_name='Synthetic renamed doctor' where tenant_id=$1 and user_id=$2",
      [a, users.doctor.id],
    );
    await db.exec("set local role authenticated");
    const renamed = await book(
      pa,
      users.doctor.id,
      a,
      "2099-09-10T15:00:00Z",
      "2099-09-10T15:30:00Z",
    );
    const snapshots = await db.query<{ id: string; doctor_display_name: string }>(
      "select id,doctor_display_name from public.appointments where id in ($1,$2) order by id",
      [original.id, renamed.id],
    );
    assert.deepEqual(
      Object.fromEntries(
        snapshots.rows.map((row) => [row.id, row.doctor_display_name]),
      ),
      {
        [original.id]: "Synthetic doctor",
        [renamed.id]: "Synthetic renamed doctor",
      },
    );
    await db.exec("reset role");
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'doctor','active','Synthetic reassigned doctor')",
      [a, users.other.id],
    );
    await db.exec("set local role authenticated");
    const reassigned = await db.query<{ doctor_display_name: string }>(
      "update public.appointments set doctor_id=$1,expected_version=1 where id=$2 returning doctor_display_name",
      [users.other.id, original.id],
    );
    assert.equal(
      reassigned.rows[0].doctor_display_name,
      "Synthetic reassigned doctor",
    );
    await db.exec("reset role");
    await db.query(
      "update public.memberships set display_name=null where tenant_id=$1 and user_id=$2",
      [a, users.doctor.id],
    );
    await db.exec("set local role authenticated");
    await db.exec("savepoint invalid_doctor_name");
    await assert.rejects(
      book(
        pa,
        users.doctor.id,
        a,
        "2099-09-10T16:00:00Z",
        "2099-09-10T16:30:00Z",
      ),
      /Registered doctor name required/,
    );
    await db.exec("rollback to savepoint invalid_doctor_name");
    await db.exec("reset role");
    await db.query(
      "update public.memberships set display_name='doctor@example.test' where tenant_id=$1 and user_id=$2",
      [a, users.doctor.id],
    );
    await db.exec("set local role authenticated");
    await assert.rejects(
      book(
        pa,
        users.doctor.id,
        a,
        "2099-09-10T17:00:00Z",
        "2099-09-10T17:30:00Z",
      ),
      /Registered doctor name required/,
    );
  } finally {
    await db.exec("rollback");
  }
});

async function asUser(
  name: string,
  callback: () => Promise<void>,
  overrides: Record<string, unknown> = {},
) {
  await db.exec("begin; set local role authenticated;");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({
        sub: users[name].id,
        session_id: users[name].session,
        ...overrides,
      }),
    ]);
    await callback();
  } finally {
    await db.exec("rollback");
  }
}

async function switchActor(name: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: users[name].id, session_id: users[name].session }),
  ]);
}
async function denied(query: string, values: unknown[] = []) {
  await db.exec("savepoint denial");
  try {
    await assert.rejects(db.query(query, values));
  } finally {
    await db.exec("rollback to savepoint denial; release savepoint denial");
  }
}
async function startClinical(
  start = "2099-09-10T12:00:00Z",
  end = "2099-09-10T12:30:00Z",
) {
  const appointment = await book(pa, users.doctor.id, a, start, end);
  const values = [a, appointment.id];
  const result = await db.query<{ id: string }>(
    "select public.start_encounter($1,$2,true,1) as id",
    values,
  );
  return { id: result.rows[0].id, appointment: appointment.id };
}
async function saveClinical(
  id: string,
  version: number,
  reason: string,
  evolution: string,
  status: "draft" | "finalized" = "draft",
) {
  return db.query<{ version: number }>(
    "update public.encounters set expected_version=$3,reason=$4,evolution=$5,status=$6 where tenant_id=$1 and id=$2 returning version",
    [a, id, version, reason, evolution, status],
  );
}
async function appendAddendum(
  id: string,
  version: number,
  reason: string,
  content: string,
) {
  return db.query<{ id: string }>(
    "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,$3,$4,$5) returning id",
    [a, id, version, reason, content],
  );
}
test("clinical start is explicit, idempotent and creates an active care link atomically", async () => {
  await asUser("doctor", async () => {
    const appointment = await book();
    assert.equal(
      (await db.query("select * from public.care_relationships")).rows.length,
      0,
    );
    await denied("select public.start_encounter($1,$2,false,1)", [
      a,
      appointment.id,
    ]);
    const first = await db.query<{ id: string }>(
      "select public.start_encounter($1,$2,true,1) id",
      [a, appointment.id],
    );
    const second = await db.query<{ id: string }>(
      "select public.start_encounter($1,$2,true,1) id",
      [a, appointment.id],
    );
    assert.equal(first.rows[0].id, second.rows[0].id);
    assert.equal(
      (await db.query("select * from public.care_relationships")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.encounter_versions")).rows.length,
      1,
    );
  });
});

test("a stale agenda screen cannot start a rescheduled appointment", async () => {
  await asUser("doctor", async () => {
    const appointment = await book();
    await db.query(
      "update public.appointments set expected_version=1,starts_at='2099-09-10T13:00:00Z',ends_at='2099-09-10T13:30:00Z' where id=$1",
      [appointment.id],
    );
    await denied("select public.start_encounter($1,$2,true,1)", [
      a,
      appointment.id,
    ]);
    assert.equal((await db.query("select id from public.encounters")).rows.length, 0);
    const state = (
      await db.query<{ status: string; version: number }>(
        "select status,version from public.appointments where id=$1",
        [appointment.id],
      )
    ).rows[0];
    assert.deepEqual(state, { status: "scheduled", version: 2 });
    await db.query("select public.start_encounter($1,$2,true,2)", [
      a,
      appointment.id,
    ]);
    assert.equal((await db.query("select id from public.encounters")).rows.length, 1);
  });
});

test("agenda and encounter advance atomically from scheduled to in progress and completed", async () => {
  await asUser("doctor", async () => {
    const appointment = await book();
    const first = await db.query<{ id: string }>(
      "select public.start_encounter($1,$2,true,1) id",
      [a, appointment.id],
    );
    const started = (
      await db.query<{
        status: string;
        version: number;
        has_started_at: boolean;
      }>(
        "select status,version,started_at is not null has_started_at from public.appointments where id=$1",
        [appointment.id],
      )
    ).rows[0];
    assert.deepEqual(started, {
      status: "in_progress",
      version: 2,
      has_started_at: true,
    });
    await denied(
      "insert into public.appointments(tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,$5)",
      [
        a,
        pa,
        users.doctor.id,
        "2099-09-10T12:00:00Z",
        "2099-09-10T12:30:00Z",
      ],
    );

    const repeated = await db.query<{ id: string }>(
      "select public.start_encounter($1,$2,true,1) id",
      [a, appointment.id],
    );
    assert.equal(repeated.rows[0].id, first.rows[0].id);
    assert.equal(
      (
        await db.query(
          "select id from public.appointment_status_events where appointment_id=$1",
          [appointment.id],
        )
      ).rows.length,
      1,
    );

    await saveClinical(
      first.rows[0].id,
      1,
      "Synthetic completion",
      "Synthetic record",
      "finalized",
    );
    const completed = (
      await db.query<{
        status: string;
        version: number;
        has_completed_at: boolean;
      }>(
        "select status,version,completed_at is not null has_completed_at from public.appointments where id=$1",
        [appointment.id],
      )
    ).rows[0];
    assert.deepEqual(completed, {
      status: "completed",
      version: 3,
      has_completed_at: true,
    });
    const events = await db.query<{
      from_status: string;
      to_status: string;
      actor_user_id: string;
    }>(
      "select from_status,to_status,actor_user_id from public.appointment_status_events where appointment_id=$1 order by created_at,id",
      [appointment.id],
    );
    assert.deepEqual(events.rows, [
      {
        from_status: "scheduled",
        to_status: "in_progress",
        actor_user_id: users.doctor.id,
      },
      {
        from_status: "in_progress",
        to_status: "completed",
        actor_user_id: users.doctor.id,
      },
    ]);
    await denied(
      "select public.transition_appointment($1,$2,3,'no_show')",
      [a, appointment.id],
    );
    await denied(
      "insert into public.appointments(tenant_id,patient_id,doctor_id,starts_at,ends_at) values($1,$2,$3,$4,$5)",
      [
        a,
        pa,
        users.doctor.id,
        "2099-09-10T12:00:00Z",
        "2099-09-10T12:30:00Z",
      ],
    );
  });
});

test("cancelled and no-show transitions are versioned, audited, terminal and release the slot", async () => {
  await asUser("admin", async () => {
    const missed = await book();
    await denied(
      "select public.transition_appointment($1,$2,2,'no_show')",
      [a, missed.id],
    );
    await denied(
      "select public.transition_appointment($1,$2,1,'no_show')",
      [a, missed.id],
    );
    // Test-only setup: simulate that the valid future booking has reached its
    // start time without waiting for the wall clock.
    await db.exec("reset role");
    await db.exec("alter table public.appointments disable trigger appointments_validate");
    await db.query(
      "update public.appointments set starts_at=clock_timestamp()-interval '1 hour',ends_at=clock_timestamp()-interval '30 minutes' where id=$1",
      [missed.id],
    );
    await db.exec("alter table public.appointments enable trigger appointments_validate");
    await switchActor("admin");
    await db.query("select public.transition_appointment($1,$2,1,'no_show')", [
      a,
      missed.id,
    ]);
    const missedState = (
      await db.query<{
        status: string;
        version: number;
        has_no_show_at: boolean;
      }>(
        "select status,version,no_show_at is not null has_no_show_at from public.appointments where id=$1",
        [missed.id],
      )
    ).rows[0];
    assert.deepEqual(missedState, {
      status: "no_show",
      version: 2,
      has_no_show_at: true,
    });
    await denied(
      "select public.transition_appointment($1,$2,2,'cancelled')",
      [a, missed.id],
    );

    const replacement = await book();
    await denied(
      "update public.appointments set status='cancelled' where id=$1",
      [replacement.id],
    );
    await db.query(
      "select public.transition_appointment($1,$2,1,'cancelled')",
      [a, replacement.id],
    );
    const cancelledState = (
      await db.query<{
        status: string;
        version: number;
        has_cancelled_at: boolean;
      }>(
        "select status,version,cancelled_at is not null has_cancelled_at from public.appointments where id=$1",
        [replacement.id],
      )
    ).rows[0];
    assert.deepEqual(cancelledState, {
      status: "cancelled",
      version: 2,
      has_cancelled_at: true,
    });
    await book();
    const events = await db.query<{ to_status: string }>(
      "select to_status from public.appointment_status_events where appointment_id in ($1,$2) order by to_status",
      [missed.id, replacement.id],
    );
    assert.deepEqual(
      events.rows.map((row) => row.to_status),
      ["cancelled", "no_show"],
    );
  });
});

test("clinical listing uses a stable cursor, literal search and encounter RLS", async () => {
  await asUser("doctor", async () => {
    const created: string[] = [];
    for (const [start, end] of [
      ["2099-09-10T12:00:00Z", "2099-09-10T12:30:00Z"],
      ["2099-09-10T13:00:00Z", "2099-09-10T13:30:00Z"],
      ["2099-09-10T14:00:00Z", "2099-09-10T14:30:00Z"],
    ])
      created.push((await startClinical(start, end)).id);

    const expected = await db.query<{ id: string }>(
      "select id from public.encounters order by created_at desc,id desc",
    );
    const first = await db.query<{ id: string; created_at: string }>(
      "select id,created_at from public.list_encounters_page($1,'',null,null,2)",
      [a],
    );
    assert.deepEqual(
      first.rows.map((row) => row.id),
      expected.rows.slice(0, 2).map((row) => row.id),
    );
    await saveClinical(created[0], 1, "Synthetic pagination", "Stable cursor");
    const cursor = first.rows.at(-1)!;
    const second = await db.query<{ id: string }>(
      "select id from public.list_encounters_page($1,'',$2,$3,2)",
      [a, cursor.created_at, cursor.id],
    );
    assert.deepEqual(
      [...first.rows, ...second.rows].map((row) => row.id),
      expected.rows.map((row) => row.id),
    );
    assert.equal(
      (
        await db.query(
          "select id from public.list_encounters_page($1,'Synthetic A',null,null,20)",
          [a],
        )
      ).rows.length,
      3,
    );
    assert.equal(
      (
        await db.query(
          "select id from public.list_encounters_page($1,'%',null,null,20)",
          [a],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select id from public.list_encounters_page($1,'Synthetic A',null,null,20)",
          [b],
        )
      ).rows.length,
      0,
    );
    await switchActor("admin");
    assert.equal(
      (
        await db.query(
          "select id from public.list_encounters_page($1,'',null,null,20)",
          [a],
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'doctor','active','Synthetic linked colleague')",
      [a, users.other.id],
    );
    await db.query(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'active')",
      [a, pa, users.other.id],
    );
    await switchActor("other");
    const colleagueView = await db.query<{ doctor_display_name: string }>(
      "select doctor_display_name from public.list_encounters_page($1,'',null,null,20)",
      [a],
    );
    assert.equal(colleagueView.rows.length, 3);
    assert.equal(colleagueView.rows[0].doctor_display_name, "Synthetic doctor");
  });
});
test("doctor explicitly accepts an administrator assignment when starting a scheduled encounter", async () => {
  await asUser("admin", async () => {
    const assigned = await db.query<{ id: string; status: string; version: number }>(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'assigned') returning id,status,version",
      [a, pa, users.doctor.id],
    );
    assert.deepEqual(
      { status: assigned.rows[0].status, version: assigned.rows[0].version },
      { status: "assigned", version: 1 },
    );
    await switchActor("doctor");
    const appointment = await book();
    await db.query("select public.start_encounter($1,$2,true,1)", [
      a,
      appointment.id,
    ]);
    const accepted = (
      await db.query<{ status: string; version: number; accepted_at: string }>(
        "select status,version,accepted_at from public.care_relationships where id=$1",
        [assigned.rows[0].id],
      )
    ).rows[0];
    assert.equal(accepted.status, "active");
    assert.equal(accepted.version, 2);
    assert.ok(accepted.accepted_at);
  });
});
test("team invitation is pending, grants no access, and requires the invitee's versioned acceptance", async () => {
  await asUser("admin", async () => {
    const invited = await db.query<{
      status: string;
      version: number;
      accepted_at: string | null;
    }>(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'nurse','invited','Synthetic invitee') returning status,version,accepted_at",
      [a, users.outsider.id],
    );
    assert.deepEqual(invited.rows[0], {
      status: "invited",
      version: 1,
      accepted_at: null,
    });
    await switchActor("outsider");
    assert.equal((await db.query("select id from public.tenants")).rows.length, 1);
    assert.equal(
      (await db.query("select user_id from public.memberships")).rows.length,
      1,
    );
    assert.equal((await db.query("select id from public.patients")).rows.length, 0);
    assert.equal((await db.query("select id from public.encounters")).rows.length, 0);
    await denied(
      "update public.memberships set status='active',expected_version=2 where tenant_id=$1 and user_id=$2",
      [a, users.outsider.id],
    );
    const accepted = await db.query<{
      status: string;
      version: number;
      accepted_at: string;
    }>(
      "update public.memberships set status='active',expected_version=1 where tenant_id=$1 and user_id=$2 returning status,version,accepted_at",
      [a, users.outsider.id],
    );
    assert.equal(accepted.rows[0].status, "active");
    assert.equal(accepted.rows[0].version, 2);
    assert.ok(accepted.rows[0].accepted_at);
    assert.equal((await db.query("select id from public.patients")).rows.length, 1);
    await denied("update public.memberships set role='admin' where user_id=$1", [
      users.outsider.id,
    ]);
    await switchActor("admin");
    const audit = await db.query<{ actor_user_id: string }>(
      "select actor_user_id from public.audit_events where entity_type='memberships' and entity_id=$1 order by created_at",
      [users.outsider.id],
    );
    assert.deepEqual(
      audit.rows.map((row) => row.actor_user_id),
      [users.admin.id, users.outsider.id],
    );
  });
});
test("only an active administrator can invite bounded clinical roles", async () => {
  await asUser("doctor", async () => {
    await denied(
      "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,'nurse','invited','Denied')",
      [a, users.outsider.id],
    );
  });
  await asUser("admin", async () => {
    for (const [tenant, user, role] of [
      [a, users.outsider.id, "admin"],
      [a, users.outsider.id, "patient"],
      [a, users.admin.id, "nurse"],
      [b, users.outsider.id, "nurse"],
    ])
      await denied(
        "insert into public.memberships(tenant_id,user_id,role,status,display_name) values($1,$2,$3,'invited','Denied')",
        [tenant, user, role],
      );
  });
});
test("care assignment, professional acceptance, revocation and suspension change access immediately", async () => {
  await asUser("doctor", async () => {
    const { id: encounterId } = await startClinical();
    await switchActor("admin");
    assert.equal(
      (await db.query("select id from public.encounters where id=$1", [encounterId]))
        .rows.length,
      0,
    );
    const assigned = await db.query<{ id: string; version: number; status: string }>(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'assigned') returning id,version,status",
      [a, pa, users.nurse.id],
    );
    const relationshipId = assigned.rows[0].id;
    assert.deepEqual(
      { version: assigned.rows[0].version, status: assigned.rows[0].status },
      { version: 1, status: "assigned" },
    );
    await denied(
      "update public.care_relationships set status='active',expected_version=1 where id=$1",
      [relationshipId],
    );
    await switchActor("nurse");
    assert.equal(
      (await db.query("select id from public.encounters where id=$1", [encounterId]))
        .rows.length,
      0,
    );
    const accepted = await db.query<{ version: number; status: string }>(
      "update public.care_relationships set status='active',expected_version=1 where id=$1 returning version,status",
      [relationshipId],
    );
    assert.deepEqual(accepted.rows[0], { version: 2, status: "active" });
    assert.equal(
      (await db.query("select id from public.encounters where id=$1", [encounterId]))
        .rows.length,
      1,
    );
    await switchActor("admin");
    await denied(
      "update public.care_relationships set status='revoked',expected_version=1 where id=$1",
      [relationshipId],
    );
    const revoked = await db.query<{ version: number; status: string }>(
      "update public.care_relationships set status='revoked',expected_version=2 where id=$1 returning version,status",
      [relationshipId],
    );
    assert.deepEqual(revoked.rows[0], { version: 3, status: "revoked" });
    await switchActor("nurse");
    assert.equal((await db.query("select id from public.encounters")).rows.length, 0);
    await switchActor("admin");
    const reassigned = await db.query<{ version: number; status: string }>(
      "update public.care_relationships set status='assigned',expected_version=3 where id=$1 returning version,status",
      [relationshipId],
    );
    assert.deepEqual(reassigned.rows[0], { version: 4, status: "assigned" });
    await switchActor("nurse");
    await db.query(
      "update public.care_relationships set status='active',expected_version=4 where id=$1",
      [relationshipId],
    );
    assert.equal((await db.query("select id from public.encounters")).rows.length, 1);
    await switchActor("admin");
    const suspended = await db.query<{ version: number; status: string }>(
      "update public.memberships set status='suspended',expected_version=1 where tenant_id=$1 and user_id=$2 returning version,status",
      [a, users.nurse.id],
    );
    assert.deepEqual(suspended.rows[0], { version: 2, status: "suspended" });
    await switchActor("nurse");
    assert.equal((await db.query("select id from public.encounters")).rows.length, 0);
    assert.equal(
      (await db.query("select id from public.care_relationships")).rows.length,
      0,
    );
    await switchActor("admin");
    const suspendedRevocation = await db.query<{ version: number; status: string }>(
      "update public.care_relationships set status='revoked',expected_version=5 where id=$1 returning version,status",
      [relationshipId],
    );
    assert.deepEqual(suspendedRevocation.rows[0], {
      version: 6,
      status: "revoked",
    });
    await denied(
      "update public.care_relationships set status='assigned',expected_version=6 where id=$1",
      [relationshipId],
    );
    await db.query(
      "update public.memberships set status='active',expected_version=2 where tenant_id=$1 and user_id=$2",
      [a, users.nurse.id],
    );
    const reassignedAfterReactivation = await db.query<{
      version: number;
      status: string;
    }>(
      "update public.care_relationships set status='assigned',expected_version=6 where id=$1 returning version,status",
      [relationshipId],
    );
    assert.deepEqual(reassignedAfterReactivation.rows[0], {
      version: 7,
      status: "assigned",
    });
    await switchActor("nurse");
    await db.query(
      "update public.care_relationships set status='active',expected_version=7 where id=$1",
      [relationshipId],
    );
    assert.equal((await db.query("select id from public.encounters")).rows.length, 1);
  });
});
test("care administration rejects other clinics, inactive or wrong-role professionals and identity changes", async () => {
  await asUser("admin", async () => {
    for (const [tenant, patient, professional] of [
      [b, pb, users.other.id],
      [a, pa, users.suspended.id],
      [a, pa, users.patient.id],
    ])
      await denied(
        "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'assigned')",
        [tenant, patient, professional],
      );
    await denied(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'active')",
      [a, pa, users.nurse.id],
    );
    const assigned = await db.query<{ id: string }>(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'assigned') returning id",
      [a, pa, users.nurse.id],
    );
    await denied(
      "update public.care_relationships set professional_id=$1 where id=$2",
      [users.doctor.id, assigned.rows[0].id],
    );
    await denied("delete from public.care_relationships where id=$1", [
      assigned.rows[0].id,
    ]);
  });
});
test("clinical draft saves preserve snapshots, stale versions do not overwrite, finalized text is immutable", async () => {
  await asUser("doctor", async () => {
    const { id } = await startClinical();
    const saved = await saveClinical(
      id,
      1,
      "Motivo sintético",
      "Evolução sintética",
    );
    assert.equal(saved.rows[0].version, 2);
    assert.equal(
      (await db.query("select * from public.encounter_versions")).rows.length,
      2,
    );
    await denied(
      "update public.encounters set expected_version=1,reason='stale',evolution='stale',status='draft' where tenant_id=$1 and id=$2",
      [a, id],
    );
    await denied(
      "update public.encounters set expected_version=null,reason='bypass',evolution='bypass',status='draft' where tenant_id=$1 and id=$2",
      [a, id],
    );
    await denied("update public.encounters set reason='direct bypass'");
    const finalized = await saveClinical(
      id,
      2,
      "Motivo sintético",
      "Evolução sintética",
      "finalized",
    );
    assert.equal(finalized.rows[0].version, 3);
    assert.ok(
      (
        await db.query<{ finalized_at: string }>(
          "select finalized_at from public.encounters where id=$1",
          [id],
        )
      ).rows[0].finalized_at,
    );
    await denied("update public.encounters set reason='changed' where id=$1", [
      id,
    ]);
    await denied("update public.encounters set status='draft' where id=$1", [
      id,
    ]);
    await denied("delete from public.encounters where id=$1", [id]);
    await denied("update public.encounter_versions set reason='forged'");
    await denied("delete from public.encounter_versions");
    await denied("update public.encounters set doctor_id=$1 where id=$2", [
      users.nurse.id,
      id,
    ]);
    assert.equal(
      (
        await db.query(
          "select reason from public.encounter_versions order by version",
        )
      ).rows.length,
      3,
    );
  });
});
test("finalized encounters accept append-only numbered addenda without changing the original", async () => {
  await asUser("doctor", async () => {
    const { id } = await startClinical();
    await saveClinical(
      id,
      1,
      "Motivo original",
      "Evolução original",
      "finalized",
    );
    const first = await appendAddendum(
      id,
      2,
      "Correção de data",
      "A data correta é a registrada neste adendo.",
    );
    const second = await appendAddendum(
      id,
      2,
      "Complemento",
      "Complemento identificado após a finalização.",
    );
    assert.ok(first.rows[0].id);
    assert.ok(second.rows[0].id);
    const addenda = await db.query<{
      addendum_number: number;
      encounter_version: number;
      reason: string;
      content: string;
      actor_user_id: string;
      created_at: string;
    }>(
      "select addendum_number,encounter_version,reason,content,actor_user_id,created_at from public.encounter_addenda order by addendum_number",
    );
    assert.deepEqual(
      addenda.rows.map((row) => row.addendum_number),
      [1, 2],
    );
    assert.equal(addenda.rows[0].encounter_version, 2);
    assert.equal(addenda.rows[0].actor_user_id, users.doctor.id);
    assert.ok(addenda.rows[0].created_at);
    const original = (
      await db.query<{
        reason: string;
        evolution: string;
        version: number;
        status: string;
      }>("select reason,evolution,version,status from public.encounters where id=$1", [
        id,
      ])
    ).rows[0];
    assert.deepEqual(original, {
      reason: "Motivo original",
      evolution: "Evolução original",
      version: 2,
      status: "finalized",
    });
    await denied(
      "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,addendum_number,reason,content,actor_user_id) values($1,$2,2,3,'forged','forged',$3)",
      [a, id, users.doctor.id],
    );
    await denied("update public.encounter_addenda set content='changed'");
    await denied("delete from public.encounter_addenda");
    await denied(
      "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,1,'stale','stale')",
      [a, id],
    );
    await denied(
      "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,null,'bypass','bypass')",
      [a, id],
    );
    await switchActor("admin");
    const audit = await db.query<{ entity_id: string; changed_fields: string[] }>(
      "select entity_id,changed_fields from public.audit_events where entity_type='encounter_addenda' order by created_at",
    );
    assert.equal(audit.rows.length, 2);
    assert.equal(audit.rows[0].entity_id, first.rows[0].id);
    assert.ok(audit.rows[0].changed_fields.includes("reason"));
    assert.ok(audit.rows[0].changed_fields.includes("content"));
    assert.ok(!audit.rows[0].changed_fields.includes("A data correta é a registrada neste adendo."));
  });
});
test("addenda deny admin, patient, another clinic, non-author and revoked or invalid sessions", async () => {
  await asUser("doctor", async () => {
    const { id } = await startClinical();
    await saveClinical(id, 1, "Motivo", "Evolução", "finalized");
    await appendAddendum(id, 2, "Motivo", "Correção");
    await db.exec("reset role");
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role) values($1,$2,'doctor')",
      [a, users.outsider.id],
    );
    await db.query(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'active')",
      [a, pa, users.nurse.id],
    );
    for (const role of ["admin", "patient", "nurse", "outsider", "other"]) {
      await switchActor(role);
      const visible = await db.query(
        "select id from public.encounter_addenda where encounter_id=$1",
        [id],
      );
      assert.equal(visible.rows.length, role === "nurse" ? 1 : 0, role);
      await denied(
        "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,2,'Não autorizado','Não autorizado')",
        [a, id],
      );
    }
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='revoked' where tenant_id=$1 and professional_id=$2",
      [a, users.doctor.id],
    );
    await switchActor("doctor");
    assert.equal(
      (
        await db.query(
          "select id from public.encounter_addenda where encounter_id=$1",
          [id],
        )
      ).rows.length,
      0,
    );
    await denied(
      "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,2,'Revogado','Revogado')",
      [a, id],
    );
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='active' where tenant_id=$1 and professional_id=$2",
      [a, users.doctor.id],
    );
    await db.query("delete from auth.sessions where id=$1", [users.doctor.session]);
    await switchActor("doctor");
    await denied(
      "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,2,'Sessão inválida','Sessão inválida')",
      [a, id],
    );
  });
});
test("addendum and its metadata-only audit commit atomically", async () => {
  await asUser("doctor", async () => {
    const { id } = await startClinical();
    await saveClinical(id, 1, "Motivo", "Evolução", "finalized");
    await db.exec("reset role");
    await db.exec(
      "alter table public.audit_events add constraint addendum_audit_failure check(entity_type<>'encounter_addenda') not valid",
    );
    await switchActor("doctor");
    await denied(
      "insert into public.encounter_addenda(tenant_id,encounter_id,encounter_version,reason,content) values($1,$2,2,'Motivo','Deve reverter')",
      [a, id],
    );
    assert.equal(
      (await db.query("select id from public.encounter_addenda")).rows.length,
      0,
    );
  });
});
test("clinical records and snapshots deny admin, patient, unlinked staff and other clinics even by exact ID", async () => {
  await asUser("doctor", async () => {
    const { id, appointment } = await startClinical();
    await db.exec("reset role");
    await db.query(
      "insert into public.memberships(tenant_id,user_id,role) values($1,$2,'doctor')",
      [a, users.outsider.id],
    );
    for (const role of [
      "admin",
      "patient",
      "nurse",
      "outsider",
      "other",
      "suspended",
    ]) {
      await switchActor(role);
      assert.equal(
        (await db.query("select * from public.encounters where id=$1", [id]))
          .rows.length,
        0,
        role,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.encounter_versions where encounter_id=$1",
            [id],
          )
        ).rows.length,
        0,
        role,
      );
      await denied("select public.start_encounter($1,$2,true,1)", [
        a,
        appointment,
      ]);
      await denied(
        "insert into public.care_relationships(tenant_id,patient_id,professional_id) values($1,$2,$3)",
        [a, pa, users[role].id],
      );
    }
    await switchActor("admin");
    const audit = await db.query<{ changed_fields: string[] }>(
      "select changed_fields from public.audit_events where entity_type=$1 and entity_id=$2",
      ["encounters", id],
    );
    assert.equal(audit.rows.length, 1);
    assert.ok(audit.rows[0].changed_fields.includes("reason"));
  });
});
test("nurse with provisioned care link reads but cannot write; revocation and session invalidation immediately remove access", async () => {
  await asUser("doctor", async () => {
    const { id, appointment } = await startClinical();
    await db.exec("reset role");
    await db.query(
      "insert into public.care_relationships(tenant_id,patient_id,professional_id,status) values($1,$2,$3,'active')",
      [a, pa, users.nurse.id],
    );
    await switchActor("nurse");
    assert.equal(
      (await db.query("select id from public.encounters where id=$1", [id]))
        .rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.encounters set expected_version=1,reason='nurse edit' where id=$1 returning id",
          [id],
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='revoked' where tenant_id=$1",
      [a],
    );
    await switchActor("doctor");
    assert.equal(
      (await db.query("select id from public.encounters")).rows.length,
      0,
    );
    await denied("select public.start_encounter($1,$2,true,1)", [a, appointment]);
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='active' where tenant_id=$1",
      [a],
    );
    await db.query("delete from auth.sessions where id=$1", [
      users.doctor.session,
    ]);
    await switchActor("doctor");
    assert.equal(
      (await db.query("select id from public.encounters")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select id from public.encounter_versions")).rows.length,
      0,
    );
  });
});
test("started appointments cannot be reassigned or cancelled; cancelled appointments cannot start care", async () => {
  await asUser("doctor", async () => {
    const { appointment } = await startClinical();
    await switchActor("admin");
    await denied(
      "select public.transition_appointment($1,$2,2,'cancelled')",
      [a, appointment],
    );
    await denied(
      "update public.appointments set expected_version=2,starts_at=starts_at+interval '1 hour',ends_at=ends_at+interval '1 hour' where id=$1",
      [appointment],
    );
  });
  await asUser("doctor", async () => {
    const appointment = await book();
    await db.query("select public.transition_appointment($1,$2,1,'cancelled')", [
      a,
      appointment.id,
    ]);
    await denied("select public.start_encounter($1,$2,true,1)", [
      a,
      appointment.id,
    ]);
  });
});
test("finalization requires clinical text; cross-tenant identity and audit failure cannot leave partial clinical records", async () => {
  await asUser("doctor", async () => {
    const { id, appointment } = await startClinical();
    await denied(
      "update public.encounters set expected_version=1,reason='',evolution='',status='finalized' where tenant_id=$1 and id=$2",
      [a, id],
    );
    await denied(
      "insert into public.encounters(tenant_id,appointment_id,patient_id,doctor_id) values($1,$2,$3,$4)",
      [b, appointment, pb, users.doctor.id],
    );
    await db.exec("reset role");
    await db.exec(
      "alter table public.audit_events add constraint clinical_audit_failure check(entity_type<>'encounters') not valid",
    );
    await switchActor("doctor");
    await denied(
      "update public.encounters set expected_version=1,reason='Must rollback',evolution='',status='draft' where tenant_id=$1 and id=$2",
      [a, id],
    );
    const record = await db.query<{ reason: string; version: number }>(
      "select reason,version from public.encounters where id=$1",
      [id],
    );
    assert.equal(record.rows[0].version, 1);
    assert.equal(record.rows[0].reason, "");
    assert.equal(
      (await db.query("select id from public.encounter_versions")).rows.length,
      1,
    );
  });
});

test("appointment audit failure rolls back clinical finalization and keeps both records coherent", async () => {
  await asUser("doctor", async () => {
    const { id, appointment } = await startClinical();
    await db.exec("reset role");
    await db.exec(
      "alter table public.audit_events add constraint completion_audit_failure check(entity_type<>'appointments') not valid",
    );
    await switchActor("doctor");
    await denied(
      "update public.encounters set expected_version=1,reason='Synthetic finalization',evolution='Must rollback',status='finalized' where tenant_id=$1 and id=$2",
      [a, id],
    );
    const encounter = (
      await db.query<{ status: string; version: number }>(
        "select status,version from public.encounters where id=$1",
        [id],
      )
    ).rows[0];
    const scheduled = (
      await db.query<{ status: string; version: number }>(
        "select status,version from public.appointments where id=$1",
        [appointment],
      )
    ).rows[0];
    assert.deepEqual(encounter, { status: "draft", version: 1 });
    assert.deepEqual(scheduled, { status: "in_progress", version: 2 });
    assert.equal(
      (
        await db.query(
          "select id from public.appointment_status_events where appointment_id=$1",
          [appointment],
        )
      ).rows.length,
      1,
    );
  });
});

test("anonymous role cannot read the directory", async () => {
  await db.exec("begin; set local role anon;");
  try {
    await assert.rejects(
      db.query("select * from public.patients"),
      /permission denied/,
    );
  } finally {
    await db.exec("rollback");
  }
});
test("unfiltered requests cannot leak other clinics", async () => {
  await asUser("doctor", async () => {
    const { rows } = await db.query<{ id: string }>(
      "select id from public.patients",
    );
    assert.deepEqual(
      rows.map((r) => r.id),
      [pa],
    );
    assert.equal(
      (await db.query("select * from public.tenants")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.memberships")).rows.length,
      1,
    );
  });
});
test("patient, suspended membership and no membership cannot read the directory", async () => {
  for (const role of ["patient", "suspended", "outsider"])
    await asUser(role, async () => {
      assert.equal(
        (await db.query("select * from public.patients")).rows.length,
        0,
      );
    });
});
test("direct patient links and matching names cannot expose another clinic", async () => {
  await asUser("doctor", async () => {
    const own = await db.query(
      "select id from public.patients where tenant_id=$1 and id=$2",
      [a, pa],
    );
    assert.equal(own.rows.length, 1);
    const foreign = await db.query(
      "select id from public.patients where id=$1",
      [pb],
    );
    assert.equal(foreign.rows.length, 0);
    const search = await db.query<{ id: string }>(
      "select id from public.patients where display_name ilike $1",
      ["%Synthetic%"],
    );
    assert.deepEqual(
      search.rows.map((row) => row.id),
      [pa],
    );
  });
});

test("linked patient reads only their record and cannot modify data or their link", async () => {
  await db.exec("begin");
  try {
    await db.query(
      "insert into public.patient_accounts(tenant_id,user_id,patient_id) values($1,$2,$3)",
      [a, users.patient.id, pa],
    );
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({
        sub: users.patient.id,
        session_id: users.patient.session,
      }),
    ]);
    assert.deepEqual(
      (
        await db.query<{ id: string }>("select id from public.patients")
      ).rows.map((row) => row.id),
      [pa],
    );
    assert.equal(
      (await db.query("select * from public.patients where id=$1", [pb])).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.audit_events")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.patients set display_name='Changed' where id=$1 returning id",
          [pa],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("update public.patient_accounts set patient_id=$1", [pb]),
      /permission denied/,
    );
  } finally {
    await db.exec("rollback");
  }
});

test("patient profile stops being visible immediately after membership suspension", async () => {
  await db.exec("begin");
  try {
    await db.query(
      "insert into public.patient_accounts(tenant_id,user_id,patient_id) values($1,$2,$3)",
      [a, users.patient.id, pa],
    );
    await db.query(
      "update public.memberships set status='suspended' where tenant_id=$1 and user_id=$2",
      [a, users.patient.id],
    );
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({
        sub: users.patient.id,
        session_id: users.patient.session,
      }),
    ]);
    assert.equal(
      (await db.query("select * from public.patients")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.patient_accounts")).rows.length,
      0,
    );
  } finally {
    await db.exec("rollback");
  }
});

test("patient account cannot reference a record from another tenant", async () => {
  await assert.rejects(
    db.query(
      "insert into public.patient_accounts(tenant_id,user_id,patient_id) values($1,$2,$3)",
      [a, users.patient.id, pb],
    ),
    /foreign key/,
  );
});

test("forged user_metadata never grants admin access", async () => {
  await asUser(
    "patient",
    async () => {
      assert.equal(
        (await db.query("select * from public.audit_events")).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into public.patients(tenant_id,display_name) values ($1,'Unauthorized')",
          [a],
        ),
        /row-level security/,
      );
    },
    { user_metadata: { role: "admin", tenant_id: a } },
  );
});
test("expired or revoked session fails closed", async () => {
  await asUser(
    "doctor",
    async () => {
      assert.equal(
        (await db.query("select * from public.patients")).rows.length,
        0,
      );
    },
    { session_id: randomUUID() },
  );
  await asUser(
    "doctor",
    async () => {
      assert.equal(
        (await db.query("select * from public.patients")).rows.length,
        0,
      );
    },
    { session_id: null },
  );
});
test("database suspension, banned user and expired session take effect without refreshing JWT", async () => {
  const changes = [
    {
      sql: "update public.tenants set status='suspended' where id=$1",
      value: a,
    },
    {
      sql: "update public.memberships set status='suspended' where user_id=$1",
      value: users.doctor.id,
    },
    {
      sql: "update auth.users set banned_until=now()+interval '1 day' where id=$1",
      value: users.doctor.id,
    },
    {
      sql: "update auth.users set deleted_at=now() where id=$1",
      value: users.doctor.id,
    },
    {
      sql: "update auth.sessions set not_after=now()-interval '1 minute' where id=$1",
      value: users.doctor.session,
    },
  ];
  for (const change of changes) {
    await db.exec("begin");
    try {
      await db.query(change.sql, [change.value]);
      await db.exec("set local role authenticated");
      await db.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({
          sub: users.doctor.id,
          session_id: users.doctor.session,
        }),
      ]);
      assert.equal(
        (await db.query("select * from public.patients")).rows.length,
        0,
      );
    } finally {
      await db.exec("rollback");
    }
  }
});
test("cross-tenant create is blocked", async () => {
  await asUser("doctor", async () => {
    await assert.rejects(
      db.query(
        "insert into public.patients(tenant_id,display_name) values ($1,'Unauthorized')",
        [b],
      ),
      /row-level security/,
    );
  });
});
test("members cannot promote themselves", async () => {
  await asUser("doctor", async () => {
    await assert.rejects(
      db.query("update public.memberships set role='admin'"),
      /permission denied/,
    );
  });
});
test("patient creation and audit are atomic and actor is not caller-controlled", async () => {
  await asUser("admin", async () => {
    const created = await db.query<{ id: string; created_by: string }>(
      "insert into public.patients(tenant_id,display_name) values ($1,'Synthetic new') returning id,created_by",
      [a],
    );
    assert.equal(created.rows[0].created_by, users.admin.id);
    const audit = await db.query<{
      actor_user_id: string;
      changed_fields: string[];
    }>(
      "select actor_user_id,changed_fields from public.audit_events where entity_id=$1",
      [created.rows[0].id],
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].actor_user_id, users.admin.id);
    assert.ok(audit.rows[0].changed_fields.includes("display_name"));
    assert.ok(!JSON.stringify(audit.rows).includes("Synthetic new"));
  });
});
test("forged created_by is rejected by column privileges", async () => {
  await asUser("admin", async () => {
    await assert.rejects(
      db.query(
        "insert into public.patients(tenant_id,display_name,created_by) values ($1,'Forged',$2)",
        [a, users.other.id],
      ),
      /permission denied/,
    );
  });
});
test("changing tenant or deleting a patient is prohibited", async () => {
  await asUser("admin", async () => {
    await assert.rejects(
      db.query("update public.patients set tenant_id=$1 where id=$2", [b, pa]),
      /permission denied/,
    );
  });
  await asUser("admin", async () => {
    await assert.rejects(
      db.query("delete from public.patients"),
      /permission denied/,
    );
  });
});
test("demographic update is audited and cross-tenant update has no effect", async () => {
  await asUser("admin", async () => {
    await db.query(
      "update public.patients set display_name='Synthetic revised' where id=$1",
      [pa],
    );
    const result = await db.query(
      "select * from public.audit_events where entity_id=$1 and action='update'",
      [pa],
    );
    assert.equal(result.rows.length, 1);
    const other = await db.query(
      "update public.patients set display_name='Unauthorized' where id=$1 returning id",
      [pb],
    );
    assert.equal(other.rows.length, 0);
  });
});
test("audit cannot be forged, edited or removed by any app member", async () => {
  for (const query of [
    "insert into public.audit_events(tenant_id,action,entity_type,entity_id) values ('" +
      a +
      "','insert','patients','" +
      pa +
      "')",
    "update public.audit_events set action='fake'",
    "delete from public.audit_events",
  ]) {
    await asUser("admin", async () => {
      await assert.rejects(db.query(query), /permission denied/);
    });
  }
  await asUser("doctor", async () => {
    assert.equal(
      (await db.query("select * from public.audit_events")).rows.length,
      0,
    );
  });
});
test("audit failure rolls back the patient mutation", async () => {
  await db.exec("begin");
  try {
    await db.exec(
      "alter table public.audit_events add constraint test_reject_insert check (action <> 'insert') not valid",
    );
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: users.admin.id, session_id: users.admin.session }),
    ]);
    await assert.rejects(
      db.query(
        "insert into public.patients(tenant_id,display_name) values ($1,'Must rollback')",
        [a],
      ),
      /test_reject_insert/,
    );
  } finally {
    await db.exec("rollback");
  }
  assert.equal(
    (
      await db.query(
        "select * from public.patients where display_name='Must rollback'",
      )
    ).rows.length,
    0,
  );
});

async function checkInFixture() {
  await startClinical("2099-11-01T12:00:00Z", "2099-11-01T12:30:00Z");
  await db.exec("reset role");
  await db.query("insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",[a,pa,users.patient.id]);
  await switchActor("doctor");
  return (await db.query<{id:string}>("select public.request_care_check_in($1,$2,'How have you been since the last visit?','2099-11-03') id",[a,pa])).rows[0].id;
}

test("manual check-in preserves the patient report, is idempotent and requires human review", async () => {
  await asUser("doctor", async () => {
    const id=await checkInFixture();
    await denied("insert into public.care_check_ins(tenant_id,patient_id,prompt) values($1,$2,'Forged')",[a,pa]);
    await switchActor("patient");
    assert.equal((await db.query("select id from public.care_check_ins where id=$1",[id])).rows.length,1);
    await denied("select public.submit_care_check_in($1,$2,'Original report',null,null,null,current_date,false)",[a,id]);
    const submission=(await db.query<{id:string}>("select public.submit_care_check_in($1,$2,'Original patient report','Weight',72.4,'kg',current_date,true) id",[a,id])).rows[0].id;
    assert.equal((await db.query<{id:string}>("select public.submit_care_check_in($1,$2,'Replay ignored',null,null,null,current_date,true) id",[a,id])).rows[0].id,submission);
    assert.equal((await db.query<{report:string}>("select report from public.care_check_in_submissions where id=$1",[submission])).rows[0].report,"Original patient report");
    await denied("update public.care_check_in_submissions set report='Changed'");
    assert.equal((await db.query("select id from public.care_check_in_reviews")).rows.length,0);
    await switchActor("doctor");
    const review=(await db.query<{id:string}>("select public.review_care_check_in($1,$2,'Reviewed by the care team.',true) id",[a,id])).rows[0].id;
    assert.equal((await db.query<{status:string}>("select status from public.care_check_ins where id=$1",[id])).rows[0].status,"reviewed");
    await switchActor("patient");
    assert.equal((await db.query("select id from public.care_check_in_reviews where id=$1",[review])).rows.length,0);
    await db.exec("reset role");
    const audit=await db.query<{n:number;payload:string}>("select count(*)::int n,json_agg(a)::text payload from public.audit_events a where entity_id in ($1,$2,$3)",[id,submission,review]);
    assert.equal(audit.rows[0].n,5);
    assert.ok(!audit.rows[0].payload.includes("Original patient report"));
  });
});

test("check-in denies unrelated roles and immediately follows care and account revocation", async () => {
  await asUser("doctor", async () => {
    const id=await checkInFixture();
    for(const role of ["admin","nurse","other","outsider","suspended"]){
      await switchActor(role);
      assert.equal((await db.query("select id from public.care_check_ins where id=$1",[id])).rows.length,0);
      await denied("select public.request_care_check_in($1,$2,'Denied',null)",[a,pa]);
    }
    await db.exec("reset role");
    await db.query("delete from public.patient_accounts where tenant_id=$1 and patient_id=$2",[a,pa]);
    await switchActor("patient");
    assert.equal((await db.query("select id from public.care_check_ins where id=$1",[id])).rows.length,0);
    await denied("select public.submit_care_check_in($1,$2,'Denied',null,null,null,current_date,true)",[a,id]);
    await db.exec("reset role");
    await db.query("delete from public.care_relationships where tenant_id=$1 and patient_id=$2 and professional_id=$3",[a,pa,users.doctor.id]);
    await switchActor("doctor");
    assert.equal((await db.query("select id from public.care_check_ins where id=$1",[id])).rows.length,0);
  });
});

test("check-in submission rolls back when its audit cannot be recorded", async () => {
  await asUser("doctor", async () => {
    const id=await checkInFixture();
    await db.exec("reset role");
    await db.exec("create function private.synthetic_check_in_audit_failure() returns trigger language plpgsql as $$ begin if new.entity_type='care_check_in_submissions' then raise exception 'Synthetic audit failure'; end if; return new; end; $$; create trigger synthetic_check_in_audit_failure before insert on public.audit_events for each row execute function private.synthetic_check_in_audit_failure();");
    await switchActor("patient");
    await denied("select public.submit_care_check_in($1,$2,'Must roll back',null,null,null,current_date,true)",[a,id]);
    assert.equal((await db.query("select id from public.care_check_in_submissions where check_in_id=$1",[id])).rows.length,0);
    assert.equal((await db.query<{status:string}>("select status from public.care_check_ins where id=$1",[id])).rows[0].status,"pending");
  });
});

async function privateDocumentFixture(visibility: "internal" | "shared" = "shared") {
  await startClinical("2099-12-01T12:00:00Z", "2099-12-01T12:30:00Z");
  await db.exec("reset role");
  await db.query(
    "insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",
    [a, pa, users.patient.id],
  );
  await switchActor("doctor");
  return reservePrivateDocument("synthetic-result.pdf", "exam", visibility);
}

async function reservePrivateDocument(
  filename: string,
  category: "exam" | "clinical_document",
  visibility: "internal" | "shared",
) {
  return reservePrivateDocumentAs("doctor", filename, category, visibility);
}

async function reservePrivateDocumentAs(
  actor: string,
  filename: string,
  category: "exam" | "clinical_document",
  visibility: "internal" | "shared",
) {
  await db.exec("set local role service_role");
  try {
    return (
      await db.query<{ document_id: string; storage_path: string }>(
        "select * from public.reserve_patient_document($1,$2,$3,$4,'application/pdf',6,$5,$6)",
        [a, pa, users[actor].id, filename, category, visibility],
      )
    ).rows[0];
  } finally {
    await switchActor(actor);
  }
}

async function completePrivateDocument(documentId: string) {
  return completePrivateDocumentAs("doctor", documentId);
}

async function completePrivateDocumentAs(actor: string, documentId: string) {
  await db.exec("set local role service_role");
  try {
    await db.query("select public.complete_patient_document($1,$2,$3)", [
      a,
      documentId,
      users[actor].id,
    ]);
  } finally {
    await switchActor(actor);
  }
}

test("private documents require a reservation, stay hidden until validation, and preserve audit metadata", async () => {
  await asUser("doctor", async () => {
    const document = await privateDocumentFixture();
    await denied(
      "select * from public.reserve_patient_document($1,$2,$3,'bypass.pdf','application/pdf',6,'exam','shared')",
      [a, pa, users.doctor.id],
    );
    await denied(
      "insert into public.patient_documents(tenant_id,patient_id,uploaded_by,original_filename,storage_path,content_type,byte_size,category,visibility) values($1,$2,$3,'forged.pdf','patient-documents/forged','application/pdf',6,'exam','shared')",
      [a, pa, users.doctor.id],
    );
    await denied(
      "insert into storage.objects(bucket_id,name) values('vivance-documents','patient-documents/forged')",
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",
      [document.storage_path],
    );
    await switchActor("patient");
    assert.equal(
      (await db.query("select id from public.patient_documents where id=$1", [document.document_id]))
        .rows.length,
      0,
    );
    assert.equal(
      (await db.query("select name from storage.objects where name=$1", [document.storage_path]))
        .rows.length,
      0,
    );
    await switchActor("doctor");
    await completePrivateDocument(document.document_id);
    await switchActor("patient");
    assert.equal(
      (await db.query("select id from public.patient_documents where id=$1", [document.document_id]))
        .rows.length,
      1,
    );
    assert.equal(
      (await db.query("select name from storage.objects where name=$1", [document.storage_path]))
        .rows.length,
      1,
    );
    await db.exec("reset role");
    const audit = await db.query<{ n: number; payload: string }>(
      "select count(*)::int n,json_agg(a)::text payload from public.audit_events a where entity_type='patient_documents' and entity_id=$1",
      [document.document_id],
    );
    assert.equal(audit.rows[0].n, 2);
    assert.ok(!audit.rows[0].payload.includes("synthetic-result.pdf"));
  });
});

test("private documents isolate internal files and immediately follow care-account revocation", async () => {
  await asUser("doctor", async () => {
    const shared = await privateDocumentFixture("shared");
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",
      [shared.storage_path],
    );
    await completePrivateDocument(shared.document_id);
    const internal = await reservePrivateDocument(
      "internal.pdf",
      "clinical_document",
      "internal",
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",
      [internal.storage_path],
    );
    await completePrivateDocument(internal.document_id);
    for (const role of ["admin", "nurse", "other", "outsider", "suspended"]) {
      await switchActor(role);
      assert.equal(
        (await db.query("select id from public.patient_documents where id=$1", [shared.document_id]))
          .rows.length,
        0,
      );
      assert.equal(
        (await db.query("select name from storage.objects where name=$1", [shared.storage_path]))
          .rows.length,
        0,
      );
    }
    await switchActor("patient");
    assert.equal(
      (await db.query("select id from public.patient_documents where id=$1", [shared.document_id]))
        .rows.length,
      1,
    );
    assert.equal(
      (await db.query("select id from public.patient_documents where id=$1", [internal.document_id]))
        .rows.length,
      0,
    );
    await denied(
      "select * from public.reserve_patient_document($1,$2,$3,'forbidden.pdf','application/pdf',6,'exam','internal')",
      [a, pa, users.patient.id],
    );
    await db.exec("set local role service_role");
    const patientInternal = await db.query<{ document_id: string }>(
      "select * from public.reserve_patient_document($1,$2,$3,'forbidden.pdf','application/pdf',6,'exam','internal')",
      [a, pa, users.patient.id],
    );
    assert.equal(patientInternal.rows.length, 1);
    await switchActor("patient");
    const patientShared = await reservePrivateDocumentAs(
      "patient",
      "patient-shared.pdf",
      "exam",
      "shared",
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",
      [patientShared.storage_path],
    );
    await completePrivateDocumentAs("patient", patientShared.document_id);
    await switchActor("doctor");
    assert.equal(
      (await db.query("select id from public.patient_documents where id=$1", [patientShared.document_id]))
        .rows.length,
      1,
    );
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='revoked',expected_version=1 where tenant_id=$1 and patient_id=$2 and professional_id=$3",
      [a, pa, users.doctor.id],
    );
    await switchActor("doctor");
    assert.equal(
      (await db.query("select id from public.patient_documents where id=$1", [shared.document_id]))
        .rows.length,
      0,
    );
    assert.equal(
      (await db.query("select name from storage.objects where name=$1", [shared.storage_path]))
        .rows.length,
      0,
    );
  });
});

test("document reviews are immutable, doctor-only and hidden from patients", async () => {
  await asUser("doctor", async () => {
    const document = await privateDocumentFixture("shared");
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",
      [document.storage_path],
    );
    await denied(
      "select public.review_patient_document($1,$2,'approved','Internal human review',false)",
      [a, document.document_id],
    );
    await completePrivateDocument(document.document_id);
    const review = (
      await db.query<{ id: string }>(
        "select public.review_patient_document($1,$2,'approved','Internal human review',true) id",
        [a, document.document_id],
      )
    ).rows[0].id;
    const original = await db.query<{ visibility: string; storage_path: string }>(
      "select visibility,storage_path from public.patient_documents where id=$1",
      [document.document_id],
    );
    assert.deepEqual(original.rows, [
      { visibility: "shared", storage_path: document.storage_path },
    ]);
    assert.deepEqual(
      (
        await db.query<{ decision: string; reviewer_id: string }>(
          "select decision,reviewer_id from public.patient_document_reviews where id=$1",
          [review],
        )
      ).rows,
      [{ decision: "approved", reviewer_id: users.doctor.id }],
    );
    await denied(
      "update public.patient_document_reviews set internal_note='changed' where id=$1",
      [review],
    );
    await denied("delete from public.patient_document_reviews where id=$1", [review]);
    for (const role of ["patient", "admin", "nurse", "other", "outsider", "suspended"]) {
      await switchActor(role);
      assert.equal(
        (await db.query("select id from public.patient_document_reviews where id=$1", [review]))
          .rows.length,
        0,
      );
      await denied(
        "select public.review_patient_document($1,$2,'rejected','Forbidden note',true)",
        [a, document.document_id],
      );
    }
    await db.exec("reset role");
    const audit = await db.query<{ n: number; payload: string }>(
      "select count(*)::int n,json_agg(a)::text payload from public.audit_events a where entity_type='patient_document_reviews' and entity_id=$1",
      [review],
    );
    assert.equal(audit.rows[0].n, 1);
    assert.ok(!audit.rows[0].payload.includes("Internal human review"));
  });
});

test("document review access immediately follows care revocation", async () => {
  await asUser("doctor", async () => {
    const document = await privateDocumentFixture("internal");
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vivance-documents',$1)",
      [document.storage_path],
    );
    await completePrivateDocument(document.document_id);
    const review = (
      await db.query<{ id: string }>(
        "select public.review_patient_document($1,$2,'needs_follow_up','Repeat exam requested',true) id",
        [a, document.document_id],
      )
    ).rows[0].id;
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='revoked',expected_version=1 where tenant_id=$1 and patient_id=$2 and professional_id=$3",
      [a, pa, users.doctor.id],
    );
    await switchActor("doctor");
    assert.equal(
      (await db.query("select id from public.patient_document_reviews where id=$1", [review]))
        .rows.length,
      0,
    );
    await denied(
      "select public.review_patient_document($1,$2,'approved','Late review',true)",
      [a, document.document_id],
    );
  });
});

test("document completion rejects missing files and audit failure leaves no reservation", async () => {
  await asUser("doctor", async () => {
    const document = await privateDocumentFixture();
    await denied("select public.complete_patient_document($1,$2,$3)", [
      a,
      document.document_id,
      users.doctor.id,
    ]);
    assert.equal(
      (await db.query<{ status: string }>("select status from public.patient_documents where id=$1", [
        document.document_id,
      ])).rows[0].status,
      "reserved",
    );
    await db.exec("reset role");
    await db.exec(
      "create function private.synthetic_document_audit_failure() returns trigger language plpgsql as $$ begin if new.entity_type='patient_documents' then raise exception 'Synthetic document audit failure'; end if; return new; end; $$; create trigger synthetic_document_audit_failure before insert on public.audit_events for each row execute function private.synthetic_document_audit_failure();",
    );
    await switchActor("doctor");
    await db.exec("set local role service_role");
    await denied(
      "select * from public.reserve_patient_document($1,$2,$3,'must-rollback.pdf','application/pdf',6,'exam','shared')",
      [a, pa, users.doctor.id],
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select id from public.patient_documents where original_filename='must-rollback.pdf'"))
        .rows.length,
      0,
    );
  });
});

async function directMessageFixture() {
  await startClinical("2099-12-20T12:00:00Z", "2099-12-20T12:30:00Z");
  await db.exec("reset role");
  await db.query(
    "insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",
    [a, pa, users.patient.id],
  );
  await switchActor("doctor");
}

async function sendSyntheticDirectMessage(
  actor: string,
  content: string,
  requestKey = randomUUID(),
) {
  await switchActor(actor);
  return (
    await db.query<{
      conversation_id: string;
      message_id: string;
      sent_at: string;
    }>("select * from public.send_direct_message($1,$2,$3,$4,$5)", [
      a,
      pa,
      users.doctor.id,
      content,
      requestKey,
    ])
  ).rows[0];
}

test("direct messages are append-only, patient-doctor only, and hide content from operations", async () => {
  await asUser("doctor", async () => {
    await directMessageFixture();
    const first = await sendSyntheticDirectMessage(
      "doctor",
      "Synthetic direct doctor message",
    );
    await switchActor("patient");
    assert.equal(
      (
        await db.query<{ content: string }>(
          "select content from public.care_messages where id=$1",
          [first.message_id],
        )
      ).rows[0].content,
      "Synthetic direct doctor message",
    );
    assert.equal(
      (
        await db.query(
          "select user_id from public.memberships where tenant_id=$1 and role='doctor'",
          [a],
        )
      ).rows.length,
      1,
    );
    const reply = await sendSyntheticDirectMessage(
      "patient",
      "Synthetic patient reply",
    );
    assert.equal(first.conversation_id, reply.conversation_id);
    await switchActor("doctor");
    const history = await db.query<{ content: string; sender_id: string }>(
      "select content,sender_id from public.care_messages where conversation_id=$1 order by sent_at,id",
      [first.conversation_id],
    );
    assert.deepEqual(history.rows, [
      { content: "Synthetic direct doctor message", sender_id: users.doctor.id },
      { content: "Synthetic patient reply", sender_id: users.patient.id },
    ]);
    await denied(
      "insert into public.care_messages(tenant_id,conversation_id,patient_id,doctor_id,sender_id,content) values($1,$2,$3,$4,$5,'Forged direct message')",
      [a, first.conversation_id, pa, users.doctor.id, users.doctor.id],
    );
    await denied(
      "update public.care_messages set content='Changed' where id=$1",
      [first.message_id],
    );
    await denied("delete from public.care_messages where id=$1", [first.message_id]);
    for (const role of ["admin", "nurse", "other", "outsider", "suspended"]) {
      await switchActor(role);
      assert.equal(
        (await db.query("select id from public.care_messages where id=$1", [first.message_id]))
          .rows.length,
        0,
      );
      await denied("select * from public.send_direct_message($1,$2,$3,$4,$5)", [
        a,
        pa,
        users.doctor.id,
        "Denied synthetic message",
        randomUUID(),
      ]);
    }
    await db.exec("reset role");
    const audit = await db.query<{ payload: string }>(
      "select json_agg(a)::text payload from public.audit_events a where entity_id in ($1,$2,$3)",
      [first.conversation_id, first.message_id, reply.message_id],
    );
    assert.ok(!audit.rows[0].payload.includes("Synthetic direct doctor message"));
    assert.ok(!audit.rows[0].payload.includes("Synthetic patient reply"));
  });
});

test("direct message retries are idempotent and read cursors belong to each participant", async () => {
  await asUser("doctor", async () => {
    await directMessageFixture();
    const requestKey = randomUUID();
    const first = await sendSyntheticDirectMessage(
      "doctor",
      "Retry-safe synthetic message",
      requestKey,
    );
    const replay = await sendSyntheticDirectMessage(
      "doctor",
      "Retry-safe synthetic message",
      requestKey,
    );
    assert.deepEqual(replay, first);
    assert.equal(
      (
        await db.query(
          "select id from public.care_messages where client_request_id=$1",
          [requestKey],
        )
      ).rows.length,
      1,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where event_key=$1",
          [`message:${first.message_id}`],
        )
      ).rows.length,
      1,
    );
    await switchActor("doctor");
    await denied(
      "select * from public.send_direct_message($1,$2,$3,$4,$5)",
      [a, pa, users.doctor.id, "Different content", requestKey],
    );
    const latest = await sendSyntheticDirectMessage(
      "doctor",
      "Latest synthetic message",
    );

    await switchActor("patient");
    await db.query(
      "select public.mark_direct_messages_read($1,$2,$3,$4)",
      [a, pa, users.doctor.id, latest.message_id],
    );
    await db.query(
      "select public.mark_direct_messages_read($1,$2,$3,$4)",
      [a, pa, users.doctor.id, first.message_id],
    );
    assert.deepEqual(
      (
        await db.query<{ last_read_message_id: string }>(
          "select last_read_message_id from public.care_conversation_reads",
        )
      ).rows,
      [{ last_read_message_id: latest.message_id }],
    );
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where read_at is not null",
        )
      ).rows.length,
      0,
    );

    await switchActor("doctor");
    assert.equal(
      (await db.query("select reader_id from public.care_conversation_reads"))
        .rows.length,
      0,
    );
    await switchActor("admin");
    await denied(
      "select public.mark_direct_messages_read($1,$2,$3,$4)",
      [a, pa, users.doctor.id, latest.message_id],
    );
  });
});

test("direct messaging follows care revocation and rolls back if its audit cannot be recorded", async () => {
  await asUser("doctor", async () => {
    await directMessageFixture();
    const first = await sendSyntheticDirectMessage("doctor", "Synthetic message");
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='revoked',expected_version=1 where tenant_id=$1 and patient_id=$2 and professional_id=$3",
      [a, pa, users.doctor.id],
    );
    for (const role of ["doctor", "patient"]) {
      await switchActor(role);
      assert.equal(
        (await db.query("select id from public.care_messages where id=$1", [first.message_id]))
          .rows.length,
        0,
      );
      await denied("select * from public.send_direct_message($1,$2,$3,$4,$5)", [
        a,
        pa,
        users.doctor.id,
        "Denied after revocation",
        randomUUID(),
      ]);
    }
  });

  await asUser("doctor", async () => {
    await directMessageFixture();
    await db.exec("reset role");
    await db.exec(
      "create function private.synthetic_message_audit_failure() returns trigger language plpgsql as $$ begin if new.entity_type='care_messages' then raise exception 'Synthetic message audit failure'; end if; return new; end; $$; create trigger synthetic_message_audit_failure before insert on public.audit_events for each row execute function private.synthetic_message_audit_failure();",
    );
    await switchActor("doctor");
    await denied("select * from public.send_direct_message($1,$2,$3,$4,$5)", [
      a,
      pa,
      users.doctor.id,
      "Must roll back",
      randomUUID(),
    ]);
    await db.exec("reset role");
    assert.equal(
      (await db.query("select id from public.care_conversations where tenant_id=$1", [a]))
        .rows.length,
      0,
    );
    assert.equal(
      (await db.query("select id from public.care_messages where tenant_id=$1", [a]))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      0,
    );
  });
});

test("in-app message notices are generic, recipient-bound, idempotent and respect preferences", async () => {
  await asUser("doctor", async () => {
    await directMessageFixture();
    const sent = await sendSyntheticDirectMessage(
      "doctor",
      "Synthetic private content must stay in the conversation",
    );

    await switchActor("patient");
    const notices = await db.query<{
      id: string;
      kind: string;
      event_key: string;
      target_path: string;
      read_at: string | null;
    }>(
      "select id,kind,event_key,target_path,read_at from public.in_app_notifications where tenant_id=$1",
      [a],
    );
    assert.deepEqual(notices.rows, [
      {
        id: notices.rows[0].id,
        kind: "message",
        event_key: `message:${sent.message_id}`,
        target_path: `/clinicas/${a}/meu-cuidado/conversas?medico=${users.doctor.id}`,
        read_at: null,
      },
    ]);
    await denied(
      "insert into public.in_app_notifications(tenant_id,recipient_user_id,kind,event_key,target_path) values($1,$2,'message','forged','/clinicas/forged')",
      [a, users.patient.id],
    );
    await denied(
      "update public.in_app_notifications set read_at=null where id=$1",
      [notices.rows[0].id],
    );
    await denied(
      "select private.queue_in_app_notification($1,$2,'message','forged','/clinicas/' || $1::text || '/mensagens')",
      [a, users.patient.id],
    );

    const firstRead = await db.query<{ read_at: string }>(
      "select public.mark_in_app_notification_read($1,$2) read_at",
      [a, notices.rows[0].id],
    );
    const secondRead = await db.query<{ read_at: string }>(
      "select public.mark_in_app_notification_read($1,$2) read_at",
      [a, notices.rows[0].id],
    );
    assert.equal(
      String(firstRead.rows[0].read_at),
      String(secondRead.rows[0].read_at),
    );

    await db.query(
      "select public.set_in_app_notification_preference($1,false)",
      [a],
    );
    assert.deepEqual(
      (
        await db.query<{ in_app_enabled: boolean }>(
          "select in_app_enabled from public.notification_preferences where tenant_id=$1",
          [a],
        )
      ).rows,
      [{ in_app_enabled: false }],
    );
    await switchActor("doctor");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      0,
    );
    await sendSyntheticDirectMessage(
      "doctor",
      "Another private message with no notification detail",
    );
    await switchActor("patient");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      1,
    );
    await switchActor("admin");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      0,
    );
    await switchActor("other");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    const audit = await db.query<{ payload: string }>(
      "select json_agg(a)::text payload from public.audit_events a where entity_type='in_app_notifications' and entity_id=$1",
      [notices.rows[0].id],
    );
    assert.ok(
      !audit.rows[0].payload.includes(
        "Synthetic private content must stay in the conversation",
      ),
    );
  });
});

test("processing jobs are private, idempotent, leased, retried and fail closed", async () => {
  await asUser("doctor", async () => {
    await startClinical();
    const sourceKey = randomUUID();
    const first = await db.query<{ id: string }>(
      "select private.enqueue_processing_job($1,$2,'audio_transcription',$3) id",
      [a, pa, sourceKey],
    );
    const duplicate = await db.query<{ id: string }>(
      "select private.enqueue_processing_job($1,$2,'audio_transcription',$3) id",
      [a, pa, sourceKey],
    );
    assert.equal(first.rows[0].id, duplicate.rows[0].id);
    await denied(
      "select private.enqueue_processing_job($1,$2,'clinical_draft',$3)",
      [a, pa, sourceKey],
    );
    await denied(
      "select private.enqueue_processing_job($1,$2,'audio_transcription',$3)",
      [a, pb, randomUUID()],
    );
    await denied(
      "select private.enqueue_processing_job($1,$2,'audio_transcription','texto clínico não é uma chave')",
      [a, pa],
    );
    await denied(
      "insert into public.processing_jobs(tenant_id,patient_id,job_type,idempotency_key,created_by) values($1,$2,'audio_transcription',$3,$4)",
      [a, pa, randomUUID(), users.doctor.id],
    );
    await denied("select * from public.claim_next_processing_job()");

    for (const role of ["patient", "admin", "nurse", "other", "outsider", "suspended"]) {
      await switchActor(role);
      assert.equal(
        (
          await db.query(
            "select id from public.processing_jobs where tenant_id=$1",
            [a],
          )
        ).rows.length,
        0,
      );
      await denied(
        "select private.enqueue_processing_job($1,$2,'audio_transcription',$3)",
        [a, pa, randomUUID()],
      );
    }

    await switchActor("doctor");
    assert.equal(
      (
        await db.query(
          "select id from public.processing_jobs where tenant_id=$1",
          [a],
        )
      ).rows.length,
      1,
    );
    assert.deepEqual(
      (
        await db.query(
          "select idempotency_key from public.processing_jobs where id=$1",
          [first.rows[0].id],
        )
      ).rows,
      [{ idempotency_key: sourceKey }],
    );

    await db.exec("set local role service_role");
    const claimed = await db.query<{
      job_id: string;
      attempt_count: number;
      lease_token: string;
    }>("select * from public.claim_next_processing_job()");
    assert.deepEqual(
      claimed.rows.map(({ job_id, attempt_count }) => ({ job_id, attempt_count })),
      [{ job_id: first.rows[0].id, attempt_count: 1 }],
    );
    await denied(
      "select public.complete_processing_job($1,$2)",
      [claimed.rows[0].job_id, randomUUID()],
    );
    const retry = await db.query<{ status: string; available_at: unknown }>(
      "select * from public.fail_processing_job($1,$2,'retryable')",
      [claimed.rows[0].job_id, claimed.rows[0].lease_token],
    );
    assert.equal(retry.rows[0].status, "pending");
    assert.ok(retry.rows[0].available_at);

    await db.exec("reset role");
    await db.query(
      "update public.processing_jobs set available_at=clock_timestamp() where id=$1",
      [first.rows[0].id],
    );
    await db.exec("set local role service_role");
    const claimedAgain = await db.query<{
      job_id: string;
      attempt_count: number;
      lease_token: string;
    }>("select * from public.claim_next_processing_job()");
    assert.deepEqual(
      claimedAgain.rows.map(({ job_id, attempt_count }) => ({ job_id, attempt_count })),
      [{ job_id: first.rows[0].id, attempt_count: 2 }],
    );
    assert.deepEqual(
      (
        await db.query("select public.complete_processing_job($1,$2)", [
          claimedAgain.rows[0].job_id,
          claimedAgain.rows[0].lease_token,
        ])
      ).rows,
      [{ complete_processing_job: true }],
    );

    await switchActor("doctor");
    const expiring = await db.query<{ id: string }>(
      "select private.enqueue_processing_job($1,$2,'clinical_draft',$3) id",
      [a, pa, randomUUID()],
    );
    await db.exec("set local role service_role");
    const firstLease = await db.query<{
      job_id: string;
      attempt_count: number;
      lease_token: string;
    }>("select * from public.claim_next_processing_job()");
    assert.equal(firstLease.rows[0].job_id, expiring.rows[0].id);
    await db.exec("reset role");
    await db.query(
      "update public.processing_jobs set last_started_at=clock_timestamp() - interval '6 minutes', lease_expires_at=clock_timestamp() - interval '1 second' where id=$1",
      [expiring.rows[0].id],
    );
    await db.exec("set local role service_role");
    const reclaimed = await db.query<{
      job_id: string;
      attempt_count: number;
      lease_token: string;
    }>("select * from public.claim_next_processing_job()");
    assert.equal(reclaimed.rows[0].job_id, expiring.rows[0].id);
    assert.equal(reclaimed.rows[0].attempt_count, 2);
    const failed = await db.query<{ status: string }>(
      "select * from public.fail_processing_job($1,$2,'permanent')",
      [reclaimed.rows[0].job_id, reclaimed.rows[0].lease_token],
    );
    assert.equal(failed.rows[0].status, "failed");

    await switchActor("doctor");
    const states = await db.query<{ status: string }>(
      "select status from public.processing_jobs where tenant_id=$1 order by created_at,id",
      [a],
    );
    assert.deepEqual(states.rows, [{ status: "completed" }, { status: "failed" }]);
    await denied(
      "update public.processing_jobs set job_type='clinical_draft' where id=$1",
      [first.rows[0].id],
    );

    await db.exec("reset role");
    const audit = await db.query<{ payload: string }>(
      "select json_agg(a)::text payload from public.audit_events a where entity_type='processing_jobs'",
    );
    assert.ok(!audit.rows[0].payload.includes(sourceKey));
  });
});

test("plan publication creates a generic notice only for the linked patient", async () => {
  await asUser("doctor", async () => {
    const plan = await publicationFixture();
    const version = await approveFixture(
      plan,
      1,
      "Synthetic private guidance must stay in the publication",
    );
    const firstPublication = await publishFixture(plan, version);

    await switchActor("patient");
    const notices = await db.query<{
      id: string;
      kind: string;
      event_key: string;
      target_path: string;
    }>(
      "select id,kind,event_key,target_path from public.in_app_notifications where tenant_id=$1",
      [a],
    );
    assert.deepEqual(notices.rows, [
      {
        id: notices.rows[0].id,
        kind: "plan_published",
        event_key: `plan-publication:${firstPublication}`,
        target_path: `/clinicas/${a}/meu-cuidado/plano`,
      },
    ]);
    await db.query(
      "select public.set_in_app_notification_preference($1,false)",
      [a],
    );
    await switchActor("doctor");
    await db.query(
      "update public.care_plans set status='draft',expected_version=$2 where id=$1",
      [plan, version],
    );
    const nextVersion = await approveFixture(plan, version + 1);
    await publishFixture(plan, nextVersion, firstPublication);
    await switchActor("patient");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      1,
    );
    await switchActor("admin");
    assert.equal(
      (
        await db.query(
          "select id from public.in_app_notifications where tenant_id=$1",
          [a],
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    const audit = await db.query<{ payload: string }>(
      "select json_agg(a)::text payload from public.audit_events a where entity_type='in_app_notifications' and entity_id=$1",
      [notices.rows[0].id],
    );
    assert.ok(
      !audit.rows[0].payload.includes(
        "Synthetic private guidance must stay in the publication",
      ),
    );
  });
});

test("verified patient invitation acceptance atomically creates identity, active self-doctor care and onboarding", async () => {
  await asUser("outsider", async () => {
    await db.exec("reset role");
    await db.query("update auth.users set email='new.patient@example.com',email_confirmed_at=clock_timestamp() where id=$1", [users.outsider.id]);
    const invitation = await db.query<{ id: string }>(
      "insert into public.patient_invitations(tenant_id,display_name,channel,recipient_email,doctor_id,invited_by,delivery_status) values($1,'New Patient','email','new.patient@example.com',$2,$2,'requested') returning id",
      [a, users.doctor.id],
    );
    await switchActor("outsider");
    const accepted = await db.query<{ patient_id: string }>("select patient_id from public.accept_patient_invitation($1,true)", [invitation.rows[0].id]);
    assert.equal(accepted.rows.length, 1);
    const patient = accepted.rows[0].patient_id;
    assert.deepEqual((await db.query<{ role: string; status: string }>("select role,status from public.memberships where tenant_id=$1 and user_id=$2", [a, users.outsider.id])).rows, [{ role: "patient", status: "active" }]);
    await db.exec("reset role");
    assert.deepEqual((await db.query<{ status: string }>("select status from public.care_relationships where tenant_id=$1 and patient_id=$2", [a, patient])).rows, [{ status: "active" }]);
    await switchActor("outsider");
    assert.deepEqual((await db.query<{ status: string; questionnaire_version: string }>("select status,questionnaire_version from public.patient_onboarding where tenant_id=$1", [a])).rows, [{ status: "draft", questionnaire_version: "vivance-preconsulta-v1" }]);
  });
});

test("admin-assigned invitation keeps doctor acceptance pending and fails closed when identities change", async () => {
  await asUser("outsider", async () => {
    await db.exec("reset role");
    await db.query("update auth.users set email='assigned.patient@example.com',email_confirmed_at=clock_timestamp() where id=$1", [users.outsider.id]);
    const invitation = await db.query<{ id: string }>(
      "insert into public.patient_invitations(tenant_id,display_name,channel,recipient_email,doctor_id,invited_by,delivery_status) values($1,'Assigned Patient','email','assigned.patient@example.com',$2,$3,'requested') returning id",
      [a, users.doctor.id, users.admin.id],
    );
    await switchActor("outsider");
    const accepted = await db.query<{ patient_id: string }>("select patient_id from public.accept_patient_invitation($1,true)", [invitation.rows[0].id]);
    await db.exec("reset role");
    assert.equal((await db.query<{ status: string }>("select status from public.care_relationships where patient_id=$1", [accepted.rows[0].patient_id])).rows[0].status, "assigned");
  });
  await asUser("outsider", async () => {
    await db.exec("reset role");
    await db.query("update auth.users set email='unclaimed@example.com',email_confirmed_at=clock_timestamp() where id=$1", [users.outsider.id]);
    const invitation = await db.query<{ id: string }>(
      "insert into public.patient_invitations(tenant_id,display_name,channel,recipient_phone,token_hash,doctor_id,invited_by) values($1,'Unclaimed','whatsapp','+5511999999999',$3,$2,$2) returning id",
      [a, users.doctor.id, "a".repeat(64)],
    );
    await switchActor("outsider");
    await denied("select * from public.accept_patient_invitation($1,true)", [invitation.rows[0].id]);
    await db.exec("reset role");
    assert.equal((await db.query("select id from public.patients where display_name='Unclaimed'")).rows.length, 0);
  });
});

test("onboarding draft is patient-private, versioned and exposes immutable consented submission only to active care", async () => {
  await asUser("outsider", async () => {
    await db.exec("reset role");
    await db.query("update auth.users set email='onboarding@example.com',email_confirmed_at=clock_timestamp() where id=$1", [users.outsider.id]);
    const invitation = await db.query<{ id: string }>(
      "insert into public.patient_invitations(tenant_id,display_name,channel,recipient_email,doctor_id,invited_by) values($1,'Onboarding Patient','email','onboarding@example.com',$2,$2) returning id",
      [a, users.doctor.id],
    );
    await switchActor("outsider");
    const accepted = await db.query<{ patient_id: string }>("select patient_id from public.accept_patient_invitation($1,true)", [invitation.rows[0].id]);
    const patient = accepted.rows[0].patient_id;
    await db.exec("set local role service_role");
    const document = await db.query<{ document_id: string; storage_path: string }>("select * from public.reserve_patient_document($1,$2,$3,'exam.pdf','application/pdf',6,'exam','internal')", [a, patient, users.outsider.id]);
    await db.exec("reset role");
    await db.query("insert into storage.objects(bucket_id,name) values('vivance-documents',$1)", [document.rows[0].storage_path]);
    await db.exec("set local role service_role");
    await db.query("select public.complete_patient_document($1,$2,$3)", [a, document.rows[0].document_id, users.outsider.id]);
    await switchActor("doctor");
    assert.equal((await db.query("select id from public.patient_onboarding_submissions where patient_id=$1", [patient])).rows.length, 0);
    assert.equal((await db.query("select id from public.patient_documents where id=$1", [document.rows[0].document_id])).rows.length, 0);
    assert.equal((await db.query("select name from storage.objects where name=$1", [document.rows[0].storage_path])).rows.length, 0);
    await switchActor("outsider");
    await db.query("update public.patient_onboarding set current_step='review',answer_goal='Synthetic goal',exam_document_ids=$3,expected_version=1 where tenant_id=$1 and patient_id=$2", [a, patient, [document.rows[0].document_id]]);
    await denied("update public.patient_onboarding set answer_goal='stale',expected_version=1 where tenant_id=$1 and patient_id=$2", [a, patient]);
    await db.query("select public.submit_patient_onboarding($1,2,true)", [a]);
    assert.equal((await db.query("update public.patient_onboarding set answer_goal='changed',expected_version=3 where tenant_id=$1 and patient_id=$2 returning patient_id", [a, patient])).rows.length, 0);
    await switchActor("doctor");
    assert.equal((await db.query<{ answer_goal: string }>("select answer_goal from public.patient_onboarding_submissions where patient_id=$1", [patient])).rows[0].answer_goal, "Synthetic goal");
    assert.equal((await db.query("select id from public.patient_documents where id=$1", [document.rows[0].document_id])).rows.length, 1);
    assert.equal((await db.query("select name from storage.objects where name=$1", [document.rows[0].storage_path])).rows.length, 1);
    await switchActor("admin");
    assert.equal((await db.query("select patient_id from public.patient_onboarding_submissions where patient_id=$1", [patient])).rows.length, 0);
    await db.exec("reset role");
    await db.query("update public.care_relationships set status='revoked' where tenant_id=$1 and patient_id=$2", [a, patient]);
    await switchActor("doctor");
    assert.equal((await db.query("select patient_id from public.patient_onboarding_submissions where patient_id=$1", [patient])).rows.length, 0);
    assert.equal((await db.query("select name from storage.objects where name=$1", [document.rows[0].storage_path])).rows.length, 0);
    await db.exec("reset role");
    await db.query("delete from auth.sessions where id=$1", [users.outsider.session]);
    await switchActor("outsider");
    assert.equal((await db.query("select patient_id from public.patient_onboarding where tenant_id=$1", [a])).rows.length, 0);
    await denied("select public.submit_patient_onboarding($1,3,true)", [a]);
    await db.exec("reset role");
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [users.outsider.session, users.outsider.id]);
    await db.query("update public.memberships set status='suspended' where tenant_id=$1 and user_id=$2", [a, users.outsider.id]);
    await switchActor("outsider");
    assert.equal((await db.query("select patient_id from public.patient_onboarding where tenant_id=$1", [a])).rows.length, 0);
    await denied("select public.submit_patient_onboarding($1,3,true)", [a]);
  });
});

test("patient invitation revocation is creator-or-admin controlled and consumes WhatsApp token", async () => {
  await asUser("doctor", async () => {
    await db.exec("reset role");
    const invitation = await db.query<{ id: string }>(
      "insert into public.patient_invitations(tenant_id,display_name,channel,recipient_phone,token_hash,doctor_id,invited_by) values($1,'Revoked Patient','whatsapp','+5511888888888',$3,$2,$2) returning id",
      [a, users.doctor.id, "b".repeat(64)],
    );
    await switchActor("outsider");
    await denied("select public.revoke_patient_invitation($1,$2)", [a, invitation.rows[0].id]);
    await switchActor("doctor");
    assert.equal((await db.query<{ revoked: boolean }>("select public.revoke_patient_invitation($1,$2) revoked", [a, invitation.rows[0].id])).rows[0].revoked, true);
    await db.exec("reset role");
    assert.deepEqual((await db.query<{ status: string; token_hash: string | null }>("select status,token_hash from public.patient_invitations where id=$1", [invitation.rows[0].id])).rows, [{ status: "revoked", token_hash: null }]);
    const adminTarget = await db.query<{ id: string }>(
      "insert into public.patient_invitations(tenant_id,display_name,channel,recipient_phone,token_hash,doctor_id,invited_by) values($1,'Admin Revoke','whatsapp','+5511777777777',$3,$2,$2) returning id",
      [a, users.doctor.id, "c".repeat(64)],
    );
    await switchActor("admin");
    assert.equal((await db.query<{ revoked: boolean }>("select public.revoke_patient_invitation($1,$2) revoked", [a, adminTarget.rows[0].id])).rows[0].revoked, true);
  });
});
