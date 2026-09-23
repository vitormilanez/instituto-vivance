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
  for (const dir of ["app", "lib", "modules", "components"])
    for (const path of sources(join(root, dir))) {
      const code = readFileSync(path, "utf8");
      assert.doesNotMatch(
        code,
        /cloudflare:workers|CareDemoProvider|ensureDemoAccounts|DEMO_USERS|care-demo-store|patient-mvp-data|demo-routes|demoPatients/,
      );
      assert.doesNotMatch(code, /(?:from\s*|import\s*)['"]\.\.\/\.\.\/\.\.\//);
      assert.doesNotMatch(
        code,
        /SUPABASE_SECRET_KEYS|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/,
      );
    }
  const dependencies = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ).dependencies;
  assert.equal(dependencies.vinext, undefined);
  assert.equal(dependencies.wrangler, undefined);
  // Só a marca, os ícones do app instalado e o service worker dos lembretes.
  assert.deepEqual(readdirSync(join(root, "public")).sort(), [
    "apple-touch-icon.png",
    "brand",
    "icon-192.png",
    "icon-512.png",
    "manifest.webmanifest",
    "sw.js",
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
