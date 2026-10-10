import assert from "node:assert/strict";
import { test } from "node:test";
import { groundedItems, groundedMetadata, numericValue, requestClaude } from "../../../supabase/functions/exam-text-worker/claude-extraction.ts";

test("Claude facts keep exact Unicode provenance and reject invented values/names", () => {
  const text = "🧪 Laboratório\nGlicose 92 mg/dL referência 70 a 99 mg/dL";
  const item = { item_kind: "laboratory", literal_name: "Glicose", literal_value: "92", unit_text: "mg/dL", reference_text: "70 a 99 mg/dL", source_excerpt: "Glicose 92 mg/dL referência 70 a 99 mg/dL" };
  const pages = [{ id: "page", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const result = groundedItems(pages, { pages: [{ page_number: 1, source_text: null, items: [item, { ...item, literal_value: "999" }, { ...item, literal_name: "Inventado" }] }], metadata: {} });
  assert.equal(result.items.length, 1);
  assert.equal(result.discarded, 2);
  const accepted = result.items[0];
  assert.equal(Array.from(text).slice(Number(accepted.source_start), Number(accepted.source_end)).join(""), item.source_excerpt);
  assert.equal(accepted.requires_review_reason, "ai_extraction");
  assert.equal(numericValue("1.234,56"), null);
  assert.equal(numericValue("< 20"), null);
  assert.equal(numericValue("1,2"), 1.2);
});

test("Truncated provider output cannot produce a completed result", async () => {
  const fetcher = (async () => Response.json({ stop_reason: "max_tokens", content: [{ type: "tool_use", name: "extract_exam", input: { pages: [] } }] })) as typeof fetch;
  await assert.rejects(() => requestClaude("test-only", "model", [], fetcher), /claude_incomplete/);
});

test("narrative labels and exam dates require literal source; metadata falls back safely", () => {
  const text = "Laudo fictício\nLab de Teste\nPaciente Teste Vivance\nColeta: 29/02/2024\nObservação: Sem achados.";
  const pages = [{ id: "page", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const narrative = { item_kind: "narrative", literal_name: "Diagnóstico inventado",
    literal_value: null, narrative_text: "Sem achados.",
    source_excerpt: "Observação: Sem achados.", observed_on: "2024-02-29" };
  const result = groundedItems(pages, { pages: [{ page_number: 1, source_text: null,
    items: [narrative, { ...narrative, observed_on: "2024-02-30" },
      { ...narrative, observed_on: "2024-03-01" }] }], metadata: {} });
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items.map((item) => item.literal_name), Array(3).fill("Observação do laudo"));
  assert.deepEqual(result.items.map((item) => item.observed_on), ["2024-02-29", null, null]);

  const invented = groundedMetadata(pages, { title: "Diagnóstico inventado", issuer: "Hospital imaginário",
    identity_text: "Outra pessoa", observed_on: "2024-02-30" }, "Rótulo do paciente");
  assert.equal(invented.title, "Rótulo do paciente");
  assert.equal(invented.issuer, null);
  assert.equal(invented.identity_text, null);
  assert.equal(invented.observed_on, null);

  const literal = groundedMetadata(pages, { title: "LAUDO FICTÍCIO", issuer: "LAB  DE TESTE",
    identity_text: "PACIENTE TESTE VIVANCE", observed_on: "2024-02-29" }, null);
  assert.equal(literal.title, "Laudo fictício");
  assert.equal(literal.issuer, "Lab de Teste");
  assert.equal(literal.identity_text, "Paciente Teste Vivance");
  assert.equal(literal.observed_on, "2024-02-29");
});
