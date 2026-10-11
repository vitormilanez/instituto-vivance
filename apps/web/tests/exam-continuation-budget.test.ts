import assert from "node:assert/strict";
import { test } from "node:test";
import { ExtractionContinuationRequired, extractionBudget } from "../../../supabase/functions/exam-text-worker/processing-budget.ts";
import { extractCoverageWithClaude, extractTextWithClaude, type ClaudeResult, type ExtractionCheckpoints } from "../../../supabase/functions/exam-text-worker/claude-extraction.ts";

test("budget leaves persistence margin and allows the shorter selective read", () => {
  let clock = 0;
  const budget = extractionBudget(0, () => clock);
  budget(100_000);
  clock = 60_000;
  assert.throws(() => budget(100_000), ExtractionContinuationRequired);
  budget(45_000);
  clock = 111_000;
  assert.throws(() => budget(45_000), ExtractionContinuationRequired);
});

test("voluntary continuation preserves a complete wave and resumes without rereading it", async () => {
  const pages = Array.from({ length: 25 }, (_, index) => ({ page_number: index + 1, extracted_text: `Página fictícia ${index + 1}` }));
  const saved = new Map<string, ClaudeResult>();
  let clock = 0;
  let writes = 0;
  const checkpoints: ExtractionCheckpoints = {
    beforeRequest: extractionBudget(0, () => clock),
    read: async (batch) => saved.get(JSON.stringify(batch)) ?? null,
    write: async (batch, _purpose, result) => {
      saved.set(JSON.stringify(batch), result);
      if (++writes === 3) clock = 60_000;
    },
  };
  const requested: number[] = [];
  const fetcher = (async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    const batch = JSON.parse(request.messages[0].content[0].text);
    requested.push(batch[0].page_number);
    return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "extract_exam", input: {
      pages: batch.map((page: { page_number: number }) => ({ page_number: page.page_number, source_text: null, items: [] })),
    } }] });
  }) as typeof fetch;
  await assert.rejects(() => extractTextWithClaude("test-only", pages, undefined, { fetcher, checkpoints }), ExtractionContinuationRequired);
  assert.equal(saved.size, 3);
  clock = 0;
  const completed = await extractTextWithClaude("test-only", pages, undefined, { fetcher, checkpoints });
  assert.equal(completed.pages.length, 25);
  assert.deepEqual(requested, [1, 6, 11, 16, 21]);
  clock = 170_000;
  const cached = await extractTextWithClaude("test-only", pages, undefined, { fetcher, checkpoints });
  assert.equal(cached.pages.length, 25);
  assert.equal(requested.length, 5);
});

test("a coverage pause is not silently persisted as a completed incomplete audit", async () => {
  const checkpoints: ExtractionCheckpoints = {
    read: async () => null, write: async () => { throw new Error("No write expected"); },
    beforeRequest: () => { throw new ExtractionContinuationRequired(); },
  };
  const fetcher = (async () => { throw new Error("No provider request expected"); }) as typeof fetch;
  await assert.rejects(() => extractCoverageWithClaude("test-only", [{ page_number: 1, extracted_text: "Glucose: 92 mg/dL" }], fetcher, checkpoints), ExtractionContinuationRequired);
});
