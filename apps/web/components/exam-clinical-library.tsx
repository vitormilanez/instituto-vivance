"use client";

import { useState, type FormEvent } from "react";
import "@/app/exam-library.css";

type Source = {
  id: string; source_title: string; source_url: string; source_version: string;
  excerpt: string; population: string; exclusions: string; status: string;
  valid_until: string | null;
};
const labels: Record<string,string> = { in_review: "Para revisar", current: "Autorizada", superseded: "Retirada" };

export function ExamClinicalLibrary({ tenantId }: { tenantId: string }) {
  const [sources,setSources] = useState<Source[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [requestId,setRequestId] = useState<string | null>(null);
  const [notes,setNotes] = useState<Record<string,string>>({});
  const endpoint = `/api/v1/clinics/${tenantId}/exam-library`;

  async function read() {
    const response = await fetch(endpoint,{ cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar as fontes.");
    setSources(result.data ?? []); setLoaded(true);
  }
  async function load() {
    if (loaded || busy) return;
    setBusy(true);setError("");
    try { await read(); } catch(cause) { setError(cause instanceof Error ? cause.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const list = (key: string) => value(key).split(";").map(entry=>entry.trim()).filter(Boolean);
    const age = (key: string) => value(key) ? { [key]: Number(value(key)) } : {};
    const key = requestId ?? crypto.randomUUID(); setRequestId(key);
    setBusy(true);setError("");setMessage("");
    try {
      const response = await fetch(endpoint,{ method: "POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:key,source:{
        title:value("title"),url:value("url"),version:value("version"),excerpt:value("excerpt"),population:value("population"),
        exclusions:value("exclusions"),validUntil:value("validUntil") || null,
        applicability:{ analytes:list("analytes"),units:list("units"),referencePositions:[value("position")],
          requiredContext:list("requiredContext"),...age("minAge"),...age("maxAge") },
      }}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar a fonte.");
      form.reset();setRequestId(null);await read();setMessage("Fonte salva para revisão. Autorize a versão abaixo após conferir o original.");
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  async function review(source: Source,status: string) {
    setBusy(true);setError("");setMessage("");
    try {
      const response = await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({sourceId:source.id,status,note:notes[source.id] ?? ""})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível revisar a fonte.");
      await read();setMessage(status === "current" ? "Versão autorizada para os próximos resumos compatíveis." : "Fonte retirada das próximas gerações.");
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Tente novamente."); }
    finally { setBusy(false); }
  }

  return <details className="panel exam-library" onToggle={event=>{ if(event.currentTarget.open) void load(); }}>
    <summary>Fontes clínicas autorizadas</summary>
    <p>Cadastre trechos e condições de uso para as possibilidades apresentadas ao médico. Cada versão precisa da sua conferência e autorização.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!loaded && busy && <p role="status">Consultando fontes…</p>}
    {loaded && !sources.length && <p>Nenhuma fonte cadastrada. O resumo pode organizar fatos revisados; possibilidades aguardam fontes aplicáveis.</p>}
    <div className="exam-library-sources">{sources.map(source=><article key={source.id} className="exam-library-source">
      <div className="exam-library-heading"><h3>{source.source_title}</h3><span>{labels[source.status] ?? source.status}</span></div>
      <p>Versão {source.source_version}{source.valid_until ? ` · Rever até ${source.valid_until.split("-").reverse().join("/")}` : ""}</p>
      <blockquote>{source.excerpt}</blockquote>
      <p>População: {source.population}<br/>Exclusões: {source.exclusions}</p>
      <a href={source.source_url} target="_blank" rel="noreferrer">Conferir fonte original</a>
      {source.status !== "superseded" && <div className="exam-library-review">
        <label htmlFor={`source-note-${source.id}`}>Registro da conferência</label>
        <textarea id={`source-note-${source.id}`} value={notes[source.id] ?? ""} onChange={event=>setNotes({...notes,[source.id]:event.target.value})} maxLength={1000} rows={2} placeholder="Registre aplicabilidade e limitações conferidas." />
        <div className="form-actions">
          {source.status === "in_review" && <button className="button" type="button" disabled={busy || !source.valid_until || (notes[source.id] ?? "").trim().length < 10} onClick={()=>void review(source,"current")}>Autorizar esta versão</button>}
          <button className="button secondary" type="button" disabled={busy || (notes[source.id] ?? "").trim().length < 10} onClick={()=>void review(source,"superseded")}>Retirar fonte</button>
        </div>
      </div>}
    </article>)}</div>
    <details className="exam-library-new"><summary>Cadastrar uma fonte ou nova versão</summary>
      <form onSubmit={submit} className="exam-library-form">
        <label>Título da fonte<input name="title" required minLength={3} maxLength={200}/></label>
        <label>Endereço do original<input name="url" type="url" required placeholder="https://" maxLength={1500}/></label>
        <div className="exam-library-grid"><label>Versão ou ano<input name="version" required maxLength={100}/></label><label>Rever até<input name="validUntil" type="date" required/></label></div>
        <label>Trecho literal da fonte<textarea name="excerpt" required minLength={20} maxLength={6000} rows={4}/></label>
        <label>População à qual se aplica<input name="population" required minLength={3} maxLength={1000}/></label>
        <label>Exclusões e limitações<textarea name="exclusions" required minLength={3} maxLength={1000} rows={2} placeholder="Descreva as exclusões. Se não houver, registre Nenhuma exclusão adicional."/></label>
        <div className="exam-library-grid"><label>Exames — nomes exatos, separados por ;<input name="analytes" required placeholder="Glicose; Hemoglobina glicada"/></label><label>Unidades exatas, separadas por ;<input name="units" required placeholder="mg/dL; %"/></label></div>
        <div className="exam-library-grid"><label>Comparação com a referência<select name="position"><option value="above">Acima</option><option value="below">Abaixo</option><option value="within">Dentro</option></select></label><label>Contexto adicional obrigatório<input name="requiredContext" placeholder="Condições, separadas por ;"/></label></div>
        <p className="muted">Fontes que exigem contexto ainda não conferido ou exclusões específicas ficam fora da geração automática.</p>
        <div className="exam-library-grid"><label>Idade mínima, se aplicável<input name="minAge" type="number" min={0} max={130}/></label><label>Idade máxima, se aplicável<input name="maxAge" type="number" min={0} max={130}/></label></div>
        <button type="submit" className="button" disabled={busy}>{busy ? "Salvando…" : "Salvar para revisão"}</button>
      </form>
    </details>
  </details>;
}
