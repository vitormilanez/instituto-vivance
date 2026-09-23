import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stageFromSlug, stageSlugs } from "../modules/encounters/stages.ts";

test("a etapa do atendimento sobrevive ao recarregamento pela URL", () => {
  assert.equal(stageFromSlug("consulta"), "consultation");
  assert.equal(stageFromSlug("fechamento"), "closing");
  assert.equal(stageFromSlug(undefined), "preparation");
  assert.equal(stageFromSlug("<script>"), "preparation");
  assert.equal(stageSlugs.plan, "plano");
  const editor = readFileSync(new URL("../components/encounter-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /useState<EncounterStage>\(initialStage\)/);
  assert.match(editor, /url\.searchParams\.set\("etapa", stageSlugs\[next\]\)/);
  assert.match(editor, /window\.history\.replaceState/);
});
