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
        /cloudflare:workers|CareDemoProvider|ensureDemoAccounts|DEMO_USERS|care-demo-store|patient-mvp-data/,
      );
      assert.doesNotMatch(code, /(?:from\s*|import\s*)['"]\.\.\/\.\.\/\.\.\//);
    }
  const dependencies = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ).dependencies;
  assert.equal(dependencies.vinext, undefined);
  assert.equal(dependencies.wrangler, undefined);
  assert.deepEqual(readdirSync(join(root, "public")).sort(), ["brand"]);
});
