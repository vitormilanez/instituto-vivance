"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Minus } from "lucide-react";
import type { ExamDocumentResult, ExamResult, ExamResultsView, ExamReview } from "@/modules/exams/results";
import { displayedExamValue, displayedExamValueWithUnit, displayedExamUnit, displayedExamReference, displayedExamObservedDate, examReferencePosition, latestExamReview, examProcessingMessage } from "@/modules/exams/results";
import "./exam-results-panel.css";

type Filter = "all" | "pending" | "outside" | "above" | "below" | "within";
const matchesFilter = (item: ExamResult, filter: Filter) => {
  if (filter === "all") return true;
  if (filter === "pending") return !latestExamReview(item);
  const position = examReferencePosition(item);
  return filter === "outside" ? position === "above" || position === "below" : position === filter;
};
const positionLabel = { above: "Acima da referência do laudo", below: "Abaixo da referência do laudo", within: "Dentro da referência do laudo" } as const;
const positionIcon = { above: ArrowUp, below: ArrowDown, within: Check } as const;
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
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeAttempt, setResumeAttempt] = useState<{ status: "pending" | "processing"; previousStatus: ExamDocumentResult["processingStatus"] } | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [pollStopped, setPollStopped] = useState(false);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const sourcePanel = useRef<HTMLElement>(null);
  const pollAttempts = useRef(0);
  const canResume = document.canResume ?? document.processingStatus === "failed";
  const awaitingServer = Boolean(resumeAttempt && document.processingStatus === resumeAttempt.previousStatus && document.canResume !== false);
  const processingStatus = awaitingServer ? resumeAttempt!.status : document.processingStatus;
  useEffect(() => {
    if (pollStopped || (processingStatus !== "pending" && processingStatus !== "processing") || (canResume && !awaitingServer)) return;
    const timer = window.setInterval(() => {
      pollAttempts.current += 1;
      router.refresh();
      if (pollAttempts.current >= 24) {
        window.clearInterval(timer);
        setResumeAttempt(null);
        setPollStopped(true);
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [processingStatus, canResume, awaitingServer, pollStopped, router]);
  async function resume() {
    if (resuming) return;
    setResuming(true);
    setResumeError("");
    pollAttempts.current = 0;
    setPollStopped(false);
    try {
      const response = await fetch(`/api/v1/clinics/${encodeURIComponent(tenantId)}/documents/${encodeURIComponent(document.id)}/extraction/resume`, {
        method: "POST", signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json().catch(() => null);
      const status = body?.data?.status;
      if (!response.ok || (status !== "pending" && status !== "processing")) throw new Error(typeof body?.error === "string" ? body.error : "Não foi possível retomar a organização. Tente novamente.");
      setResumeAttempt({ status, previousStatus: document.processingStatus });
      router.refresh();
    } catch (cause) {
      setResumeError(cause instanceof Error && cause.name === "Error" ? cause.message : "Não foi possível retomar a organização. Tente novamente.");
    } finally {
      setResuming(false);
    }
  }
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
  const rows = document.items.filter((item) => matchesFilter(item, filter));
  const visibleRows = showAll ? rows : rows.slice(0, 6);
  const current = visibleRows.find((item) => item.id === selected) ?? null;
  const original = `/api/v1/clinics/${encodeURIComponent(tenantId)}/documents/${encodeURIComponent(document.id)}/download`;
  const pending = document.items.filter((item) => !latestExamReview(item)).length;
  const processingLabel = processingStatus === "pending" ? "Na fila"
    : processingStatus === "processing" ? canResume && !awaitingServer ? "Organização interrompida" : "Organizando resultados"
    : processingStatus === "failed" ? "Organização não concluída" : null;
  return <details ref={disclosure} className="exam-results-document" id={`exam-documento-${document.id}`}>
    <summary><span className="exam-results-document-title"><strong>{document.title}</strong><small>{documentDate(document)}{document.issuer ? ` · ${document.issuer}` : ""}</small></span><span className="exam-results-document-count">{document.items.length} {document.items.length === 1 ? "resultado" : "resultados"}{pending ? ` · ${pending} para conferir` : ""}{processingLabel ? ` · ${processingLabel}` : ""}</span></summary>
    <div className="exam-results-document-body">
      {processingLabel && <p className="exam-results-processing" role="status">{processingStatus === "failed" ? examProcessingMessage(document) : canResume && !awaitingServer && processingStatus === "processing" ? "A organização parou antes de concluir. Você pode retomá-la." : `${processingLabel}.`}{document.items.length > 0 ? " Os resultados exibidos pertencem à última leitura disponível." : ""}</p>}
      {canResume && !awaitingServer && <div className="exam-results-resume"><button type="button" disabled={resuming || reviewBusy} onClick={() => void resume()}>{resuming ? "Solicitando retomada…" : "Retomar organização"}</button><span>O laudo original e as leituras anteriores permanecem disponíveis.</span></div>}
      {pollStopped && (processingStatus === "pending" || processingStatus === "processing") && !canResume && <p className="exam-results-processing" role="status">A atualização automática foi pausada. Use “Atualizar resultados” para verificar o andamento.</p>}
      {resumeError && <p className="exam-results-resume-error" role="alert">{resumeError}</p>}
      {document.summary.length > 0 && <div className="exam-results-report-summary"><h4>Do laudo</h4><ul>{document.summary.map((line, index) => <li key={index}>{line}</li>)}</ul></div>}
      {document.qualityNotes.length > 0 && <details className="exam-results-quality"><summary>Notas da leitura · {document.qualityNotes.length} {document.qualityNotes.length === 1 ? "observação" : "observações"}</summary><ul>{document.qualityNotes.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
      {rows.length ? <div className="exam-results-layout"><div className="exam-results-table-wrap"><table><thead><tr><th scope="col">Resultado</th><th scope="col">Valor</th><th scope="col">Referência no laudo</th><th scope="col">Revisão</th></tr></thead><tbody>{visibleRows.map((item) => {
        const position = examReferencePosition(item);
        return <tr key={item.id} id={`resultado-${item.id}`} data-selected={selected === item.id} data-reference-position={position ?? "unavailable"}>
          <th scope="row"><button type="button" aria-expanded={selected === item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>{item.literal_name}</button></th>
          <td data-label="Valor">{displayedExamValueWithUnit(item) ?? "—"}{displayedExamObservedDate(item) && displayedExamObservedDate(item) !== document.observedOn && <small>Exame de {date(displayedExamObservedDate(item))}</small>}</td>
          <td data-label="Referência no laudo">{displayedExamReference(item) ?? "—"}{item.item_kind === "laboratory" && latestExamReview(item)?.decision !== "rejected" && <small className="exam-results-reference-status" data-position={position ?? "unavailable"}>{position ? (() => { const Icon = positionIcon[position]; return <><Icon size={14} aria-hidden="true" />{positionLabel[position]}</>; })() : <><Minus size={14} aria-hidden="true" />Comparação indisponível</>}</small>}</td>
          <td data-label="Revisão"><span className="exam-results-review" data-pending={!latestExamReview(item)}>{rowStatus(item)}</span></td>
        </tr>;
      })}</tbody></table>{rows.length > 6 && <button type="button" className="exam-results-show-all" disabled={reviewBusy} aria-expanded={showAll} onClick={() => { setShowAll(!showAll); if (showAll && !rows.slice(0, 6).some((item) => item.id === selected)) setSelected(null); }}>{showAll ? "Mostrar menos resultados" : `Mostrar todos os ${rows.length} resultados`}</button>}</div>{current && <aside ref={sourcePanel} className="exam-results-source" aria-live="polite"><h4>{current.literal_name}</h4><p>Página {current.page_number} · {rowStatus(current)}{displayedExamObservedDate(current) ? ` · Exame de ${date(displayedExamObservedDate(current))}` : ""}</p><p><strong>Trecho de origem</strong></p><blockquote>{current.source_excerpt}</blockquote><a href={`${original}#page=${current.page_number}`} target="_blank" rel="noreferrer">Abrir página original</a><ResultReview key={`${current.id}:${latestExamReview(current)?.version ?? 0}`} item={current} tenantId={tenantId} documentId={document.id} onReviewed={(itemId, review) => onReviewed(document.id, itemId, review)} onBusyChange={onBusyChange} /></aside>}</div> : <p className="exam-results-no-match">{processingStatus === "pending" ? "Na fila para organizar os resultados." : processingStatus === "processing" ? canResume && !awaitingServer ? "A organização precisa ser retomada." : "Organizando resultados…" : processingStatus === "failed" ? "Confira o laudo original enquanto a organização não é concluída." : processingStatus === "completed" ? "Leitura concluída sem itens organizados. Confira o original." : filter === "all" ? "Este arquivo ainda não tem resultados organizados. Abra o original para conferir." : "Nenhum resultado neste filtro."}</p>}
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
  const positions = documents.flatMap((document) => document.items.map(examReferencePosition));
  const above = positions.filter((position) => position === "above").length;
  const below = positions.filter((position) => position === "below").length;
  const within = positions.filter((position) => position === "within").length;
  const visible = documents.filter((document) => filter === "all" || document.items.some((item) => matchesFilter(item, filter)));
  return <section className="exam-results-panel" aria-labelledby="exam-results-heading">
    <header><div><h2 id="exam-results-heading">Exames organizados</h2><p>Último arquivo: {latest.title} · {documentDate(latest)}</p></div><div className="exam-results-header-actions"><p className="exam-results-totals">{total} {total === 1 ? "resultado" : "resultados"} · {pending} para conferir</p>{refreshButton}</div></header>
    <p className="exam-results-caution">Valores extraídos para conferência médica. As indicações acima, abaixo e dentro usam apenas faixas numéricas simples do próprio laudo; não são uma interpretação clínica. Compare com o original.</p>
    <div className="exam-results-filters" role="group" aria-label="Filtrar resultados">
      {([["outside", `Fora da referência · ${above + below}`], ["above", `Acima · ${above}`], ["below", `Abaixo · ${below}`], ["pending", `Para conferir · ${pending}`], ["within", `Dentro · ${within}`], ["all", `Todos · ${total}`]] as const).map(([key, label]) => <button type="button" key={key} disabled={reviewing.size > 0} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    <div className="exam-results-documents">{visible.length ? visible.map((document) => <ResultDocument key={document.id} document={document} tenantId={tenantId} filter={filter} onReviewed={onReviewed} onBusyChange={onBusyChange} reviewBusy={reviewing.size > 0} />) : <p className="exam-results-no-match">Nenhum resultado neste filtro.</p>}</div>
  </section>;
}
