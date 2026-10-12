import test from "node:test";
import assert from "node:assert/strict";
import { clinicalSourceInput } from "../modules/exam-library/validation.ts";

const source = { title:"Fonte sintética para QA",url:"https://example.com/fonte",version:"QA1",excerpt:"Trecho sintético sem recomendação clínica, para testar proveniência.",
  population:"Adultos fictícios",exclusions:"Nenhuma exclusão adicional",validUntil:null,
  applicability:{analytes:["Glicose"],units:["mg/dL"],referencePositions:["above"],requiredContext:[],minAge:18,maxAge:99} };
test("fonte exige URL segura, trecho e aplicabilidade explícitos",()=>{
  assert.equal(clinicalSourceInput(source).applicability.analytes[0],"Glicose");
  assert.throws(()=>clinicalSourceInput({...source,url:"javascript:alert(1)"}));
  assert.throws(()=>clinicalSourceInput({...source,excerpt:""}));
  assert.throws(()=>clinicalSourceInput({...source,applicability:{...source.applicability,units:[]}}));
  assert.throws(()=>clinicalSourceInput({...source,applicability:{...source.applicability,referencePositions:["healthy"]}}));
});
test("idade e datas inválidas não ampliam população da fonte",()=>{
  assert.throws(()=>clinicalSourceInput({...source,applicability:{...source.applicability,minAge:99,maxAge:18}}));
  assert.throws(()=>clinicalSourceInput({...source,validUntil:"2026-02-30"}));
  assert.throws(()=>clinicalSourceInput({...source,applicability:{...source.applicability,minAge:"18"}}));
});
