import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { consultationWorkflowAction } from "../modules/consultation-workflow/validation.ts";

test("consultation workflow validates patient decisions and immutable unknown-speaker chunks", () => {
  const decisionId = randomUUID(), captureId = randomUUID(), clientChunkId = randomUUID();
  assert.deepEqual(consultationWorkflowAction({ action: "consent_decide", payload: {
    decisionId, consentVersion: "consultation-assistance-v1", decision: "granted",
  } }), { action: "consent_decide", payload: {
    decisionId, consentVersion: "consultation-assistance-v1", decision: "granted",
  } });
  const chunk = { action: "append_chunk", payload: { captureId, chunkIndex: 0, clientChunkId,
    text: "Texto fictício literal.", capturedAt: "2026-10-15T12:00:00Z", startSeconds: 0,
    endSeconds: 4.2, speaker: "unknown" } };
  assert.deepEqual(consultationWorkflowAction(chunk), chunk);
  for (const payload of [
    { ...chunk.payload, speaker: "patient" },
    { ...chunk.payload, chunkIndex: 360 },
    { ...chunk.payload, text: "x".repeat(2001) },
    { ...chunk.payload, endSeconds: -1 },
    { ...chunk.payload, audio: "forbidden" },
  ]) assert.throws(() => consultationWorkflowAction({ action: "append_chunk", payload }));
});

test("consultation workflow keeps summary generation explicit and review versioned", () => {
  assert.deepEqual(consultationWorkflowAction({ action: "process_summary", payload: {} }), {
    action: "process_summary", payload: {},
  });
  assert.throws(() => consultationWorkflowAction({ action: "process_summary", payload: { onRead: true } }));
  assert.throws(() => consultationWorkflowAction({ action: "review_summary", payload: {
    summaryId: randomUUID(), expectedVersion: 1, decision: "rejected", note: "Rejeitado.", correctedSummary: {},
  } }));
});
