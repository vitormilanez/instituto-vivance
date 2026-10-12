import assert from "node:assert/strict";
import test from "node:test";
import { applicableClinicalSources, longitudinalComparisons, verifyPossibilitySelection, verifySummarySelection, type SummaryManifest, type ReviewedFact, type ClinicalSource } from "../modules/exam-summary/analysis.ts";
const fact:ReviewedFact={itemId:"item",reviewId:"review",reviewVersion:1,documentId:"document",sourceHash:"a".repeat(64),page:1,excerpt:"Synthetic glucose 105",name:"Glicose",value:"105",unit:"mg/dL",reference:"70–99 mg/dL",observedOn:"2026-10-01",method:"Colorimetria",context:"Soro"};
const manifest:SummaryManifest={version:"test",facts:[fact],age:40,coverage:{documents:1,pendingItems:0,unresolvedDocuments:0}};
test("verifier reconstructs every factual numeral, rejects unsupported sources and duplicates",()=>{
 const verified=verifySummarySelection({itemIds:["item","unknown","item"],text:"diabetes 999"},manifest);
 assert.equal(verified.claims.length,1);assert.equal(verified.removed,2);assert.match(verified.claims[0].text,/105/);assert.doesNotMatch(verified.claims[0].text,/999|diabetes/);
 assert.throws(()=>verifySummarySelection({itemIds:["unknown"]},manifest));
});
test("longitudinal arithmetic requires matching names units method context dates and unambiguous numbers",()=>{
 const before={...fact,itemId:"previous",value:"100",observedOn:"2026-09-01"};
 const result=longitudinalComparisons([fact,before]);assert.equal(result.length,1);assert.match(result[0].text,/\+5 mg\/dL/);assert.deepEqual(result[0].sourceIds,["previous","item"]);
 for(const changed of [{unit:"mmol/L"},{method:null},{context:null},{observedOn:null},{value:"1.234"},{name:"Glicemia"}])assert.equal(longitudinalComparisons([fact,{...before,...changed}]).length,0);
});
const source:ClinicalSource={id:"library",source_title:"Fonte fictícia QA",source_url:"https://example.org/qa",source_version:"1",excerpt:"Trecho fictício; sem valor clínico.",population:"Adultos",exclusions:"Nenhuma exclusão adicional",applicability:{analytes:["Glicose"],units:["mg/dL"],referencePositions:["above"],minAge:18}};
test("referências com separador de milhares ambíguo não selecionam possibilidades",()=>{
 const m={...manifest,facts:[{...fact,value:"900",reference:"1.000 - 2.000 mg/dL"}],library:[source]};
 assert.equal(applicableClinicalSources(m).length,0);
 assert.deepEqual(verifyPossibilitySelection({libraryIds:[source.id]},m),[]);
 assert.equal(applicableClinicalSources({...m,facts:[{...fact,value:"900",reference:"1,000 - 2,000 mg/dL"}]}).length,0);
 assert.equal(applicableClinicalSources({...m,facts:[{...fact,value:"900",reference:"1000 - 2000 mg/dL"}]}).length,0);
});
test("clinical selection requires current snapshot source, explicit context and laboratory unit, never free model hypotheses",()=>{
 const m={...manifest,library:[source]};assert.equal(applicableClinicalSources(m).length,1);
 assert.equal(verifyPossibilitySelection({libraryIds:["forged"]},m).length,0);
 const selected=verifyPossibilitySelection({libraryIds:["library"],hypothesis:"diabetes"},m);assert.equal(selected.length,1);assert.doesNotMatch(selected[0].text,/diabetes/);
 assert.equal(applicableClinicalSources({...m,age:null}).length,0);
 assert.equal(applicableClinicalSources({...m,library:[{...source,exclusions:"Gravidez"}]}).length,0);
 assert.equal(applicableClinicalSources({...m,library:[{...source,applicability:{...source.applicability,requiredContext:["sexo"]}}]}).length,0);
 assert.equal(verifyPossibilitySelection({libraryIds:["library"]},{...manifest,library:[]}).length,0);
});
