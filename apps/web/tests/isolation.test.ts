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
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, banned_until timestamptz, deleted_at timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users, not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to anon, authenticated;
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
      "insert into public.memberships(tenant_id,user_id,role,status) values($1,$2,$3,$4)",
      [
        name === "other" ? b : a,
        u.id,
        ["other", "suspended"].includes(name) ? "doctor" : name,
        name === "suspended" ? "suspended" : "active",
      ],
    );
  }
  await db.query(
    "insert into public.patients(id,tenant_id,display_name,created_by) values ($1,$2,'Synthetic A',$3),($4,$5,'Synthetic B',$6)",
    [pa, a, users.admin.id, pb, b, users.other.id],
  );
});
after(async () => {
  await db.close();
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
        /foreign key|Active doctor required/,
      );
    });
});
test("agenda rejects anonymous, patient, outsider, suspended and cross-tenant writes", async () => {
  for (const role of ["patient", "outsider", "suspended", "other"])
    await asUser(role, async () => {
      await assert.rejects(book(), /row-level security|Active doctor required/);
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
      "update public.appointments set starts_at='2099-09-10T14:00Z', ends_at='2099-09-10T14:30Z' where id=$1 and version=1 returning version",
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
    await db.query(
      "update public.appointments set status='cancelled' where id=$1",
      [created.id],
    );
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
      db.query(
        "update public.appointments set status='scheduled' where id=$1",
        [created.id],
      ),
      /immutable/,
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
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.appointments set status='cancelled' returning id",
        )
      ).rows.length,
      0,
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
      "insert into public.memberships(tenant_id,user_id,role) values($1,$2,'doctor')",
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
    assert.equal(
      (
        await db.query(
          "update public.appointments set status='cancelled' where id=$1 returning id",
          [colleague.id],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(book(), /exclusion constraint/);
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
async function startClinical() {
  const appointment = await book();
  const values = [a, appointment.id];
  const result = await db.query<{ id: string }>(
    "select public.start_encounter($1,$2,true) as id",
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
    await denied("select public.start_encounter($1,$2,false)", [
      a,
      appointment.id,
    ]);
    const first = await db.query<{ id: string }>(
      "select public.start_encounter($1,$2,true) id",
      [a, appointment.id],
    );
    const second = await db.query<{ id: string }>(
      "select public.start_encounter($1,$2,true) id",
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
      "insert into public.care_relationships(tenant_id,patient_id,professional_id) values($1,$2,$3)",
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
      await denied("select public.start_encounter($1,$2,true)", [
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
      "insert into public.care_relationships(tenant_id,patient_id,professional_id) values($1,$2,$3)",
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
    await denied("select public.start_encounter($1,$2,true)", [a, appointment]);
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
      "update public.appointments set status='cancelled' where id=$1",
      [appointment],
    );
    await denied(
      "update public.appointments set starts_at=starts_at+interval '1 hour',ends_at=ends_at+interval '1 hour' where id=$1",
      [appointment],
    );
  });
  await asUser("doctor", async () => {
    const appointment = await book();
    await db.query(
      "update public.appointments set status='cancelled' where id=$1",
      [appointment.id],
    );
    await denied("select public.start_encounter($1,$2,true)", [
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
