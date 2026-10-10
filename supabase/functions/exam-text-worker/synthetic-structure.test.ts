import { parseSyntheticFixture, type SourcePage } from "./synthetic-structure.ts";

const header = "DEMONSTRACAO - DOCUMENTO INTEIRAMENTE FICTICIO";
const lines = Array.from({ length: 22 }, (_, index) =>
  `Marcador ficticio ${String(index + 1).padStart(2, "0")}: resultado ${100 + index} unidade-demo; referencia do emissor: nao aplicavel.`
);

function fixture(): SourcePage[] {
  return [
    { id: "page-1", page_number: 1, extracted_text: `${header}\n${lines.join("\n")}`, possible_duplicate_of_page: null },
    { id: "page-2", page_number: 2, extracted_text: `${header}\n${lines.map((line, index) => index === 10 ? line.replace("resultado 110", "resultado 111") : line).join("\n")}`, possible_duplicate_of_page: 1 },
    { id: "page-3", page_number: 3, extracted_text: `${header}\nTexto narrativo ficticio, criado apenas para testar a separacao de paginas.`, possible_duplicate_of_page: null },
  ];
}

Deno.test("synthetic parser preserves exact page excerpts and duplicate-page review", () => {
  const pages = fixture();
  const items = parseSyntheticFixture(pages);
  if (items.length !== 45) throw new Error("Expected 44 fake markers and one fake narrative");
  for (const item of items) {
    const page = pages.find((candidate) => candidate.id === item.source_page_id)!;
    const excerpt = page.extracted_text!.slice(item.source_start as number, item.source_end as number);
    if (excerpt !== item.source_excerpt) throw new Error("Excerpt lost exact provenance");
  }
  if (items[32].literal_value !== "111" || items[32].requires_review_reason !== "possible_duplicate")
    throw new Error("Changed duplicate-page marker was not preserved");
  if (items[44].item_kind !== "narrative") throw new Error("Narrative attribution was lost");
});

Deno.test("synthetic parser rejects incomplete or unmarked material", () => {
  const pages = fixture();
  pages[0].extracted_text = pages[0].extracted_text!.replace(header, "other document");
  if (parseSyntheticFixture(pages).length) throw new Error("Unmarked source must stay text-only");
  pages[0].extracted_text = fixture()[0].extracted_text!.replace(lines[4], "");
  if (parseSyntheticFixture(pages).length) throw new Error("Incomplete fixture must stay text-only");
});
