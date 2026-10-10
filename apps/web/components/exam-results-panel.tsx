"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ExamDocumentResult, ExamResult, ExamResultsView } from "@/modules/exams/results";
import { displayedExamValue, examReferencePosition, latestExamReview } from "@/modules/exams/results";
import "./exam-results-panel.css";

type Filter = "all" | "pending" | "outside";
const date = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : null;
const documentDate = (document: ExamDocumentResult) => document.observedOn
  ? `Exame de ${date(document.observedOn)}` : `Enviado em ${date(document.receivedAt)}`;

function rowStatus(item: ExamResult) {
  const review = latestExamReview(item);
  if (review?.decision === "confirmed") return "Transcrição conferida";
  if (review?.decision === "corrected") return "Corrigido pelo médico";
  if (review?.decision === "rejected") return "Descartado pelo médico";
  return "Extraído por IA · conferir";
}

function ResultReview({ item, tenantId, documentId, onReviewed, onBusyChange }: { item: ExamResult; tenantId: string; documentId: string; onReviewed: (itemId: string, reviewId: string, decision: string, correctedData: Record<string, string> | null) => void; onBusyChange: (itemId: string, busy: boolean) => void }) {
  const [decision, setDecision] = useState<"confirmed" | "corrected" | "rejected">("confirmed");
  const [replacement, setReplacement] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const correctedData = decision === "corrected"
      ? { [item.item_kind === "narrative" ? "narrative_text" : "literal_value"]: replacement.trim() }
      : null;
    const payload = JSON.stringify({ itemId: item.id, decision, correctedData, note: note.trim() || null });
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    setBusy(true);
    onBusyChange(item.id, true);
    setError("");
    try {
      const response = await fetch(`/api/v1/clinics/${encodeURIComponent(tenantId)}/documents/${encodeURIComponent(documentId)}/extraction/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), requestId: request.current.id }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json();
      if (!response.ok || typeof body.reviewId !== "string") throw new Error(body.error ?? "Não foi possível registrar a conferência.");
      onReviewed(item.id, body.reviewId, decision, correctedData);
      request.current = null;
      setReplacement("");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a conferência.");
    } finally {
      setBusy(false);
      onBusyChange(item.id, false);
    }
  }
  return <form className="exam-results-review-form" onSubmit={(event) => void submit(event)}>
    <h5>Conferir transcrição</h5>
    <p>Compare o trecho com a página original antes de registrar. A decisão fica no histórico médico.</p>
    <label>Decisão<select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><option value="confirmed">Confirmar transcrição</option><option value="corrected">Corrigir transcrição</option><option value="rejected">Descartar item</option></select></label>
    {decision === "corrected" && <label>Texto correto<textarea required maxLength={item.item_kind === "narrative" ? 12000 : 500} value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>}
    <label>Nota {decision === "rejected" ? "obrigatória" : "opcional"}<textarea required={decision === "rejected"} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "Registrando…" : "Registrar conferência"}</button>
  </form>;
}

function ResultDocument({ document, tenantId, filter, onReviewed, onBusyChange, reviewBusy }: { document: ExamDocumentResult; tenantId: string; filter: Filter; onReviewed: (documentId: string, itemId: string, reviewId: string, decision: string, correctedData: Record<string, string> | null) => void; onBusyChange: (itemId: string, busy: boolean) => void; reviewBusy: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const sourcePanel = useRef<HTMLElement>(null);
  const linkableIds = document.items.map((item) => item.id).join(",");
  useEffect(() => {
    let frame = 0;
    const reveal = () => {
      let target = "";
      try { target = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!target.startsWith("resultado-")) return;
      const itemId = target.slice("resultado-".length);
      if (!linkableIds.split(",").includes(itemId)) return;
      frame = requestAnimationFrame(() => {
        if (disclosure.current) disclosure.current.open = true;
        setShowAll(true);
        setSelected(itemId);
      });
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", reveal); };
  }, [linkableIds]);
  useEffect(() => {
    if (!selected || !window.matchMedia("(max-width: 800px)").matches) return;
    const frame = requestAnimationFrame(() => sourcePanel.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  const rows = document.items.filter((item) => filter === "all" || (filter === "pending"
    ? !latestExamReview(item)
    : examReferencePosition(item) === "below" || examReferencePosition(item) === "above"));
  const visibleRows = showAll ? rows : rows.slice(0, 6);
  const current = visibleRows.find((item) => item.id === selected) ?? null;
  const original = `/api/v1/clinics/${encodeURIComponent(tenantId)}/documents/${encodeURIComponent(document.id)}/download`;
  const pending = document.items.filter((item) => !latestExamReview(item)).length;
  const processingLabel = document.processingStatus === "pending" ? "Na fila"
    : document.processingStatus === "processing" ? "Organizando resultados"
    : document.processingStatus === "failed" ? "Leitura não concluída — conferir original" : null;
  return <details ref={disclosure} className="exam-results-document" id={`exam-documento-${document.id}`}>
    <summary><span className="exam-results-document-title"><strong>{document.title}</strong><small>{documentDate(document)}{document.issuer ? ` · ${document.issuer}` : ""}</small></span><span className="exam-results-document-count">{document.items.length} {document.items.length === 1 ? "resultado" : "resultados"}{pending ? ` · ${pending} para conferir` : ""}{processingLabel ? ` · ${processingLabel}` : ""}</span></summary>
    <div className="exam-results-document-body">
      {processingLabel && document.items.length > 0 && <p className="exam-results-processing" role="status">{processingLabel}. Os resultados exibidos pertencem à última leitura disponível.</p>}
      {document.summary.length > 0 && <div className="exam-results-report-summary"><h4>Do laudo</h4><ul>{document.summary.map((line, index) => <li key={index}>{line}</li>)}</ul></div>}
      {document.qualityNotes.length > 0 && <details className="exam-results-quality"><summary>Notas da leitura · {document.qualityNotes.length} {document.qualityNotes.length === 1 ? "observação" : "observações"}</summary><ul>{document.qualityNotes.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
      {rows.length ? <div className="exam-results-layout"><div className="exam-results-table-wrap"><table><thead><tr><th scope="col">Resultado</th><th scope="col">Valor</th><th scope="col">Referência no laudo</th><th scope="col">Revisão</th></tr></thead><tbody>{visibleRows.map((item) => {
        const position = examReferencePosition(item);
        const value = displayedExamValue(item);
        return <tr key={item.id} id={`resultado-${item.id}`} data-selected={selected === item.id}>
          <th scope="row"><button type="button" aria-expanded={selected === item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>{item.literal_name}</button></th>
          <td data-label="Valor">{value ?? "—"}{item.item_kind === "laboratory" && item.unit_text ? <small> {item.unit_text}</small> : null}</td>
          <td data-label="Referência no laudo">{item.reference_text ?? "—"}{position === "below" || position === "above" ? <small className="exam-results-outside">{position === "below" ? "Abaixo" : "Acima"} do intervalo escrito no laudo</small> : null}</td>
          <td data-label="Revisão"><span className="exam-results-review" data-pending={!latestExamReview(item)}>{rowStatus(item)}</span></td>
        </tr>;
      })}</tbody></table>{rows.length > 6 && <button type="button" className="exam-results-show-all" disabled={reviewBusy} aria-expanded={showAll} onClick={() => { setShowAll(!showAll); if (showAll && !rows.slice(0, 6).some((item) => item.id === selected)) setSelected(null); }}>{showAll ? "Mostrar menos resultados" : `Mostrar todos os ${rows.length} resultados`}</button>}</div>{current && <aside ref={sourcePanel} className="exam-results-source" aria-live="polite"><h4>{current.literal_name}</h4><p>Página {current.page_number} · {rowStatus(current)}</p><p><strong>Trecho de origem</strong></p><blockquote>{current.source_excerpt}</blockquote><a href={`${original}#page=${current.page_number}`} target="_blank" rel="noreferrer">Abrir página original</a><ResultReview key={current.id} item={current} tenantId={tenantId} documentId={document.id} onReviewed={(itemId, reviewId, decision, correctedData) => onReviewed(document.id, itemId, reviewId, decision, correctedData)} onBusyChange={onBusyChange} /></aside>}</div> : <p className="exam-results-no-match">{document.processingStatus === "pending" ? "Na fila para organizar os resultados." : document.processingStatus === "processing" ? "Organizando resultados…" : document.processingStatus === "failed" ? "Leitura não concluída — conferir original." : document.processingStatus === "completed" ? "Leitura concluída sem itens organizados. Confira o original." : filter === "all" ? "Este arquivo ainda não tem resultados organizados. Abra o original para conferir." : "Nenhum resultado neste filtro."}</p>}
      <a className="exam-results-original" href={original} target="_blank" rel="noreferrer">Abrir laudo original</a>
    </div>
  </details>;
}

export function ExamResultsPanel({ view, tenantId }: { view: ExamResultsView; tenantId: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [localReviews, setLocalReviews] = useState<Record<string, ExamResult["reviews"][number]>>({});
  const [reviewing, setReviewing] = useState<Set<string>>(() => new Set());
  const documents = view.documents.map((document) => ({ ...document, items: document.items.map((item) => ({
    ...item,
    reviews: localReviews[item.id] && !item.reviews.some((review) => review.id === localReviews[item.id].id)
      ? [...item.reviews, localReviews[item.id]] : item.reviews,
  })) }));
  function onBusyChange(itemId: string, busy: boolean) {
    setReviewing((current) => {
      const next = new Set(current);
      if (busy) next.add(itemId); else next.delete(itemId);
      return next;
    });
  }
  function onReviewed(documentId: string, itemId: string, reviewId: string, decision: string, correctedData: Record<string, string> | null) {
    const item = documents.find((document) => document.id === documentId)?.items.find((entry) => entry.id === itemId);
    setLocalReviews((current) => ({ ...current, [itemId]: {
      id: reviewId,
      version: Math.max(0, ...(item?.reviews.map((entry) => entry.version) ?? [])) + 1,
      decision, corrected_data: correctedData, reviewed_at: new Date().toISOString(),
    } }));
  }
  const refreshButton = <button type="button" className="exam-results-refresh" disabled={refreshing || reviewing.size > 0} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "Atualizando…" : "Atualizar resultados"}</button>;
  if (view.unavailable) return <section className="exam-results-panel" aria-label="Exames organizados"><h2>Exames organizados</h2><p>Resultados estruturados ainda não estão disponíveis neste ambiente. Os arquivos originais continuam abaixo.</p>{refreshButton}</section>;
  if (!documents.length) return null;
  const latest = documents[0];
  const total = documents.reduce((count, document) => count + document.items.length, 0);
  const pending = documents.reduce((count, document) => count + document.items.filter((item) => !latestExamReview(item)).length, 0);
  const visible = documents.filter((document) => filter === "all" || document.items.some((item) => filter === "pending"
    ? !latestExamReview(item)
    : examReferencePosition(item) === "below" || examReferencePosition(item) === "above"));
  return <section className="exam-results-panel" aria-labelledby="exam-results-heading">
    <header><div><h2 id="exam-results-heading">Exames organizados</h2><p>Último arquivo: {latest.title} · {documentDate(latest)}</p></div><div className="exam-results-header-actions"><p className="exam-results-totals">{total} {total === 1 ? "resultado" : "resultados"} · {pending} para conferir</p>{refreshButton}</div></header>
    <p className="exam-results-caution">Valores extraídos para conferência médica. Compare sempre com o laudo original; a indicação de intervalo usa apenas referências numéricas simples do próprio arquivo.</p>
    <div className="exam-results-filters" role="group" aria-label="Filtrar resultados">
      {([["all", "Todos"], ["pending", "Para conferir"], ["outside", "Fora da referência"]] as const).map(([key, label]) => <button type="button" key={key} disabled={reviewing.size > 0} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    <div className="exam-results-documents">{visible.length ? visible.map((document) => <ResultDocument key={document.id} document={document} tenantId={tenantId} filter={filter} onReviewed={onReviewed} onBusyChange={onBusyChange} reviewBusy={reviewing.size > 0} />) : <p className="exam-results-no-match">Nenhum resultado neste filtro.</p>}</div>
  </section>;
}
