export type ReviewedFact = {
  itemId: string; reviewId: string; reviewVersion: number; documentId: string;
  sourceHash: string; page: number; excerpt: string; name: string; value: string;
  unit: string | null; reference: string | null; observedOn: string | null;
  method?: string | null; context?: string | null;
};
export type ClinicalSource = { id:string;source_title:string;source_url:string;source_version:string;excerpt:string;population:string;exclusions:string;applicability:{analytes:string[];units:string[];referencePositions:string[];minAge?:number;maxAge?:number;requiredContext?:string[]} };
export type SummaryManifest = { version: string; facts: ReviewedFact[]; age?:number|null;library?:ClinicalSource[];generationContract?:{providerModel:string;promptVersion:string;verifierVersion:string}; coverage: { documents: number; pendingItems: number; unresolvedDocuments: number;reviewedDocuments?:number;excludedDocuments?:number;complete?:boolean } };
export type VerifiedClaim = { text: string; sourceIds: string[]; type: "exam_fact" | "calculation" };
export type VerifiedPossibility = { text:string;sourceIds:string[];librarySource:ClinicalSource; limitation:string };
export const summaryContractVersion = "exam-summary-v1";
export const summaryGenerationContract = { providerModel:"claude-haiku-5-5",promptVersion:"vivance-exam-summary-20261011.1",verifierVersion:"exam-selection-v2" } as const;
function comparableNumber(value: string): number | null {
  if (!/^-?\d+(?:[.,]\d+)?$/.test(value) || /^-?[1-9]\d{0,2}[.,]\d{3}$/.test(value)) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}
export function applicableClinicalSources(manifest:SummaryManifest) {
  const position=(f:ReviewedFact)=>{
    if(!f.unit||!f.reference||!/^\d+(?:[.,]\d+)?$/.test(f.value)||/^[1-9]\d{0,2}[.,]\d{3}$/.test(f.value))return null;
    const m=/^(-?\d+(?:[.,]\d+)?)\s*(?:-|–|a)\s*(-?\d+(?:[.,]\d+)?)\s*(.*)$/.exec(f.reference);
    if(!m||m[3].trim()!==f.unit)return null;
    const n=comparableNumber(f.value),a=comparableNumber(m[1]),b=comparableNumber(m[2]);
    if(n===null||a===null||b===null||a>b)return null;return n<a?"below":n>b?"above":"within";
  };
  return (manifest.library??[]).flatMap(source=>{
    const a=source.applicability;
    if(!a||!Array.isArray(a.analytes)||!Array.isArray(a.units)||!Array.isArray(a.referencePositions)||(a.requiredContext?.length??0)>0||source.exclusions.trim()!=="Nenhuma exclusão adicional")return [];
    if((a.minAge!==undefined||a.maxAge!==undefined)&&(manifest.age==null||(a.minAge!==undefined&&manifest.age<a.minAge)||(a.maxAge!==undefined&&manifest.age>a.maxAge)))return [];
    const facts=manifest.facts.filter(f=>a.analytes.includes(f.name)&&Boolean(f.unit&&a.units.includes(f.unit))&&a.referencePositions.includes(position(f)??"unavailable"));
    return facts.length?[{source,facts}]:[];
  });
}
export function verifyPossibilitySelection(output:unknown,manifest:SummaryManifest):VerifiedPossibility[] {
  const selected=output&&typeof output==="object"&&"libraryIds" in output?(output as {libraryIds:unknown}).libraryIds:[];
  if(!Array.isArray(selected))return [];
  const applicable=applicableClinicalSources(manifest);
  return [...new Set(selected.filter((id):id is string=>typeof id==="string"))].slice(0,3).flatMap(id=>{
    const match=applicable.find(entry=>entry.source.id===id);
    if(!match)return [];
    return [{text:`Para avaliação médica, trecho da fonte autorizada: “${match.source.excerpt}”`,sourceIds:match.facts.map(f=>f.itemId),librarySource:match.source,limitation:"O intervalo do laboratório e a aplicabilidade estruturada foram conferidos. Associação não estabelece diagnóstico ou conduta; histórico, método, sintomas e contexto clínico ainda exigem avaliação médica."}];
  });
}

// Free text from a model is never trusted as a verified clinical statement.
// The model chooses relevant reviewed sources; an independent deterministic
// renderer reconstructs every published fact and numeral from the snapshot.
export function verifySummarySelection(output: unknown, manifest: SummaryManifest): { claims: VerifiedClaim[]; removed: number } {
  const raw = output && typeof output === "object" && "itemIds" in output ? (output as { itemIds: unknown }).itemIds : null;
  if (!Array.isArray(raw)) throw new Error("invalid_summary_contract");
  const sources = new Map(manifest.facts.map((fact) => [fact.itemId, fact]));
  const seen = new Set<string>();
  let removed = 0;
  const claims: VerifiedClaim[] = [];
  for (const id of raw.slice(0, 30)) {
    const fact = typeof id === "string" ? sources.get(id) : null;
    if (!fact || typeof fact.value!=="string" || !fact.value.trim() || seen.has(fact.itemId)) { removed++; continue; }
    seen.add(fact.itemId);
    const unit = fact.unit && !fact.value.trim().endsWith(fact.unit) ? ` ${fact.unit}` : "";
    claims.push({ type: "exam_fact", text: `${fact.name}: ${fact.value}${unit} · ${fact.observedOn ?? "data não identificada"}${fact.reference ? ` · Referência do laudo: ${fact.reference}` : " · Referência não informada"}.`, sourceIds: [fact.itemId] });
  }
  if (!claims.length) throw new Error("no_supported_claims");
  return { claims, removed };
}

export function longitudinalComparisons(facts: ReviewedFact[]): VerifiedClaim[] {
  const groups = new Map<string, ReviewedFact[]>();
  for (const fact of facts) {
    // Neither synonyms nor missing method/context establish comparability.
    if (!fact.unit || !fact.method || !fact.context || !/^\d{4}-\d{2}-\d{2}$/.test(fact.observedOn ?? "")) continue;
    const key = JSON.stringify([fact.name, fact.unit, fact.method, fact.context]);
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  }
  return [...groups.values()].flatMap((group) => {
    const sorted = group.sort((a, b) => a.observedOn!.localeCompare(b.observedOn!) || a.itemId.localeCompare(b.itemId));
    const before = sorted.at(-2), current = sorted.at(-1);
    if (!before || !current || before.observedOn === current.observedOn) return [];
    const parse = (value: string) => /^-?\d+(?:[.,]\d+)?$/.test(value) && !/^-?[1-9]\d{0,2}[.,]\d{3}$/.test(value) ? Number(value.replace(",", ".")) : NaN;
    const a = parse(before.value), b = parse(current.value);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
    const delta = Math.round((b - a) * 1e8) / 1e8;
    return [{ type: "calculation" as const, sourceIds: [before.itemId, current.itemId], text: `${current.name}: ${before.value} ${before.unit} em ${before.observedOn} → ${current.value} ${current.unit} em ${current.observedOn}; variação aritmética ${delta > 0 ? "+" : ""}${delta} ${current.unit}. Sem inferência clínica.` }];
  });
}
