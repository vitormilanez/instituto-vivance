"use client";
import {useEffect,useState} from "react";
import type {ExamDocumentValidationView} from "@/modules/exams/document-validation";
export function ExamDocumentValidation({tenantId,documentId,refreshKey=""}:{tenantId:string;documentId:string;refreshKey?:string}){
 const [view,setView]=useState<ExamDocumentValidationView|null>(null),[decision,setDecision]=useState<"reviewed"|"excluded">("reviewed"),[note,setNote]=useState(""),[pages,setPages]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const endpoint=`/api/v1/clinics/${encodeURIComponent(tenantId)}/documents/${encodeURIComponent(documentId)}/exam-validation`;
 useEffect(()=>{const abort=new AbortController();fetch(endpoint,{signal:abort.signal}).then(async r=>{const v=await r.json();if(!r.ok)throw new Error(v.error);setView(v);}).catch(e=>{if(e.name!=="AbortError")setError("Não foi possível carregar a conferência documental.");});return()=>abort.abort();},[endpoint,refreshKey]);
 async function refresh(){setBusy(true);setError("");try{const r=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});const v=await r.json();if(!r.ok)throw new Error(v.error);setView(v);}catch{setError("Não foi possível atualizar a conferência.");}finally{setBusy(false);}}
 async function save(){setBusy(true);setError("");try{const excludedPages=pages.trim()?pages.split(",").map(s=>Number(s.trim())):[];if(excludedPages.some(p=>!Number.isInteger(p)||p<1))throw new Error("Informe páginas inteiras separadas por vírgulas.");const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,note,excludedPages,expectedVersion:view?.version,requestId:crypto.randomUUID()}),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw new Error(data.error);await refresh();}catch(e){setError(e instanceof Error&&e.name==="Error"?e.message:"Não foi possível salvar. Atualize o estado para conferir.");}finally{setBusy(false);}}
 const state=view?.sourceState;
 const needsNote=decision==="excluded"||Boolean(state?.qualityNotes.length)||Boolean(state?.unresolvedPages.length)||Boolean(pages.trim());
 const canConclude=Boolean(state?.runId)&&["extracted","requires_review"].includes(state?.runStatus??"")&&!['pending','processing'].includes(state?.jobStatus??"")&&state?.pendingItems===0;
 return <section className="exam-results-quality" aria-label="Conferência médica do documento" style={{padding:12}}>
  <h4>Conferência do documento completo</h4><p>Esta etapa registra o desfecho do arquivo e a cobertura das páginas, depois da revisão dos resultados.</p>
  {error&&<p role="alert">{error}</p>}
  {view&&<><p role="status">{view.validation&&!view.stale?view.validation.decision==="excluded"?"Excluído da análise com justificativa":"Documento conferido pelo médico":view.stale?"Conferência desatualizada: a fonte ou as revisões mudaram":"Aguardando conferência documental"}</p>
   {view.validation&&<p>Versão {view.validation.version} · {new Date(view.validation.reviewed_at).toLocaleString("pt-BR")}{view.validation.note?` · ${view.validation.note}`:""}</p>}
   <p>{state?.pendingItems??0} resultados para conferir · {state?.pageCount??"—"} páginas · {state?.qualityNotes.length??0} notas de qualidade</p>
   {Boolean(state?.qualityNotes.length)&&<ul>{state?.qualityNotes.map((q,i)=><li key={i}>{q}</li>)}</ul>}
   {Boolean(state?.unresolvedPages.length)&&<p>Páginas com leitura pendente ou incerta: {state?.unresolvedPages.join(", ")}. Confira o original; páginas não utilizáveis precisam de exclusão explícita e justificativa.</p>}
   <fieldset disabled={busy}><legend>Desfecho médico</legend><label><input type="radio" checked={decision==="reviewed"} onChange={()=>setDecision("reviewed")}/> Concluir conferência</label><label><input type="radio" checked={decision==="excluded"} onChange={()=>setDecision("excluded")}/> Excluir este documento da análise</label>
    {decision==="reviewed"&&<label style={{display:"block"}}>Páginas excluídas da análise (opcional)<input value={pages} onChange={e=>setPages(e.target.value)} placeholder="Ex.: 3, 7" inputMode="text" style={{display:"block",width:"100%"}}/></label>}
    <label style={{display:"block"}}>Justificativa{needsNote?" obrigatória (mínimo 10 caracteres)":" opcional"}<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} style={{display:"block",width:"100%"}}/></label>
    {!canConclude&&decision==="reviewed"&&<p>Conclua a extração e confirme, corrija ou rejeite todos os resultados antes de concluir o documento.</p>}
    <button type="button" disabled={(decision==="reviewed"&&!canConclude)||(needsNote&&note.trim().length<10)} onClick={()=>void save()}>{busy?"Salvando…":decision==="excluded"?"Registrar exclusão com justificativa":"Registrar conferência completa"}</button>
   </fieldset><p>O original e as revisões são preservados. Esta ação não aprova nem publica um resumo.</p></>}
  <button type="button" disabled={busy} onClick={()=>void refresh()}>Atualizar conferência</button>
 </section>;
}
