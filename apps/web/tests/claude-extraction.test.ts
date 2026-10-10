import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { coverageGaps, coverageSegments, extractCoverageWithClaude, extractTextWithClaude, groundedItems, groundedMetadata, mergeGroundedAttempts, numericValue, requestClaude, textBatches, unresolvedPageNotes, type ClaudeResult, type ExtractionCheckpoints } from "../../../supabase/functions/exam-text-worker/claude-extraction.ts";

test("PDF labels keep literal layout whitespace while invalid controls affect only their item", () => {
  const text = "Colesterol\nLDL: 90 mg/dL\nResultado\tqualitativo: Não\nreagente\nInválido\u0007: 12 mg/dL";
  const pages = [{ id: "p", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const result = groundedItems(pages, { pages: [{ page_number: 1, source_text: null, items: [
    { item_kind: "laboratory", literal_name: "Colesterol\nLDL", literal_value: "90", unit_text: "mg/dL", source_excerpt: "Colesterol\nLDL: 90 mg/dL" },
    { item_kind: "laboratory", literal_name: "Resultado\tqualitativo", literal_value: "Não\nreagente", source_excerpt: "Resultado\tqualitativo: Não\nreagente" },
    { item_kind: "laboratory", literal_name: "Inválido\u0007", literal_value: "12", source_excerpt: "Inválido\u0007: 12 mg/dL" },
  ] }], metadata: {} });
  assert.deepEqual(result.items.map((item) => [item.literal_name, item.literal_value]),
    [["Colesterol\nLDL", "90"], ["Resultado\tqualitativo", "Não\nreagente"]]);
  assert.equal(result.discarded, 1);
  assert.deepEqual(result.rejectedPages, [1]);
  for (const item of result.items)
    assert.equal(Array.from(text).slice(Number(item.source_start), Number(item.source_end)).join(""), item.source_excerpt);
});

test("post-match bounds use Unicode code points and reject expanded optional whitespace", () => {
  const name = "🧪".repeat(240);
  const method = `Método${" ".repeat(501)}fictício`;
  const text = `${name}: 12 mg/dL | ${method}`;
  const pages = [{ id: "p", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const result = groundedItems(pages, { pages: [{ page_number: 1, source_text: null, items: [
    { item_kind: "laboratory", literal_name: name, literal_value: "12", method_text: "Método fictício", source_excerpt: text },
  ] }], metadata: {} });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].literal_name, name);
  assert.equal(result.items[0].method_text, null);
});

test("metadata is persistence-safe without truncating literal issuer or summary", () => {
  const issuer = "L".repeat(241);
  const summary = "S".repeat(1001);
  const text = `Laudo fictício\n${issuer}\n${summary}`;
  const metadata = groundedMetadata([{ page_number: 1, extracted_text: text }], {
    title: "Laudo fictício", issuer, summary: [summary, "Laudo fictício"],
    quality_notes: ["", null, "Conferir original."], model: "claude-haiku-5-5", input_tokens: 15, output_tokens: -1,
    unexpected: "not a database field",
  }, null);
  assert.equal(metadata.issuer, null);
  assert.deepEqual(metadata.summary, ["Laudo fictício"]);
  assert.deepEqual(metadata.quality_notes, ["Conferir original."]);
  assert.equal(metadata.input_tokens, 15);
  assert.equal(metadata.output_tokens, null);
  assert.equal("unexpected" in metadata, false);
  const largeNotes = Array.from({ length: 10 }, (_, index) => `${index}${"🧪".repeat(999)}`);
  const bounded = groundedMetadata([], { quality_notes: largeNotes }, null);
  assert.ok(new TextEncoder().encode(JSON.stringify(bounded.quality_notes)).length <= 16000);
});

test("25-page extraction resumes completed batches including pages without results", async () => {
  const pages = Array.from({ length: 25 }, (_, index) => ({ page_number: index + 1, extracted_text: `Página fictícia ${index + 1}` }));
  const saved = new Map<string, ClaudeResult>();
  const checkpoints: ExtractionCheckpoints = {
    read: async (batch) => saved.get(JSON.stringify(batch)) ?? null,
    write: async (batch, _purpose, result) => { saved.set(JSON.stringify(batch), result); },
  };
  const called: number[] = [];
  let failMiddle = true;
  const fetcher = (async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, "claude-haiku-5-5");
    const batch = JSON.parse(body.messages[0].content[0].text);
    called.push(batch[0].page_number);
    if (batch[0].page_number === 6 && failMiddle) return Response.json({}, { status: 503 });
    return Response.json({ stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 20 },
      content: [{ type: "tool_use", name: "extract_exam", input: { pages: batch.map((page: { page_number: number }) => ({
        page_number: page.page_number, source_text: null, items: [],
      })) } }] });
  }) as typeof fetch;
  await assert.rejects(() => extractTextWithClaude("test-only", pages, undefined, { fetcher, checkpoints }), /claude_unavailable/);
  assert.equal(saved.size, 2); // Sibling successes are durable despite a failure.
  failMiddle = false;
  const result = await extractTextWithClaude("test-only", pages, undefined, { fetcher, checkpoints });
  assert.deepEqual(called, [1, 6, 11, 6, 16, 21]);
  assert.deepEqual(result.pages.map((page) => page.page_number), pages.map((page) => page.page_number));
  assert.equal(result.metadata.input_tokens, 50);
  assert.equal(result.metadata.output_tokens, 100);
  const noProvider = (async () => { throw new Error("Completed batches must not call the provider"); }) as typeof fetch;
  const again = await extractTextWithClaude("test-only", pages, undefined, { fetcher: noProvider, checkpoints });
  assert.equal(again.pages.length, 25);
  assert.equal(textBatches(pages).length, 5);
});

test("duplicate or missing pages remain incomplete even after fallback", async () => {
  const pages = [{ page_number: 1, extracted_text: "Fictício" }, { page_number: 2, extracted_text: "Fictício" }];
  let calls = 0;
  const fetcher = (async () => { calls++; return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "extract_exam",
    input: { pages: [{ page_number: 1, source_text: null, items: [] }, { page_number: 1, source_text: null, items: [] }] } }] }); }) as typeof fetch;
  await assert.rejects(() => extractTextWithClaude("test-only", pages, undefined, { fetcher }), /claude_incomplete/);
  assert.equal(calls, 2);
});

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
  assert.equal(numericValue("1.234"), null);
  assert.equal(numericValue("0,123"), 0.123);
  assert.equal(numericValue("< 20"), null);
  assert.equal(numericValue("1,2"), 1.2);
});

test("bounded literal repair accepts two-column value and source heading but rejects unrelated fields", () => {
  const text = "Neutrófilos 55 % 3.850 /μL\nÁtrio Esq.: 21 mm\nOutro exame: 44 mg/dL";
  const pages = [{ id: "p", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const model = { pages: [{ page_number: 1, source_text: null, items: [
    { item_kind: "laboratory", literal_name: "Neutrófilos", literal_value: "55 % (3.850 /μL)",
      unit_text: "%", source_excerpt: "Neutrófilos 55 % 3.850 /μL" },
    { item_kind: "laboratory", literal_name: "Átrio Esquerdo", literal_value: "21", unit_text: "mm",
      source_excerpt: "Átrio Esq.: 21 mm" },
    { item_kind: "laboratory", literal_name: "Nome inventado", literal_value: "44", unit_text: "mg/dL",
      source_excerpt: "Outro exame: 44 mg/dL" },
    { item_kind: "laboratory", literal_name: "Átrio Direito", literal_value: "21", unit_text: "mm",
      source_excerpt: "Átrio Esq.: 21 mm" },
  ] }], metadata: {} };
  const output = groundedItems(pages, model);
  assert.equal(output.items.length, 2);
  assert.equal(output.discarded, 2);
  assert.deepEqual(output.items.map((item) => [item.literal_name, item.literal_value, item.unit_text]),
    [["Neutrófilos", "55", "%"], ["Átrio Esq.", "21", "mm"]]);
  for (const item of output.items)
    assert.equal(Array.from(text).slice(Number(item.source_start), Number(item.source_end)).join(""), item.source_excerpt);
});

test("value and unit cannot be borrowed from reference or another exam", () => {
  const text = "Glicose 90 mg/dL | ref 70 a 99 mg/dL\nTSH 2 | ref 0,4 a 4,0 mUI/L";
  const page = [{ id: "p", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const input = { pages: [{ page_number: 1, source_text: null, items: [
    { item_kind: "laboratory", literal_name: "Glicose", literal_value: "70",
      unit_text: "mg/dL", source_excerpt: "Glicose 90 mg/dL | ref 70 a 99 mg/dL" },
    { item_kind: "laboratory", literal_name: "Glicose", literal_value: "90",
      unit_text: "mUI/L", reference_text: "0,4 a 4,0 mUI/L", source_excerpt: text },
    { item_kind: "laboratory", literal_name: "TSH", literal_value: "2",
      unit_text: "mUI/L", reference_text: "0,4 a 4,0 mUI/L", source_excerpt: "TSH 2 | ref 0,4 a 4,0 mUI/L" },
  ] }], metadata: {} };
  const output = groundedItems(page, input);
  assert.equal(output.discarded, 1);
  assert.equal(output.items.length, 2);
  assert.deepEqual(output.items.map((item) => [item.literal_name, item.literal_value, item.unit_text, item.reference_text]),
    [["Glicose", "90", null, null], ["TSH", "2", null, "0,4 a 4,0 mUI/L"]]);
});

test("retry merge retains repeated identical results at different source positions", () => {
  const text = "Glicose 90 mg/dL\nNota de repetição\nGlicose 90 mg/dL";
  const page = [{ id: "p", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const item = { item_kind: "laboratory", literal_name: "Glicose", literal_value: "90",
    unit_text: "mg/dL", source_excerpt: "Glicose 90 mg/dL" };
  const first = { pages: [{ page_number: 1, source_text: null, items: [
    { ...item, source_excerpt: text }] }], metadata: {} };
  const retry = { pages: [{ page_number: 1, source_text: null, items: [
    { ...item, source_excerpt: "Nota de repetição\nGlicose 90 mg/dL" } ] }], metadata: {} };
  // Overlapping excerpts cite two separate occurrences of the same result.
  const merged = mergeGroundedAttempts(page, [first, retry]);
  assert.equal(merged.items.length, 2);
});

test("retry merge keeps five synthetic measurements when number and unit are split differently", () => {
  const measurements = [
    ["Massa A", "72,4", "kg", " "], ["Comprimento A", "1,70", "m", ""],
    ["Circunferência A", "84", "cm", " "], ["Medida B", "12", "mm", " "], ["Proporção B", "18", "%", " "],
  ];
  const text = `LAUDO FICTÍCIO — APENAS TESTE\nData: 06/03/2024\n${measurements.map(([name, value, unit, space]) => `${name}: ${value}${space}${unit}`).join("\n")}`;
  const page = [{ id: "synthetic-measures", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const attempt = (split: boolean) => ({ pages: [{ page_number: 1, source_text: null,
    items: measurements.map(([name, value, unit, space]) => ({ item_kind: "laboratory", literal_name: name,
      literal_value: split ? value : `${value}${space}${unit}`, unit_text: split ? unit : null,
      observed_on: split ? "2024-03-06" : null, source_excerpt: `${name}: ${value}${space}${unit}` })) }], metadata: {} });
  for (const attempts of [[attempt(false), attempt(true)], [attempt(true), attempt(false)]]) {
    const merged = mergeGroundedAttempts(page, attempts);
    assert.equal(merged.discarded, 0);
    assert.equal(merged.items.length, 5);
    assert.deepEqual(merged.items.map((item) => [item.literal_name, item.literal_value, item.unit_text, item.observed_on]),
      measurements.map(([name, value, unit]) => [name, value, unit, "2024-03-06"]));
    for (const item of merged.items)
      assert.equal(Array.from(text).slice(Number(item.source_start), Number(item.source_end)).join(""), item.source_excerpt);
  }
});

test("retry merge preserves nonconflicting grounded reference, method and specimen across excerpts", () => {
  const short = "Massa A: 72,4 kg";
  const full = `${short} | ref 70 a 80 kg | método ilustrativo | amostra fictícia`;
  const text = `LAUDO FICTÍCIO — APENAS TESTE\nData: 06/03/2024\n${full}`;
  const page = [{ id: "with-reference", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const attempt = (item: Record<string, unknown>) => ({ pages: [{ page_number: 1, source_text: null, items: [item] }], metadata: {} });
  const whole = attempt({ item_kind: "laboratory", literal_name: "Massa A", literal_value: "72,4 kg",
    reference_text: "70 a 80 kg", method_text: "método ilustrativo", specimen_text: "amostra fictícia", source_excerpt: full });
  const split = attempt({ item_kind: "laboratory", literal_name: "Massa A", literal_value: "72,4",
    unit_text: "kg", observed_on: "2024-03-06", source_excerpt: short });
  for (const attempts of [[whole, split], [split, whole]]) {
    const merged = mergeGroundedAttempts(page, attempts);
    assert.equal(merged.discarded, 0);
    assert.equal(merged.items.length, 1);
    const [item] = merged.items;
    assert.deepEqual([item.literal_value, item.unit_text, item.reference_text, item.method_text, item.specimen_text, item.observed_on],
      ["72,4", "kg", "70 a 80 kg", "método ilustrativo", "amostra fictícia", "2024-03-06"]);
    assert.equal(item.source_excerpt, full);
    assert.equal(Array.from(text).slice(Number(item.source_start), Number(item.source_end)).join(""), full);
  }
});

test("retry merge uses an exact contiguous source union for complementary excerpts", () => {
  const text = "método ilustrativo | Massa A: 72,4 kg | ref 70 a 80 kg";
  const page = [{ id: "complementary-excerpts", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const attempt = (item: Record<string, unknown>) => ({ pages: [{ page_number: 1, source_text: null, items: [item] }], metadata: {} });
  const whole = attempt({ item_kind: "laboratory", literal_name: "Massa A", literal_value: "72,4 kg",
    method_text: "método ilustrativo", source_excerpt: "método ilustrativo | Massa A: 72,4 kg" });
  const split = attempt({ item_kind: "laboratory", literal_name: "Massa A", literal_value: "72,4",
    unit_text: "kg", reference_text: "70 a 80 kg", source_excerpt: "Massa A: 72,4 kg | ref 70 a 80 kg" });
  for (const attempts of [[whole, split], [split, whole]]) {
    const merged = mergeGroundedAttempts(page, attempts);
    assert.equal(merged.items.length, 1);
    const [item] = merged.items;
    assert.deepEqual([item.literal_value, item.unit_text, item.reference_text, item.method_text],
      ["72,4", "kg", "70 a 80 kg", "método ilustrativo"]);
    assert.equal(item.source_excerpt, text);
    assert.equal(Array.from(text).slice(Number(item.source_start), Number(item.source_end)).join(""), text);
  }
});

test("retry merge retains conflicting grounded references as separate review items", () => {
  const text = "Massa A: 72,4 kg | ref 70 a 80 kg | ref 60 a 90 kg";
  const page = [{ id: "conflicting-references", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const attempt = (literal_value: string, unit_text: string | null, reference_text: string) => ({
    pages: [{ page_number: 1, source_text: null, items: [{ item_kind: "laboratory", literal_name: "Massa A",
      literal_value, unit_text, reference_text, source_excerpt: text }] }], metadata: {},
  });
  const split = attempt("72,4", "kg", "70 a 80 kg");
  const whole = attempt("72,4 kg", null, "60 a 90 kg");
  for (const { attempts, expected } of [
    { attempts: [whole, split], expected: ["60 a 90 kg", "70 a 80 kg"] },
    { attempts: [split, whole], expected: ["70 a 80 kg", "60 a 90 kg"] },
  ]) {
    const merged = mergeGroundedAttempts(page, attempts);
    assert.equal(merged.items.length, 2);
    assert.deepEqual(merged.items.map((item) => item.reference_text), expected);
    assert.ok(merged.items.every((item) => item.source_excerpt === text));
  }
});

test("retry merge retains distinct percent and absolute columns at the same source anchor", () => {
  const text = "Composição A: 72,4 kg | 18 %";
  const page = [{ id: "columns", page_number: 1, extracted_text: text, possible_duplicate_of_page: null }];
  const result = { pages: [{ page_number: 1, source_text: null, items: [
    { item_kind: "laboratory", literal_name: "Composição A", literal_value: "72,4", unit_text: "kg", source_excerpt: text },
    { item_kind: "laboratory", literal_name: "Composição A", literal_value: "18 %", unit_text: "%", source_excerpt: text },
  ] }], metadata: {} };
  const merged = mergeGroundedAttempts(page, [result, result]);
  assert.equal(merged.discarded, 0);
  assert.deepEqual(merged.items.map((item) => item.literal_value), ["72,4", "18 %"]);

  const repeated = "Composição B: 10 kg | 10 %";
  const sameNumber = { pages: [{ page_number: 1, source_text: null, items: [
    { item_kind: "laboratory", literal_name: "Composição B", literal_value: "10", unit_text: "kg", source_excerpt: repeated },
    { item_kind: "laboratory", literal_name: "Composição B", literal_value: "10", unit_text: "%", source_excerpt: repeated },
  ] }], metadata: {} };
  const withDifferentUnits = mergeGroundedAttempts([{ ...page[0], extracted_text: repeated }], [sameNumber]);
  assert.deepEqual(withDifferentUnits.items.map((item) => item.unit_text), ["kg", "%"]);
});

test("coverage audit detects a missing source row without any grounding rejection", () => {
  const entry = corpus.cases[0];
  const page = [{ id: entry.id, page_number: entry.page_number, extracted_text: entry.text, possible_duplicate_of_page: null }];
  const result = { pages: [{ page_number: entry.page_number, source_text: null,
    items: [proposed(entry.expected[0], entry.observed_on)] }], metadata: {} };
  const grounded = groundedItems(page, result);
  assert.equal(grounded.discarded, 0);
  assert.deepEqual(coverageGaps(page, grounded.items), [{ page_number: 1, candidates: 6, missing: 5 }]);
  assert.deepEqual(unresolvedPageNotes(page, [1], grounded.items),
    ["Página 1: a auditoria ainda sinaliza possível resultado sem item literal correspondente. Confira o original."]);
  const complete = groundedItems(page, { pages: [{ page_number: 1, source_text: null,
    items: entry.expected.map((item) => proposed(item, entry.observed_on)) }], metadata: {} });
  assert.deepEqual(unresolvedPageNotes(page, [1], complete.items), []);
});

test("reference continuation is not counted as results; unsupported proposal leaves a visible page note", () => {
  const entry = corpus.audit_cases[0];
  const page = [{ id: entry.id, page_number: entry.page_number, extracted_text: entry.text, possible_duplicate_of_page: null }];
  const model = { pages: [{ page_number: entry.page_number, source_text: null, items: [
    { item_kind: "narrative", literal_name: "Conclusão inventada", narrative_text: "Resultado atual inventado",
      source_excerpt: "Observação: A/B a 50(X) = C/D." },
  ] }], metadata: {} };
  const grounded = groundedItems(page, model);
  assert.equal(grounded.items.length, 0);
  assert.deepEqual(grounded.rejectedPages, [21]);
  assert.deepEqual(coverageGaps(page, grounded.items), [{ page_number: 21, candidates: 0, missing: 0 }]);
  assert.deepEqual(unresolvedPageNotes(page, grounded.rejectedPages, grounded.items),
    ["Página 21: nenhum item com resultado ou narrativa literal verificável foi organizado. Confira o original."]);
  assert.deepEqual(unresolvedPageNotes(page, [], grounded.items), []);
});

test("line-separated literal lab result triggers audit even if a model returns nothing", () => {
  const entry = corpus.audit_cases[1];
  const page = [{ id: entry.id, page_number: entry.page_number, extracted_text: entry.text, possible_duplicate_of_page: null }];
  assert.deepEqual(coverageGaps(page, []), [{ page_number: 7, candidates: 1, missing: 1 }]);
  const other = { id: "other", page_number: 8, extracted_text: "Glicose: 90 mg/dL", possible_duplicate_of_page: null };
  const groundedElsewhere = groundedItems([other], { pages: [{ page_number: 8, source_text: null,
    items: [{ item_kind: "laboratory", literal_name: "Glicose", literal_value: "90",
      source_excerpt: "Glicose: 90 mg/dL" }] }], metadata: {} });
  assert.deepEqual(coverageGaps([...page, other], groundedElsewhere.items), [
    { page_number: 7, candidates: 1, missing: 1 },
    { page_number: 8, candidates: 1, missing: 0 },
  ]);
  assert.equal(unresolvedPageNotes(page, [7], []).length, 1);
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

type Expected = { item_kind: "laboratory" | "narrative"; literal_name: string; literal_value?: string;
  unit_text?: string; reference_text?: string; narrative_text?: string; source_excerpt: string };
type Case = { id: string; page_number: number; kind: string; observed_on: string; text: string; expected: Expected[] };
const corpus = JSON.parse(readFileSync(new URL("./fixtures/exams/coverage-corpus.json", import.meta.url), "utf8")) as {
  cases: Case[]; audit_cases: { id: string; page_number: number; text: string; expected_candidates: number }[] };

function proposed(item: Expected, observed_on: string) {
  return { item_kind: item.item_kind, literal_name: item.literal_name,
    literal_value: item.literal_value ?? null, unit_text: item.unit_text ?? null,
    reference_text: item.reference_text ?? null, method_text: null, specimen_text: null,
    observed_on, narrative_text: item.narrative_text ?? null, source_excerpt: item.source_excerpt };
}

test("synthetic corpus counts expected fields by page while retaining literal Unicode offsets", () => {
  let expectedCount = 0;
  let actualCount = 0;
  for (const entry of corpus.cases) {
    const page = { id: entry.id, page_number: entry.page_number, extracted_text: entry.text, possible_duplicate_of_page: null };
    assert.deepEqual(coverageGaps([page], []), [{ page_number: entry.page_number,
      candidates: entry.expected.length, missing: entry.expected.length }], entry.id);
    const initial = { pages: [{ page_number: entry.page_number, source_text: null,
      items: [proposed(entry.expected[0], entry.observed_on),
        { ...proposed(entry.expected[1], entry.observed_on), literal_name: "Nome que não consta na fonte",
          literal_value: "999", narrative_text: "Texto que não consta na fonte" }] }], metadata: {} };
    const audit = { pages: [{ page_number: entry.page_number, source_text: null,
      items: entry.expected.map((item) => proposed(item, entry.observed_on)) }], metadata: {} };
    const grounded = mergeGroundedAttempts([page], [initial, audit]);
    assert.equal(grounded.discarded, 1, entry.id);
    assert.equal(grounded.items.length, entry.expected.length, entry.id);
    assert.deepEqual(grounded.items.map((item) => item.item_index), entry.expected.map((_, index) => index + 1), entry.id);
    for (const expected of entry.expected) {
      const item = grounded.items.find((candidate) => candidate.source_excerpt === expected.source_excerpt);
      assert.ok(item, `${entry.id}: ${expected.literal_name}`);
      assert.equal(item.item_kind, expected.item_kind);
      assert.equal(item.literal_name, expected.literal_name);
      assert.equal(item.literal_value, expected.literal_value ?? null);
      assert.equal(item.unit_text, expected.unit_text ?? null);
      assert.equal(item.reference_text, expected.reference_text ?? null);
      assert.equal(item.narrative_text, expected.narrative_text ?? null);
      assert.equal(item.observed_on, entry.observed_on);
      assert.equal(Array.from(entry.text).slice(Number(item.source_start), Number(item.source_end)).join(""), expected.source_excerpt);
      assert.equal(item.page_number, entry.page_number);
    }
    expectedCount += entry.expected.length;
    actualCount += grounded.items.length;
  }
  assert.equal(actualCount, expectedCount);
  assert.equal(expectedCount, 19);
});

test("coverage audit splits long pages at line boundaries and keeps valid first attempt after a failed segment", async () => {
  const source = Array.from({ length: 20 }, (_, index) => `Linha ${index + 1}: Exame ${index + 1} | ${index + 1} mg/dL | referência fictícia`).join("\n");
  const page = { page_number: 21, extracted_text: source };
  const segments = coverageSegments(page);
  assert.equal(segments.length, 2);
  assert.ok(segments[0].extracted_text?.includes("Linha 1:"));
  assert.ok(segments[1].extracted_text?.includes("Linha 20:"));
  assert.ok(segments[0].extracted_text?.includes("Linha 10:"));
  assert.ok(segments[1].extracted_text?.includes("Linha 10:"));
  let calls = 0;
  const fetcher = (async (_url: unknown, init: RequestInit) => {
    calls++;
    const request = JSON.parse(String(init.body));
    assert.equal(request.model, "claude-sonnet-5-5");
    assert.equal(request.max_tokens, 6000);
    if (calls === 2) return Response.json({}, { status: 503 });
    return Response.json({ stop_reason: "tool_use", usage: { input_tokens: 11, output_tokens: 7 },
      content: [{ type: "tool_use", name: "extract_exam", input: { pages: [{ page_number: 21,
        source_text: null, items: [] }] } }] });
  }) as typeof fetch;
  const audit = await extractCoverageWithClaude("test-only", [page], fetcher);
  assert.equal(calls, 2);
  assert.equal(audit.attempts.length, 1);
  assert.equal(audit.failed, 1);
  assert.equal(audit.inputTokens, 11);
  assert.equal(audit.outputTokens, 7);
});
