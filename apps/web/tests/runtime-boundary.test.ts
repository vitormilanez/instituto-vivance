import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function sources(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(path, e.name))
      : /\.(ts|tsx)$/.test(e.name)
        ? [join(path, e.name)]
        : [],
  );
}
test("native runtime does not import the Cloudflare prototype or demonstration providers", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  // These reviewed RPC adapters handle private transcript/OAuth/workflow tables.
  // The credential is server-only; every call rechecks a live actor session.
  const privateRpcAdapters = new Set([
    join(root, "modules/google-meet/service.ts"),
    join(root, "modules/browser-transcripts/service.ts"),
    join(root, "modules/consultation-workflow/service.ts"),
  ]);
  for (const dir of ["app", "lib", "modules", "components"])
    for (const path of sources(join(root, dir))) {
      const code = readFileSync(path, "utf8");
      assert.doesNotMatch(
        code,
        /cloudflare:workers|CareDemoProvider|ensureDemoAccounts|DEMO_USERS|care-demo-store|patient-mvp-data|demo-routes|demoPatients/,
      );
      assert.doesNotMatch(code, /(?:from\s*|import\s*)['"]\.\.\/\.\.\/\.\.\//);
      if (privateRpcAdapters.has(path)) {
        assert.match(code, /^import "server-only";/);
        assert.doesNotMatch(code, /["']use client["']/);
        if (path.endsWith("modules/consultation-workflow/service.ts"))
          assert.match(code, /requireClinic\(tenant, \["doctor", "patient"\]\)/);
        else assert.match(code, /requireClinic\([^\n]+\["doctor"\]/);
        assert.match(code, /auth\.getClaims\(\)/);
        assert.doesNotMatch(code, /NEXT_PUBLIC_[A-Z_]*(?:SERVICE_ROLE|SECRET)/);
      } else {
        assert.doesNotMatch(code, /SUPABASE_SECRET_KEYS|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
      }
    }
  const dependencies = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ).dependencies;
  assert.equal(dependencies.vinext, undefined);
  assert.equal(dependencies.wrangler, undefined);
  // Marca, ícones, ilustrações, service worker e landing pública do Virada 90.
  assert.deepEqual(readdirSync(join(root, "public")).sort(), [
    "apple-touch-icon.png",
    "brand",
    "icon-192.png",
    "icon-512.png",
    "illustrations",
    "manifest.webmanifest",
    "sw.js",
    "virada90",
  ]);
  const worker = readFileSync(join(root, "public/sw.js"), "utf8");
  // O service worker não guarda páginas nem dados em cache.
  assert.doesNotMatch(worker, /caches\.|cache\.put|addEventListener\("fetch"/);
});

test("staff invitations fail closed without a production first-access redirect", () => {
  const repository = fileURLToPath(new URL("../../../", import.meta.url));
  const inviteFunction = readFileSync(
    join(repository, "supabase/functions/invite-staff/index.ts"),
    "utf8",
  );
  assert.match(inviteFunction, /TEAM_INVITE_REDIRECT_URL/);
  assert.match(inviteFunction, /url\.protocol !== "https:"/);
  assert.match(inviteFunction, /url\.pathname !== "\/primeiro-acesso"/);
  assert.doesNotMatch(inviteFunction, /instituto-vivance-testes-vtr-consulting/);
});
test("team invitation keeps privileged Auth access inside its authenticated edge boundary", () => {
  const repository = fileURLToPath(new URL("../../../", import.meta.url));
  const edge = readFileSync(
    join(repository, "supabase/functions/invite-staff/index.ts"),
    "utf8",
  );
  assert.match(edge, /auth\.getUser\(token\)/);
  assert.match(edge, /role.*admin/);
  assert.match(edge, /status.*active/);
  assert.match(edge, /inviteUserByEmail/);
  assert.match(edge, /status:\s*"invited"/);
  assert.doesNotMatch(edge, /console\.(?:log|error)|user_metadata.*role/);
});
