import test from "node:test";
import assert from "node:assert/strict";
import { patientSearch, searchPattern } from "../lib/validation.ts";

test("search normalizes names and bounds request input", () => {
  assert.equal(patientSearch("  Ana   Maria "), "Ana Maria");
  assert.equal(patientSearch(null), "");
  assert.throws(() => patientSearch("a".repeat(81)));
  assert.throws(() => patientSearch("Ana\u0000"));
  assert.throws(() => patientSearch(["Ana"] as unknown as string));
});
test("search treats SQL wildcards as literal characters", () => {
  assert.equal(searchPattern("100%_\\"), "%100\\%\\_\\\\%");
  assert.equal(searchPattern("D'Ávila"), "%D'Ávila%");
});
