import { test } from "node:test";
import assert from "node:assert/strict";
import { acknowledgedDraftField } from "../modules/encounters/draft-save.ts";

test("autosave acknowledgement preserves text typed while the request is in flight", () => {
  assert.equal(
    acknowledgedDraftField("Motivo novo", "Motivo", "Motivo"),
    "Motivo novo",
  );
  assert.equal(
    acknowledgedDraftField("", "Texto enviado", "Texto enviado"),
    "",
  );
});
test("autosave accepts server normalization only for unchanged fields", () => {
  assert.equal(
    acknowledgedDraftField("  Motivo  ", "  Motivo  ", "Motivo"),
    "Motivo",
  );
  const sent = { reason: "  Motivo  ", evolution: "Texto" };
  const current = { reason: sent.reason, evolution: "Texto continuado" };
  assert.deepEqual(
    {
      reason: acknowledgedDraftField(current.reason, sent.reason, "Motivo"),
      evolution: acknowledgedDraftField(
        current.evolution,
        sent.evolution,
        "Texto",
      ),
    },
    { reason: "Motivo", evolution: "Texto continuado" },
  );
});
