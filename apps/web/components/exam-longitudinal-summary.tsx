"use client";
import { useEffect, useState } from "react";
import type { ExamSummaryView } from "@/modules/exam-summary/service";
import type { VerifiedClaim } from "@/modules/exam-summary/analysis";
import "./exam-flow.css";

export function ExamLongitudinalSummary({tenantId,patientId}: {tenantId:string;patientId:string}) {
  const [view,setView]=useState<ExamSummaryView|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState(""), [note,setNote]=useState(""), [published,setPublished]=useState(false);
  const endpoint=`/api/v1/clinics/${encodeURIComponent(tenantId)}/patients/${encodeURIComponent(patientId)}/exam-summary`;
  useEffect(()=>{const abort=new AbortController();fetch(endpoint,{signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setView(data);}).catch(e=>{if(e.name!=="AbortError")setError("Não foi possível carregar o resumo.");});return()=>abort.abort();},[endpoint]);
  async function act(action:"generate"|"approve"|"reject"|"publish") {
    setBusy(true);setError("");
    try {
      const r=await fetch(endpoint,{method:action==="generate"?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:action==="generate"?undefined:JSON.stringify({summaryId:view?.summary?.id,action,note}),signal:AbortSignal.timeout(100000)});
      const data=await r.json();if(!r.ok)throw new Error(data.error??"Não foi possível concluir.");
      const updated=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!updated.ok)throw new Error("Atualize para conferir o resumo.");setView(await updated.json());
      if(action==="publish")setPublished(true);
    } catch(e){setError(e instanceof Error&&e.name==="Error"?e.message:"A solicitação demorou mais que o esperado. Atualize para conferir o estado; nenhuma nova chamada foi iniciada.");}finally{setBusy(false);}
  }
  const summary=view?.summary;
  const render=(claim:VerifiedClaim,index:number)=><li key={index}><p>{claim.text}</p>{claim.sourceIds.map(id=>{const fact=summary?.source_manifest.facts.find(f=>f.itemId===id);return fact?<a key={id} href={`?aba=Documentos#resultado-${encodeURIComponent(id)}`} style={{marginRight:12}}>Conferir {fact.name} · pág. {fact.page} · revisão {fact.reviewVersion}</a>:null;})}</li>;
  const leaseExpired=view?.leaseExpired;
  return <section className="panel exam-summary" aria-label="Resumo para revisão médica" style={{padding:20,minWidth:0}}>
    <h3>Resumo para revisão médica</h3>
    <p>Fatos conferidos e fontes do laudo. A geração ocorre somente quando você solicita.</p>
    {error&&<p role="alert">{error}</p>}
    {view&&<><p>{view.manifest.facts.length} fatos revisados · {view.manifest.coverage.pendingItems} itens para conferir · {view.manifest.coverage.unresolvedDocuments} arquivos sem conferência documental concluída</p>{view.manifest.coverage.complete===false&&<p role="status">Resumo factual parcial: existem documentos sem desfecho médico. Os fatos já revisados podem ser organizados, mas a cobertura ainda não está completa.</p>}{view.manifest.coverage.complete===true&&<p>Todos os arquivos têm desfecho registrado: {view.manifest.coverage.reviewedDocuments??0} conferidos e {view.manifest.coverage.excludedDocuments??0} excluídos com justificativa.</p>}</>}
    {view?.stale&&<p role="status">Desatualizado: há novas fontes ou revisões. Gere uma nova versão antes de aprovar ou publicar.</p>}
    {summary?.status==="processing"&&<p role="status">{leaseExpired?"A geração foi interrompida. Você pode tentar novamente.":"Geração em andamento. Use Atualizar estado para conferir."}</p>}
    {summary?.status==="failed"&&<p role="status">{view?.rejected?"Resumo rejeitado pelo médico e preservado no histórico. Corrija as fontes para criar uma nova versão; gerar novamente com as mesmas fontes está bloqueado.":"Resumo não concluído. As fontes continuam disponíveis; você pode tentar novamente."}</p>}
    <button disabled={busy||!view?.manifest.facts.length||(view?.rejected&&!view.stale)||(summary?.status==="processing"&&!leaseExpired)} onClick={()=>void act("generate")}>{busy?"Aguarde…":view?.stale?"Atualizar resumo":summary?"Gerar / recuperar resumo":"Gerar resumo"}</button>
    <button disabled={busy} onClick={()=>{setError("");fetch(endpoint).then(async r=>{if(!r.ok)throw new Error();setView(await r.json());}).catch(()=>setError("Não foi possível atualizar."));}} style={{marginLeft:8}}>Atualizar estado</button>
    {summary&&(summary.status==="draft"||summary.status==="approved")&&<>
      <p>{summary.status==="approved"?"Aprovado pelo médico":"Rascunho IA verificado · conferir"} · {new Date(summary.created_at).toLocaleString("pt-BR")}</p>
      <h4>Fatos selecionados · {summary.claims.length} de {summary.source_manifest.facts.length} conferidos</h4><ul>{summary.claims.slice(0,6).map(render)}</ul>
      {summary.claims.length > 6 && <details><summary>Ver os outros {summary.claims.length-6} fatos e suas fontes</summary><ul>{summary.claims.slice(6).map(render)}</ul></details>}
      <h4>Passado e atual</h4>{summary.comparisons.length?<ul>{summary.comparisons.map(render)}</ul>:<p>Sem comparação numérica validada: são necessários dois pontos com data, unidade, método e contexto compatíveis. Registros anteriores permanecem nos exames.</p>}
      <h4>Possibilidades para avaliação médica</h4>{summary.possibilities?.length?<ul>{summary.possibilities.map((possibility,index)=><li key={index}><p>{possibility.text}</p><a href={possibility.librarySource.source_url} target="_blank" rel="noreferrer">{possibility.librarySource.source_title} · versão {possibility.librarySource.source_version}</a><p>População: {possibility.librarySource.population}</p><p>{possibility.limitation}</p>{possibility.sourceIds.map(id=><a key={id} href={`?aba=Documentos#resultado-${encodeURIComponent(id)}`} style={{marginRight:12}}>Conferir evidência no laudo</a>)}</li>)}</ul>:<p>Não foi encontrada recomendação aplicável nas fontes autorizadas. A biblioteca requer curadoria e contexto médico; nenhum critério clínico foi inventado.</p>}
      {summary.status==="draft"&&<><label htmlFor="exam-summary-note">Nota da revisão</label><textarea id="exam-summary-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} style={{display:"block",width:"100%"}}/><button disabled={busy||view?.stale} onClick={()=>void act("approve")}>Conferi as fontes: aprovar resumo</button><button disabled={busy||view?.stale} onClick={()=>void act("reject")}>Rejeitar resumo</button><p>Para corrigir um valor, revise o resultado na fonte e gere uma nova versão.</p></>}
      {summary.status==="approved"&&<><button disabled={busy||view?.stale||published||view?.published} onClick={()=>void act("publish")}>{published||view?.published?"Publicado":"Publicar fatos aprovados ao paciente"}</button><p>A publicação compartilha apenas os fatos aprovados, sem hipóteses internas.</p></>}
    </>}
    {!view?.manifest.facts.length&&view&&<p>Confirme ou corrija os resultados na área de exames para habilitar o resumo.</p>}
  </section>;
}
