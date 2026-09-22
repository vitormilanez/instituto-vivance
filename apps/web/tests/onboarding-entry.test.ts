import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(
  new URL("../../../supabase/config.toml", import.meta.url),
  "utf8",
);
const claimFunction = readFileSync(
  new URL(
    "../../../supabase/functions/claim-patient-invitation/index.ts",
    import.meta.url,
  ),
  "utf8",
);
const onboardingWorkspace = readFileSync(
  new URL("../components/onboarding-workspace.tsx", import.meta.url),
  "utf8",
);
const invitationClaim = readFileSync(
  new URL("../components/patient-invitation-claim.tsx", import.meta.url),
  "utf8",
);

test("only the token-protected patient claim function is public", () => {
  assert.match(
    config,
    /\[functions\.claim-patient-invitation\]\s+verify_jwt = false/,
  );
  assert.match(
    config,
    /\[functions\.invite-patient\]\s+verify_jwt = true/,
  );
  assert.equal(config.match(/verify_jwt = false/g)?.length, 1);
});

test("a recoverable claim failure restores the opaque token", () => {
  assert.match(claimFunction, /async function releaseClaim\(\)/);
  assert.match(claimFunction, /recipient_email: null/);
  assert.match(claimFunction, /token_hash: tokenHash/);
  assert.match(claimFunction, /claimed_at: null/);
  assert.match(claimFunction, /delivery_status: "failed"/);
  assert.match(
    claimFunction,
    /\.eq\("id", claimedId\)[\s\S]*\.eq\("recipient_email", email\)[\s\S]*\.eq\("status", "pending"\)[\s\S]*\.is\("token_hash", null\)/,
  );
  assert.match(
    claimFunction,
    /if \(listed\.error\) \{\s+await releaseClaim/,
  );
  assert.match(
    claimFunction,
    /if \(!redirectTo\) \{\s+await releaseClaim/,
  );
  assert.match(
    claimFunction,
    /if \(invitation\.error\) \{[\s\S]*await releaseClaim\(\)/,
  );
  assert.match(claimFunction, /"email_exists", "user_already_exists"/);
  assert.match(invitationClaim, /onClick=\{\(\) => setSent\(false\)\}/);
  assert.match(invitationClaim, /Não recebeu\? Tentar novamente/);
});

test("multiple exam uploads persist each successful file before continuing", () => {
  // Um arquivo por vez: marca o estado dele, envia, persiste a associação ao
  // cadastro e só então passa para o próximo — um arquivo que falha não
  // derruba os que já foram enviados.
  assert.match(
    onboardingWorkspace,
    /for \(const item of items\) \{\s+dispatch\(\{ type: "sending", key: item\.key \}\);[\s\S]*await onComplete\(\[documentId\]\);\s+dispatch\(\{ type: "sent", key: item\.key \}\);/,
  );
  assert.match(
    onboardingWorkspace,
    /if \(!\(await persist\(\)\)\)[\s\S]*falta salvar sua associação/,
  );
});
