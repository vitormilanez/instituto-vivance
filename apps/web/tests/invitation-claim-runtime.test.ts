import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Options = { available?: boolean; existing?: boolean; mailFailure?: boolean; pendingActivation?: boolean; fullLookup?: boolean; metadataFailure?: boolean; pendingEmailConflict?: boolean };
async function claim(options: Options) {
  const updates: Record<string, unknown>[] = [];
  let mailCalls = 0;
  let mailOptions: Record<string, unknown> | undefined;
  const metadataUpdates: unknown[] = [];
  let handler: (request: Request) => Promise<Response> = async () => new Response();
  const admin = {
    from: () => ({ update(values: Record<string, unknown>) {
      updates.push(values);
      const query = { eq: () => query, gt: () => query, is: () => query, select: () => query,
        maybeSingle: async () => options.pendingEmailConflict
          ? ({ data: null, error: { code: "23505" } })
          : ({ data: options.available === false ? null : { id: "invitation", doctor_id: "verified-invitation-doctor" }, error: null }),
        then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
      return query;
    }}),
    auth: { admin: {
      listUsers: async () => ({ data: { users: options.existing || options.pendingActivation ? [{ id: "pending-user", user_metadata: { vivance_invite_kind: "patient", vivance_doctor_id: "forged-or-old-doctor", display_name: "Preserved" }, email: "patient@example.test", email_confirmed_at: options.pendingActivation ? null : "2026-10-01T00:00:00Z" }] : options.fullLookup ? Array.from({ length: 1000 }, () => ({ email: "other@example.test" })) : [] }, error: null }),
      updateUserById: async (id: string, attributes: unknown) => { metadataUpdates.push({ id, attributes }); return { error: options.metadataFailure ? { code: "metadata_failed" } : null }; },
      inviteUserByEmail: async (_email: string, inviteOptions: Record<string, unknown>) => { mailCalls++; mailOptions = inviteOptions; return { error: options.mailFailure ? { code: "smtp_failed" } : null }; },
    }},
  };
  const source = readFileSync(new URL("../../../supabase/functions/claim-patient-invitation/index.ts", import.meta.url), "utf8").replace(/^import .*;\n/gm, "");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { createClient: () => admin, Request, Response, URL, crypto, TextEncoder,
    Deno: { env: { get: (name: string) => ({ SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test-only", PATIENT_INVITE_REDIRECT_URL: "https://institutovivance.app/primeiro-acesso" }[name]) }, serve: (next: typeof handler) => { handler = next; } },
  });
  const response = await handler(new Request("https://example.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "a".repeat(43), email: "patient@example.test" }) }));
  return { response, updates, mailCalls, mailOptions, metadataUpdates };
}
test("removed invitations do not pretend that email was requested", async () => {
  const { response, mailCalls } = await claim({ available: false });
  assert.equal(response.status, 410);
  assert.match((await response.json()).error, /convite por e-mail/);
  assert.equal(mailCalls, 0);
});
test("pending email invitation returns a recoverable conflict without consuming the WhatsApp claim", async () => {
  const { response, updates, mailCalls, metadataUpdates } = await claim({ pendingEmailConflict: true });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "Já existe um convite por e-mail aguardando ativação para este endereço.",
    code: "email_invitation_pending",
  });
  assert.equal(updates.length, 1);
  assert.equal(mailCalls, 0);
  assert.equal(metadataUpdates.length, 0);
});
test("existing account proceeds without sending another email", async () => {
  const { response, updates, mailCalls } = await claim({ existing: true });
  assert.equal(response.status, 202);
  assert.equal(mailCalls, 0);
  assert.equal(updates.at(-1)?.delivery_status, "not_applicable");
});
test("mail failure returns retry feedback and restores the invitation", async () => {
  const { response, updates } = await claim({ mailFailure: true });
  assert.equal(response.status, 503);
  assert.equal(updates.at(-1)?.recipient_email, null);
  assert.equal(typeof updates.at(-1)?.token_hash, "string");
});
test("new account requests access email", async () => {
  const { response, mailCalls, mailOptions } = await claim({});
  assert.equal(response.status, 202);
  assert.equal(mailCalls, 1);
  assert.equal(JSON.stringify(mailOptions), JSON.stringify({ redirectTo: "https://institutovivance.app/primeiro-acesso", data: { vivance_invite_kind: "patient", vivance_doctor_id: "verified-invitation-doctor" } }));
});

test("unactivated account resends activation while keeping the public response generic", async () => {
  const { response, updates, mailCalls, metadataUpdates } = await claim({ pendingActivation: true });
  assert.equal(response.status, 202);
  assert.equal(mailCalls, 1);
  assert.equal(JSON.stringify(metadataUpdates), JSON.stringify([{ id: "pending-user", attributes: { user_metadata: { vivance_invite_kind: "patient", vivance_doctor_id: "verified-invitation-doctor", display_name: "Preserved" } } }]));
  assert.equal(updates.at(-1)?.delivery_status, "requested");
  assert.deepEqual(await response.json(), { verificationRequested: true });
});

test("activation resend failure restores the one-time link for retry", async () => {
  const { response, updates } = await claim({ pendingActivation: true, mailFailure: true });
  assert.equal(response.status, 503);
  assert.equal(updates.at(-1)?.recipient_email, null);
  assert.equal(typeof updates.at(-1)?.token_hash, "string");
});

test("incomplete account lookup restores the link without sending email", async () => {
  const { response, updates, mailCalls } = await claim({ fullLookup: true });
  assert.equal(response.status, 503);
  assert.equal(mailCalls, 0);
  assert.equal(updates.at(-1)?.recipient_email, null);
});

test("presentation update failure restores the claim without sending misleading mail", async () => {
  const { response, updates, mailCalls } = await claim({ pendingActivation: true, metadataFailure: true });
  assert.equal(response.status, 503);
  assert.equal(mailCalls, 0);
  assert.equal(updates.at(-1)?.recipient_email, null);
});
