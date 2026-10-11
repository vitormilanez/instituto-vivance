import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

type Options = {
  lookupFailure?: boolean;
  sendFailure?: boolean;
  existing?: boolean;
  pendingActivation?: boolean;
  metadataFailure?: boolean;
  invalidRedirect?: boolean;
  fullLookup?: boolean;
  revokeFailure?: boolean;
};

async function invite(options: Options = {}) {
  const updates: Record<string, unknown>[] = [];
  let mailCalls = 0;
  let mailOptions: Record<string, unknown> | undefined;
  const metadataUpdates: unknown[] = [];
  let lookupCalls = 0;
  let handler: (request: Request) => Promise<Response> = async () => new Response();
  const doctorId = "11111111-1111-4111-8111-111111111111";
  const tenantId = "22222222-2222-4222-8222-222222222222";
  const invitation = {
    id: "33333333-3333-4333-8333-333333333333",
    tenant_id: tenantId,
    display_name: "Paciente Teste",
    channel: "email",
    status: "pending",
    doctor_id: doctorId,
    expires_at: "2026-10-17T00:00:00Z",
    created_at: "2026-10-10T00:00:00Z",
    delivery_status: "requested",
  };
  const userClient = {
    auth: { getUser: async () => ({ data: { user: { id: doctorId } }, error: null }) },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { role: "doctor", status: "active" }, error: null }),
      };
      return query;
    },
  };
  const admin = {
    auth: { admin: {
      listUsers: async () => {
        lookupCalls++;
        return options.lookupFailure
          ? { data: { users: [] }, error: { code: "auth_unavailable" } }
          : { data: { users: options.existing || options.pendingActivation
            ? [{ id: "pending-user", user_metadata: { vivance_invite_kind: "patient", vivance_doctor_id: "forged-or-old-doctor", display_name: "Preserved" }, email: "patient@example.test", email_confirmed_at: options.pendingActivation ? null : "2026-10-01T00:00:00Z", invited_at: "2026-10-01T00:00:00Z" }]
            : options.fullLookup ? Array.from({ length: 1000 }, () => ({ email: "other@example.test" })) : [] }, error: null };
      },
      updateUserById: async (id: string, attributes: unknown) => {
        metadataUpdates.push({ id, attributes });
        return { error: options.metadataFailure ? { code: "metadata_failed" } : null };
      },
      inviteUserByEmail: async (_email: string, inviteOptions: Record<string, unknown>) => {
        mailOptions = inviteOptions;
        mailCalls++;
        return { error: options.sendFailure ? { code: "smtp_failed" } : null };
      },
    } },
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: invitation, error: null }) }) }),
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        const query = { eq: () => query, then: (resolve: (value: unknown) => void) => resolve({ error: options.revokeFailure && values.status === "revoked" ? { code: "database_unavailable" } : null }) };
        return query;
      },
    }),
  };
  const source = readFileSync(new URL("../../../supabase/functions/invite-patient/index.ts", import.meta.url), "utf8").replace(/^import .*;\n/gm, "");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, {
    createClient: (_url: string, key: string) => key === "service-test" ? admin : userClient,
    Request, Response, URL, crypto, TextEncoder,
    Deno: { env: { get: (name: string) => ({
      SUPABASE_URL: "https://example.test",
      SUPABASE_ANON_KEY: "publishable-test",
      SUPABASE_SERVICE_ROLE_KEY: "service-test",
      PATIENT_INVITE_REDIRECT_URL: options.invalidRedirect ? "" : "https://institutovivance.app/primeiro-acesso",
    } as Record<string, string>)[name] }, serve: (next: typeof handler) => { handler = next; } },
  });
  const result = await handler(new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-session" },
    body: JSON.stringify({ tenantId, displayName: "Paciente Teste", channel: "email", email: "patient@example.test" }),
  }));
  return { result, updates, mailCalls, lookupCalls, mailOptions, metadataUpdates };
}

test("Auth lookup failure revokes the pending invite and never sends email", async () => {
  const { result, updates, mailCalls } = await invite({ lookupFailure: true });
  assert.equal(result.status, 503);
  assert.match((await result.json()).error, /não foi enviado/);
  assert.equal(mailCalls, 0);
  assert.equal(updates.at(-1)?.status, "revoked");
  assert.equal(updates.at(-1)?.delivery_status, "failed");
});

test("an incomplete Auth lookup cannot assume an account is new", async () => {
  const { result, updates, mailCalls, lookupCalls } = await invite({ fullLookup: true });
  assert.equal(result.status, 503);
  assert.equal(lookupCalls, 5);
  assert.equal(mailCalls, 0);
  assert.equal(updates.at(-1)?.status, "revoked");
});

test("invalid redirect or mail failure revokes the invite and returns 503", async () => {
  for (const options of [{ invalidRedirect: true }, { sendFailure: true }]) {
    const { result, updates, mailCalls } = await invite(options);
    assert.equal(result.status, 503);
    assert.equal(mailCalls, options.sendFailure ? 1 : 0);
    assert.equal(updates.at(-1)?.status, "revoked");
    assert.equal(updates.at(-1)?.delivery_status, "failed");
  }
});

test("a failed revocation tells the doctor the pending invite needs cancellation", async () => {
  const { result, mailCalls } = await invite({ sendFailure: true, revokeFailure: true });
  assert.equal(result.status, 503);
  assert.equal(mailCalls, 1);
  assert.match((await result.json()).error, /cancelar o convite pendente/);
});

test("new-account mail request and existing-account invite remain successful", async () => {
  const fresh = await invite();
  assert.equal(fresh.result.status, 201);
  assert.equal(fresh.mailCalls, 1);
  assert.equal(JSON.stringify(fresh.mailOptions), JSON.stringify({ redirectTo: "https://institutovivance.app/primeiro-acesso", data: { vivance_invite_kind: "patient", vivance_doctor_id: "11111111-1111-4111-8111-111111111111" } }));
  assert.equal(fresh.updates.length, 0);

  const existing = await invite({ existing: true });
  assert.equal(existing.result.status, 201);
  assert.equal(existing.mailCalls, 0);
  assert.equal(existing.updates.at(-1)?.delivery_status, "not_applicable");
  assert.equal((await existing.result.json()).invitation.delivery.accountStatus, "active");
});

test("an unactivated account requests a fresh activation invite rather than skipping email", async () => {
  const pending = await invite({ pendingActivation: true });
  assert.equal(pending.result.status, 201);
  assert.equal(pending.mailCalls, 1);
  assert.equal(JSON.stringify(pending.metadataUpdates), JSON.stringify([{ id: "pending-user", attributes: { user_metadata: { vivance_invite_kind: "patient", vivance_doctor_id: "11111111-1111-4111-8111-111111111111", display_name: "Preserved" } } }]));
  assert.equal(pending.updates.length, 0);
  const payload = await pending.result.json();
  assert.equal(payload.invitation.delivery.status, "requested");
  assert.equal(payload.invitation.delivery.accountStatus, "pending_activation");
});

test("failed activation resend revokes the invitation instead of reporting success", async () => {
  const { result, updates, mailCalls } = await invite({ pendingActivation: true, sendFailure: true });
  assert.equal(result.status, 503);
  assert.equal(mailCalls, 1);
  assert.equal(updates.at(-1)?.status, "revoked");
});

test("presentation update failure cannot send mail attributed to an old doctor", async () => {
  const pending = await invite({ pendingActivation: true, metadataFailure: true });
  assert.equal(pending.result.status, 503);
  assert.equal(pending.mailCalls, 0);
  assert.equal(pending.updates.at(-1)?.status, "revoked");
});
