"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ExamDocumentResult, ExamResult, ExamResultsView, ExamReview } from "@/modules/exams/results";
import { displayedExamValue, displayedExamUnit, displayedExamReference, displayedExamObservedDate, examReferencePosition, latestExamReview } from "@/modules/exams/results";
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

function ResultReview({ item, tenantId, documentId, onReviewed, onBusyChange }: { item: ExamResult; tenantId: string; documentId: string; onReviewed: (itemId: string, review: ExamReview) => void; onBusyChange: (itemId: string, busy: boolean) => void }) {
  const router = useRouter();
  const latest = latestExamReview(item);
  const editableItem = latest?.decision === "rejected" ? { ...item, reviews: item.reviews.filter((review) => review.decision !== "rejected") } : item;
  const currentValue = displayedExamValue(editableItem) ?? "";
  const currentUnit = displayedExamUnit(editableItem) ?? "";
  const currentReference = displayedExamReference(editableItem) ?? "";
  const currentDate = displayedExamObservedDate(editableItem) ?? "";
  const [decision, setDecision] = useState<"confirmed" | "corrected" | "rejected">("confirmed");
  const [replacement, setReplacement] = useState(currentValue);
  const [unit, setUnit] = useState(currentUnit);
  const [reference, setReference] = useState(currentReference);
  const [observedDate, setObservedDate] = useState(currentDate);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const changed = replacement.trim() !== currentValue || unit.trim() !== currentUnit
    || reference.trim() !== currentReference || observedDate !== currentDate;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const correctedData = decision === "corrected" && replacement.trim() !== currentValue
      ? { [item.item_kind === "narrative" ? "narrative_text" : "literal_value"]: replacement.trim() } : null;
    const corrections = decision === "corrected" ? {
      ...(unit.trim() !== currentUnit ? { correctedUnit: unit.trim() || null } : {}),
      ...(reference.trim() !== currentReference ? { correctedReferenceText: reference.trim() || null } : {}),
      ...(observedDate !== currentDate ? { correctedObservedDate: observedDate || null } : {}),
    } : {};
    const payload = JSON.stringify({ itemId: item.id, expectedVersion: latest?.version ?? 0, decision, correctedData, ...corrections, note: note.trim() || null });
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    setBusy(true);
    onBusyChange(item.id, true);
    setError("");
    setConflict(false);
    try {
      const response = await fetch(`/api/v1/clinics/${encodeURIComponent(tenantId)}/documents/${encodeURIComponent(documentId)}/extraction/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), requestId: request.current.id }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json();
      if (response.status === 409) setConflict(true);
      if (!response.ok || typeof body.reviewId !== "string" || typeof body.version !== "number") throw new Error(body.error ?? "Não foi possível registrar a conferência.");
      onReviewed(item.id, { id: body.reviewId, version: body.version, decision,
        corrected_data: body.correctedData ?? null, reviewed_at: new Date().toISOString() });
      request.current = null;
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a conferência.");
    } finally {
      setBusy(false);
      onBusyChange(item.id, false);
    }
  }
  return <form className="exam-results-review-form" onSubmit={(event) => void submit(event)}>
    <h5>Conferir resultado</h5>
    <p>Compare com o original. Suas alterações ficam no histórico, com uma nova revisão.</p>
    {latest && <p className="exam-results-saved">Revisão {latest.version} · {rowStatus(item)}</p>}
    {item.reviews.length > 0 && <details className="exam-results-history"><summary>Histórico de revisões · {item.reviews.length}</summary><ol>{[...item.reviews].sort((a, b) => b.version - a.version).map((review) => <li key={review.id}>
      <strong>Revisão {review.version} · {review.decision === "corrected" ? "Corrigido" : review.decision === "rejected" ? "Descartado" : "Conferido"}</strong><span>{date(review.reviewed_at)}</span>
      {review.decision === "corrected" && review.corrected_data && <dl>{Object.entries(review.corrected_data).map(([field, value]) => <div key={field}><dt>{({ literal_value: "Valor", narrative_text: "Texto", unit_text: "Unidade", reference_text: "Referência", observed_on: "Data do exame" } as Record<string, string>)[field] ?? field}</dt><dd>{value === null ? "Não informado" : field === "observed_on" && typeof value === "string" ? date(value) : String(value)}</dd></div>)}</dl>}
    </li>)}</ol></details>}
    <fieldset disabled={busy}>
      <label>O que deseja fazer?<select value={decision} onChange={(event) => { setDecision(event.target.value as typeof decision); setError(""); }}><option value="confirmed">Confirmar transcrição</option><option value="corrected">Corrigir dados</option><option value="rejected">Descartar item</option></select></label>
      {decision === "corrected" && <div className="exam-results-correction-fields">
        {item.item_kind === "narrative" ? <label>Texto do laudo<textarea required={Boolean(currentValue)} maxLength={12000} value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>
          : <div className="exam-results-value-unit"><label>Valor<input required={Boolean(currentValue)} type="text" maxLength={500} value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label><label>Unidade<input type="text" maxLength={80} placeholder="Não informada" value={unit} onChange={(event) => setUnit(event.target.value)} /></label></div>}
        {item.item_kind === "laboratory" && <label>Referência no laudo<textarea rows={2} maxLength={1000} placeholder="Não informada" value={reference} onChange={(event) => setReference(event.target.value)} /></label>}
        <label>Data do exame<input type="date" value={observedDate} onChange={(event) => setObservedDate(event.target.value)} /></label>
        <p className="exam-results-field-help">Mantenha a unidade e a referência do laudo. Deixe em branco o que não estiver informado.</p>
      </div>}
      {decision === "rejected" ? <label>Motivo do descarte<textarea required maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        : <details className="exam-results-note"><summary>Adicionar nota (opcional)</summary><label>Nota da revisão<textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label></details>}
      {error && <p role="alert">{error}</p>}
      {conflict && <button type="button" className="exam-results-conflict-refresh" onClick={() => router.refresh()}>Atualizar e conferir a revisão mais recente</button>}
      <button type="submit" disabled={busy || (decision === "corrected" && !changed)}>{busy ? "Salvando…" : decision === "corrected" ? "Salvar correções" : decision === "rejected" ? "Registrar descarte" : "Confirmar transcrição"}</button>
    </fieldset>
  </form>;
}

function ResultDocument({ document, tenantId, filter, onReviewed, onBusyChange, reviewBusy }: { document: ExamDocumentResult; tenantId: string; filter: Filter; onReviewed: (documentId: string, itemId: string, review: ExamReview) => void; onBusyChange: (itemId: string, busy: boolean) => void; reviewBusy: boolean }) {
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
          <td data-label="Valor">{value ?? "—"}{item.item_kind === "laboratory" && displayedExamUnit(item) ? <small> {displayedExamUnit(item)}</small> : null}{displayedExamObservedDate(item) && displayedExamObservedDate(item) !== document.observedOn && <small>Exame de {date(displayedExamObservedDate(item))}</small>}</td>
          <td data-label="Referência no laudo">{displayedExamReference(item) ?? "—"}{position === "below" || position === "above" ? <small className="exam-results-outside">{position === "below" ? "Abaixo" : "Acima"} do intervalo escrito no laudo</small> : null}</td>
          <td data-label="Revisão"><span className="exam-results-review" data-pending={!latestExamReview(item)}>{rowStatus(item)}</span></td>
        </tr>;
      })}</tbody></table>{rows.length > 6 && <button type="button" className="exam-results-show-all" disabled={reviewBusy} aria-expanded={showAll} onClick={() => { setShowAll(!showAll); if (showAll && !rows.slice(0, 6).some((item) => item.id === selected)) setSelected(null); }}>{showAll ? "Mostrar menos resultados" : `Mostrar todos os ${rows.length} resultados`}</button>}</div>{current && <aside ref={sourcePanel} className="exam-results-source" aria-live="polite"><h4>{current.literal_name}</h4><p>Página {current.page_number} · {rowStatus(current)}</p><p><strong>Trecho de origem</strong></p><blockquote>{current.source_excerpt}</blockquote><a href={`${original}#page=${current.page_number}`} target="_blank" rel="noreferrer">Abrir página original</a><ResultReview key={`${current.id}:${latestExamReview(current)?.version ?? 0}`} item={current} tenantId={tenantId} documentId={document.id} onReviewed={(itemId, review) => onReviewed(document.id, itemId, review)} onBusyChange={onBusyChange} /></aside>}</div> : <p className="exam-results-no-match">{document.processingStatus === "pending" ? "Na fila para organizar os resultados." : document.processingStatus === "processing" ? "Organizando resultados…" : document.processingStatus === "failed" ? "Leitura não concluída — conferir original." : document.processingStatus === "completed" ? "Leitura concluída sem itens organizados. Confira o original." : filter === "all" ? "Este arquivo ainda não tem resultados organizados. Abra o original para conferir." : "Nenhum resultado neste filtro."}</p>}
      <a className="exam-results-original" href={original} target="_blank" rel="noreferrer">Abrir laudo original</a>
    </div>
  </details>;
}

export function ExamResultsPanel({ view, tenantId }: { view: ExamResultsView; tenantId: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [localReviews, setLocalReviews] = useState<Record<string, ExamReview[]>>({});
  const [reviewing, setReviewing] = useState<Set<string>>(() => new Set());
  const documents = view.documents.map((document) => ({ ...document, items: document.items.map((item) => ({
    ...item,
    reviews: [...item.reviews, ...(localReviews[item.id] ?? []).filter((review) => !item.reviews.some((saved) => saved.id === review.id))],
  })) }));
  function onBusyChange(itemId: string, busy: boolean) {
    setReviewing((current) => {
      const next = new Set(current);
      if (busy) next.add(itemId); else next.delete(itemId);
      return next;
    });
  }
  function onReviewed(_documentId: string, itemId: string, review: ExamReview) {
    setLocalReviews((current) => ({ ...current, [itemId]: [...(current[itemId] ?? []).filter((saved) => saved.id !== review.id), review] }));
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
