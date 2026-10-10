import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Options = { available?: boolean; existing?: boolean; mailFailure?: boolean };
async function claim(options: Options) {
  const updates: Record<string, unknown>[] = [];
  let mailCalls = 0;
  let handler: (request: Request) => Promise<Response> = async () => new Response();
  const admin = {
    from: () => ({ update(values: Record<string, unknown>) {
      updates.push(values);
      const query = { eq: () => query, gt: () => query, is: () => query, select: () => query,
        maybeSingle: async () => ({ data: options.available === false ? null : { id: "invitation" }, error: null }),
        then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
      return query;
    }}),
    auth: { admin: {
      listUsers: async () => ({ data: { users: options.existing ? [{ email: "patient@example.test" }] : [] }, error: null }),
      inviteUserByEmail: async () => { mailCalls++; return { error: options.mailFailure ? { code: "smtp_failed" } : null }; },
    }},
  };
  const source = readFileSync(new URL("../../../supabase/functions/claim-patient-invitation/index.ts", import.meta.url), "utf8").replace(/^import .*;\n/gm, "");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { createClient: () => admin, Request, Response, URL, crypto, TextEncoder,
    Deno: { env: { get: (name: string) => ({ SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test-only", PATIENT_INVITE_REDIRECT_URL: "https://institutovivance.app/primeiro-acesso" }[name]) }, serve: (next: typeof handler) => { handler = next; } },
  });
  const response = await handler(new Request("https://example.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "a".repeat(43), email: "patient@example.test" }) }));
  return { response, updates, mailCalls };
}
test("removed invitations do not pretend that email was requested", async () => {
  const { response, mailCalls } = await claim({ available: false });
  assert.equal(response.status, 410);
  assert.match((await response.json()).error, /novo link/);
  assert.equal(mailCalls, 0);
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
  const { response, mailCalls } = await claim({});
  assert.equal(response.status, 202);
  assert.equal(mailCalls, 1);
});
