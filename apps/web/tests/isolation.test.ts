// Synthetic fixtures exist ONLY in an ephemeral, in-process PostgreSQL engine.
// This suite never connects to the Supabase project or creates real Auth accounts.
import { PGlite } from "@electric-sql/pglite";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const db = new PGlite();
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
    create table auth.users(id uuid primary key, banned_until timestamptz, deleted_at timestamptz);
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
