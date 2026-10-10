// This parser recognizes only the deliberately fake IA2 fixture. It does not
// infer clinical meaning from arbitrary PDFs or assign a date of performance.
export type SourcePage = {
  id: string;
  page_number: number;
  extracted_text: string | null;
  possible_duplicate_of_page: number | null;
};

const fixtureMark = "DEMONSTRACAO - DOCUMENTO INTEIRAMENTE FICTICIO";
const marker = /Marcador ficticio (\d{2}): resultado (\d+) unidade-demo; referencia do emissor: nao aplicavel\./g;
const narrative = /Texto narrativo ficticio, criado apenas para testar a separacao de paginas\./g;

export function parseSyntheticFixture(pages: SourcePage[]) {
  if (pages.length !== 3 || pages.some((page) => !page.extracted_text?.includes(fixtureMark)))
    return [];

  const items: Record<string, unknown>[] = [];
  for (const page of pages) {
    const text = page.extracted_text!;
    if (page.page_number === 1 || page.page_number === 2) {
      let index = 0;
      for (const match of text.matchAll(marker)) {
        const start = match.index;
        items.push({
          source_page_id: page.id,
          page_number: page.page_number,
          item_index: ++index,
          item_kind: "laboratory",
          literal_name: `Marcador ficticio ${match[1]}`,
          literal_value: match[2],
          numeric_value: Number(match[2]),
          unit_text: "unidade-demo",
          reference_text: "nao aplicavel",
          issuer_flag: null,
          method_text: null,
          specimen_text: null,
          observed_on: null,
          narrative_text: null,
          source_excerpt: match[0],
          source_start: start,
          source_end: start + match[0].length,
          extraction_confidence: null,
          requires_review_reason: page.possible_duplicate_of_page ? "possible_duplicate" : "synthetic_pilot",
        });
      }
      // An incomplete fixture is a text-only run, never a partial result set.
      if (index !== 22) return [];
    } else if (page.page_number === 3) {
      const match = [...text.matchAll(narrative)][0];
      if (!match) return [];
      items.push({
        source_page_id: page.id,
        page_number: page.page_number,
        item_index: 1,
        item_kind: "narrative",
        literal_name: "Relato ilustrativo B",
        literal_value: null,
        numeric_value: null,
        unit_text: null,
        reference_text: null,
        issuer_flag: null,
        method_text: null,
        specimen_text: null,
        observed_on: null,
        narrative_text: match[0],
        source_excerpt: match[0],
        source_start: match.index,
        source_end: match.index + match[0].length,
        extraction_confidence: null,
        requires_review_reason: "synthetic_pilot",
      });
    } else return [];
  }
  return items.length === 45 ? items : [];
}
