import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

type LinkOptions = {
  hash?: string;
  search?: string;
  returnedUserId?: string;
};

async function openFirstAccessLink(options: LinkOptions = {}) {
  const calls: string[] = [];
  const states: unknown[] = [];
  const effects: Array<() => void> = [];
  let stateIndex = 0;
  const incomingUser = { id: "invited-patient", email: "patient@example.test" };
  const authenticatedUser = {
    ...incomingUser,
    id: options.returnedUserId ?? incomingUser.id,
  };
  const client = {
    auth: {
      setSession: async () => {
        calls.push("setSession");
        return { data: { user: incomingUser }, error: null };
      },
      exchangeCodeForSession: async () => {
        calls.push("exchangeCodeForSession");
        return { data: { user: incomingUser }, error: null };
      },
      getUser: async () => {
        calls.push("getUser");
        return { data: { user: authenticatedUser }, error: null };
      },
    },
  };
  const source = readFileSync(
    new URL("../components/first-access.tsx", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const sandboxModule = { exports: {} as { FirstAccess?: () => unknown } };
  const dependencies: Record<string, unknown> = {
    react: {
      useEffect: (effect: () => void) => effects.push(effect),
      useRef: (value: unknown) => ({ current: value }),
      useState: (initial: unknown) => {
        const index = stateIndex++;
        states[index] = initial;
        return [initial, (value: unknown) => { states[index] = value; }];
      },
    },
    "next/link": { default: () => null },
    "@/lib/supabase/browser": { createClient: () => client },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
  };
  const window = {
    location: { hash: options.hash ?? "", search: options.search ?? "" },
    history: { replaceState: () => calls.push("clearUrl") },
  };
  runInNewContext(code, {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: (name: string) => dependencies[name],
    window,
    URLSearchParams,
    FormData,
  });
  assert.ok(sandboxModule.exports.FirstAccess);
  sandboxModule.exports.FirstAccess();
  effects.forEach((effect) => effect());
  await new Promise<void>((resolve) => setImmediate(resolve));
  return { calls, states };
}

test("a pre-existing browser session alone cannot open the password form", async () => {
  const result = await openFirstAccessLink();
  assert.deepEqual(result.calls, ["clearUrl"]);
  assert.equal(result.states[1], false);
  assert.match(String(result.states[3]), /link está inválido/);
});

test("an invite link establishes and verifies its own account", async () => {
  const result = await openFirstAccessLink({
    hash: "#access_token=invite-token&refresh_token=refresh-token&type=invite",
  });
  assert.deepEqual(result.calls, ["clearUrl", "setSession", "getUser"]);
  assert.equal(result.states[0], "patient@example.test");
  assert.equal(result.states[1], true);
});

test("a recovery link also establishes and verifies its own account", async () => {
  const result = await openFirstAccessLink({
    hash: "#access_token=recovery-token&refresh_token=refresh-token&type=recovery",
  });
  assert.deepEqual(result.calls, ["clearUrl", "setSession", "getUser"]);
  assert.equal(result.states[1], true);
});

test("a PKCE code can open the form after exchanging and verifying it", async () => {
  const result = await openFirstAccessLink({ search: "?code=one-time-code" });
  assert.deepEqual(result.calls, ["clearUrl", "exchangeCodeForSession", "getUser"]);
  assert.equal(result.states[1], true);
});

test("mixed credentials and a different existing account cannot open the form", async () => {
  const mixed = await openFirstAccessLink({
    hash: "#access_token=invite-token&refresh_token=refresh-token&type=invite",
    search: "?code=other-code",
  });
  assert.deepEqual(mixed.calls, ["clearUrl"]);
  assert.equal(mixed.states[1], false);

  const switched = await openFirstAccessLink({
    hash: "#access_token=invite-token&refresh_token=refresh-token&type=invite",
    returnedUserId: "signed-in-doctor",
  });
  assert.deepEqual(switched.calls, ["clearUrl", "setSession", "getUser"]);
  assert.equal(switched.states[1], false);
  assert.match(String(switched.states[3]), /link está inválido/);
});
