"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, HeartHandshake } from "lucide-react";
import { supportiveMessages, type OutreachPreview, type OutreachResult } from "@/modules/messages/outreach";
import { mergeOutreachResults, pendingOutreachRecipients, type OutreachAttempt } from "@/modules/messages/outreach-attempt";
import styles from "./doctor-outreach-carousel.module.css";

export function DoctorOutreachCarousel({ tenantId }: { tenantId: string }) {
  const id = useId();
  const review = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<string[]>(supportiveMessages.map((message) => message.content));
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<OutreachPreview | null>(null);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [attempt, setAttempt] = useState<OutreachAttempt | null>(null);
  const [error, setError] = useState("");
  const selected = supportiveMessages[index];
  const hasDraft = sending || Boolean(attempt && pendingOutreachRecipients(attempt).length) || drafts.some((draft, position) => draft !== supportiveMessages[position].content);
  const storageKey = preview ? `vivance-outreach:${tenantId}:${preview.doctorId}` : null;

  useEffect(() => {
    if (!hasDraft) return;
    const approvedSubmits = new WeakSet<HTMLFormElement>();
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protect = (event: Event) => {
      if (event.defaultPrevented) return false;
      if (sending || !window.confirm("Há uma mensagem em preparação. Deseja sair? O andamento de envios já confirmados ficará guardado nesta aba.")) {
        event.preventDefault(); event.stopPropagation();
        if (sending) setError("Aguarde o término do envio antes de sair.");
        return false;
      }
      return true;
    };
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = (event.target as Element | null)?.closest<HTMLElement>("a[href], [data-leave-clinic]");
      if (!target || (target instanceof HTMLAnchorElement && target.href === window.location.href)) return;
      if (protect(event) && target.hasAttribute("data-leave-clinic")) {
        const form = target.closest("form");
        if (form) {
          approvedSubmits.add(form);
          window.setTimeout(() => approvedSubmits.delete(form), 0);
        }
      }
    };
    const guardSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented || !(event.target instanceof HTMLFormElement)) return;
      const form = event.target;
      if (!form.querySelector("[data-leave-clinic]")) return;
      if (approvedSubmits.has(form)) { approvedSubmits.delete(form); return; }
      protect(event);
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    document.addEventListener("submit", guardSubmit, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guard, true); document.removeEventListener("submit", guardSubmit, true); };
  }, [hasDraft, sending]);

  function persist(value: OutreachAttempt, key = storageKey) {
    if (!key) throw new Error("Carregue os pacientes antes de enviar.");
    try { sessionStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new Error("Não foi possível guardar o andamento nesta aba. Libere espaço antes de enviar."); }
  }

  async function prepare() {
    if (busy.current) return;
    busy.current = true; setEditing(true); setPending(true); setError(""); setConfirmed(false);
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/messages/outreach`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar os pacientes. Tente novamente.");
      const next = body as OutreachPreview;
      setPreview(next);
      const saved = sessionStorage.getItem(`vivance-outreach:${tenantId}:${next.doctorId}`);
      if (saved) {
        const previous = JSON.parse(saved) as OutreachAttempt;
        if (previous.tenantId === tenantId && previous.doctorId === next.doctorId && typeof previous.batchKey === "string" && typeof previous.content === "string" && Array.isArray(previous.results) && Array.isArray(previous.patientIds)) setAttempt(previous);
        else throw new Error("O andamento salvo não pôde ser lido. Use as conversas individuais.");
      }
    } catch (failure) { setPreview(null); setError(failure instanceof Error ? failure.message : "Não foi possível preparar o envio. Tente novamente."); }
    finally { busy.current = false; setPending(false); requestAnimationFrame(() => review.current?.focus({ preventScroll: true })); }
  }

  async function send() {
    if (busy.current || !preview?.canSend || !confirmed) return;
    let current: OutreachAttempt = attempt ?? {
      tenantId, doctorId: preview.doctorId, batchKey: crypto.randomUUID(),
      content: drafts[index].trim().replace(/\s+/gu, " "), patientIds: preview.recipients.map((recipient) => recipient.id), results: [],
    };
    if (!current.content || !current.patientIds.length) return;
    if (current.tenantId !== tenantId || current.doctorId !== preview.doctorId) {
      setError("O contexto da clínica mudou. Reabra a revisão antes de enviar."); return;
    }
    busy.current = true; setSending(true); setError("");
    try {
      persist(current); setAttempt(current);
      const remaining = pendingOutreachRecipients(current);
      for (let offset = 0; offset < remaining.length; offset += 5) {
        const response = await fetch(`/api/v1/clinics/${tenantId}/messages/outreach`, {
          method: "POST", headers: { "content-type": "application/json", "idempotency-key": current.batchKey },
          body: JSON.stringify({ patient_ids: remaining.slice(offset, offset + 5), content: current.content }),
          signal: AbortSignal.timeout(20_000),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Não foi possível confirmar todos os envios. Tente novamente.");
        current = mergeOutreachResults(current, body.results as OutreachResult[]);
        setAttempt(current); persist(current);
        if ((body.results as OutreachResult[]).some((result) => result.error?.startsWith("Limite de envio"))) break;
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível confirmar todos os envios. Tente novamente com o mesmo texto."); }
    finally { busy.current = false; setSending(false); setConfirmed(false); }
  }

  function move(direction: number) {
    setIndex((current) => (current + direction + supportiveMessages.length) % supportiveMessages.length);
    setEditing(false); setPreview(null); setError(""); setConfirmed(false);
  }

  const recipients = attempt ? attempt.patientIds.map((patientId) => ({ id: patientId, displayName: preview?.recipients.find((recipient) => recipient.id === patientId)?.displayName ?? "Paciente sem acesso ativo — envio será revalidado" })) : preview?.recipients ?? [];
  const sent = attempt?.results.filter((result) => result.status === "sent").length ?? 0;
  const failed = attempt?.results.filter((result) => result.status === "failed").length ?? 0;
  const remaining = attempt ? pendingOutreachRecipients(attempt).length : recipients.length;
  const ready = Boolean(preview?.canSend && recipients.length && remaining && confirmed && !pending && !sending);

  return (
    <section className={styles.outreach} aria-labelledby={`${id}-title`} aria-roledescription="carrossel">
      <header className={styles.header}>
        <div>
          <h3 id={`${id}-title`}><HeartHandshake size={20} aria-hidden="true" />Uma mensagem de incentivo</h3>
          <p>Escolha uma sugestão para enviar aos seus pacientes no aplicativo.</p>
        </div>
        <div className={styles.controls} aria-label="Escolher mensagem">
          <button type="button" onClick={() => move(-1)} disabled={pending || sending || Boolean(attempt)} aria-label="Mensagem anterior"><ChevronLeft size={20} aria-hidden="true" /></button>
          <span aria-live="polite" aria-atomic="true">{index + 1} de {supportiveMessages.length}</span>
          <button type="button" onClick={() => move(1)} disabled={pending || sending || Boolean(attempt)} aria-label="Próxima mensagem"><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
      </header>
      <div key={index} className={styles.message} role="group" aria-roledescription="slide" aria-label={`${index + 1} de ${supportiveMessages.length}: ${selected.title}`}>
        <strong>{selected.title}</strong><p>{attempt?.content ?? drafts[index]}</p>
      </div>
      {!editing ? <button type="button" className={styles.primary} onClick={prepare}>{attempt ? "Ver andamento do envio" : "Revisar e enviar"}</button> : null}
      {editing ? (
        <div ref={review} className={styles.review} tabIndex={-1} aria-labelledby={`${id}-review`} aria-busy={pending || sending}>
          <h4 id={`${id}-review`}>Revisar mensagem e destinatários</h4>
          <label htmlFor={`${id}-text`}>Texto que cada paciente receberá</label>
          <textarea id={`${id}-text`} value={attempt?.content ?? drafts[index]} readOnly={Boolean(attempt)} maxLength={4000} rows={4} onBlur={() => setDrafts((current) => current.map((value, position) => position === index ? value.trim().replace(/\s+/gu, " ") : value))} onChange={(event) => { setConfirmed(false); setDrafts((current) => current.map((value, position) => position === index ? event.target.value : value)); }} />
          {pending ? <p role="status">Carregando pacientes com acesso ativo…</p> : null}
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
          {error && !preview ? <button type="button" onClick={prepare} disabled={pending}>Tentar novamente</button> : null}
          {preview ? <>
            {preview.reason ? <p className={styles.notice}>{preview.reason}</p> : <p className={styles.notice}>Somente seus pacientes com vínculo e acesso ativo nesta clínica. A mensagem aparece em cada conversa individual.</p>}
            <p>{recipients.length} {recipients.length === 1 ? "destinatário" : "destinatários"}</p>
            {recipients.length ? <ul className={styles.recipients} aria-label="Lista completa de destinatários">{recipients.map((recipient) => {
              const result = attempt?.results.find((item) => item.patientId === recipient.id);
              return <li key={recipient.id}>{recipient.displayName}{result ? <span> · {result.status === "sent" ? "Enviada" : result.error}</span> : null}</li>;
            })}</ul> : <p>{preview.canSend ? "Nenhum paciente está elegível para este envio." : "A lista de destinatários estará disponível quando o envio for liberado."}</p>}
            {attempt ? <p role="status">{sent} {sent === 1 ? "mensagem enviada" : "mensagens enviadas"} · {failed} {failed === 1 ? "falha" : "falhas"}{remaining ? ` · ${remaining} para confirmar ou tentar novamente` : ""}.</p> : null}
            {preview.canSend && remaining ? <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={sending} onChange={(event) => setConfirmed(event.target.checked)} />Conferi o texto e a lista. Confirmo o envio {attempt ? "somente das mensagens restantes" : "para todos os destinatários acima"}.</label> : null}
            <button type="button" className={styles.primary} disabled={!ready || !(attempt?.content ?? drafts[index]).trim()} onClick={send}>{sending ? "Enviando…" : !preview.canSend ? "Envio coletivo indisponível" : attempt ? remaining ? "Tentar envios restantes" : failed ? "Envio encerrado" : "Envio concluído" : `Enviar para ${recipients.length} ${recipients.length === 1 ? "paciente" : "pacientes"}`}</button>
            {attempt && !remaining ? <button type="button" onClick={() => { if (storageKey) sessionStorage.removeItem(storageKey); setAttempt(null); setEditing(false); setPreview(null); }}>Concluir</button> : null}
          </> : null}
          <button type="button" disabled={pending || sending} onClick={() => setEditing(false)}>Fechar revisão</button>
        </div>
      ) : null}
    </section>
  );
}
