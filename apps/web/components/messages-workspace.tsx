"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type {
  MessageRecipient,
  PatientMessages,
  SelectedConversation,
  SelectedPatientMessageContext,
  StaffMessages,
} from "@/modules/messages/service";
import { clinicalTime } from "./encounter-editor";
import { PrescriptionsPanel } from "@/components/prescriptions-panel";

type ConversationInitial = {
  clinic: StaffMessages["clinic"];
  userId: string;
  recipients: MessageRecipient[];
  selected: SelectedConversation | null;
  context?: SelectedPatientMessageContext | null;
  messages: StaffMessages["messages"];
  references: StaffMessages["references"];
  page: number;
  hasNext: boolean;
  lastReadAt: string | null;
};

function conversationHref(
  base: string,
  recipientParam: "paciente" | "medico",
  recipient: string,
  page = 1,
) {
  const query = new URLSearchParams({ [recipientParam]: recipient });
  if (page > 1) query.set("pagina", String(page));
  return `${base}?${query}`;
}

function initialsFor(name: string) {
  return name
    .replace(/^(Dra?\.)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function contextDate(value: string) {
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(instant);
}

function ContextCollectionCard({
  title,
  empty,
  context,
}: {
  title: string;
  empty: string;
  context: SelectedPatientMessageContext["documents"];
}) {
  return (
    <article className="message-context-card">
      <h3>{title}</h3>
      {context.state === "error" ? (
        <p>Não foi possível carregar agora.</p>
      ) : context.latest ? (
        <>
          <strong title={context.latest.title}>{context.latest.title}</strong>
          <small>
            {context.count} {context.count === 1 ? "item" : "itens"} · {contextDate(context.latest.at)}
          </small>
          <Link href={context.latest.href}>Abrir</Link>
        </>
      ) : (
        <p>{empty}</p>
      )}
    </article>
  );
}

function WeightContextCard({
  href,
  weight,
}: {
  href: string;
  weight: SelectedPatientMessageContext["weight"];
}) {
  const latest = weight.state === "ready" ? weight.points.at(-1) : null;
  const values = weight.state === "ready" ? weight.points.map((point) => point.value) : [];
  const low = Math.min(...values) - 0.5;
  const high = Math.max(...values) + 0.5;
  const coordinate = (value: number, index: number) => ({
    x: 6 + (index * 108) / Math.max(1, values.length - 1),
    y: 6 + ((high - value) / Math.max(0.1, high - low)) * 32,
  });
  return (
    <article className="message-context-card message-context-weight">
      <h3>Evolução</h3>
      {weight.state === "error" ? (
        <p>Não foi possível carregar agora.</p>
      ) : !latest ? (
        <p>Nenhum peso informado.</p>
      ) : (
        <>
          <strong>
            {new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(latest.value)} kg
          </strong>
          <small>{contextDate(latest.date)}</small>
          <svg viewBox="0 0 120 44" role="img" aria-label={values.length > 1 ? `Últimos ${values.length} pesos informados` : "Um peso informado; ainda não há tendência"}>
            <path d="M6 39H114" className="message-context-axis" />
            {values.length > 1 ? (
              <path
                d={values.map((value, index) => {
                  const point = coordinate(value, index);
                  return `${index ? "L" : "M"}${point.x} ${point.y}`;
                }).join(" ")}
                className="message-context-line"
              />
            ) : null}
            {values.map((value, index) => {
              const point = coordinate(value, index);
              return <circle key={`${weight.points[index].date}-${index}`} cx={point.x} cy={point.y} r={index === values.length - 1 ? 3.5 : 2.5} className="message-context-dot" />;
            })}
          </svg>
          <Link href={href}>Ver evolução</Link>
        </>
      )}
    </article>
  );
}

function SelectedPatientContextCards({
  tenantId,
  patientId,
  context,
}: {
  tenantId: string;
  patientId: string;
  context: SelectedPatientMessageContext;
}) {
  return (
    <section className="message-context-cards" aria-label="Resumo do paciente">
      <ContextCollectionCard
        title="Documentos"
        empty="Nenhum documento disponível."
        context={context.documents}
      />
      <ContextCollectionCard
        title="Exames"
        empty="Nenhum exame disponível."
        context={context.exams}
      />
      <ContextCollectionCard
        title="Consultas"
        empty="Nenhum registro finalizado. Transcrições não estão disponíveis."
        context={context.records}
      />
      <WeightContextCard
        weight={context.weight}
        href={`/clinicas/${tenantId}/pacientes/${patientId}?aba=Evolu%C3%A7%C3%A3o`}
      />
      <PreviousPrescriptions tenantId={tenantId} patientId={patientId} />
    </section>
  );
}

function PreviousPrescriptions({
  tenantId,
  patientId,
  patientView = false,
}: {
  tenantId: string;
  patientId: string;
  patientView?: boolean;
}) {
  return (
    <details className="message-context-prescriptions" key={patientId}>
      <summary>Receitas anteriores</summary>
      <PrescriptionsPanel
        tenantId={tenantId}
        patientId={patientId}
        patientView={patientView}
      />
    </details>
  );
}

function ConversationWorkspace({
  initial,
  base,
  recipientParam,
  directoryTitle,
  emptyDirectory,
}: {
  initial: ConversationInitial;
  base: string;
  recipientParam: "paciente" | "medico";
  directoryTitle: string;
  emptyDirectory: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sendUncertain, setSendUncertain] = useState(false);
  const selected = initial.selected;
  const selectedKey = selected
    ? `${selected.patientId}:${selected.doctorId}`
    : "";
  const previousSelectedKey = useRef(selectedKey);
  const messagesBeforeAttempt = useRef<Set<string>>(new Set());
  const requestKey = useRef<string | null>(null);
  const readAttempted = useRef<string | null>(null);
  const activeReferences = initial.references.filter(
    (reference) =>
      selectedReferences.includes(`${reference.type}:${reference.id}`),
  );
  const hasDraft = draft.trim().length > 0 || activeReferences.length > 0;
  const isStaffConversation = recipientParam === "paciente";

  useEffect(() => {
    if (!hasDraft) return;
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const protectNavigation = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!link || link.href === window.location.href) return;
      if (
        !window.confirm(
          "Você tem uma mensagem não enviada. Deseja sair e descartar este texto?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(() => composer.current?.focus(), 0);
        return;
      }
      setDraft("");
      setSelectedReferences([]);
      setError("");
      setNotice("");
      setSendUncertain(false);
      requestKey.current = null;
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    document.addEventListener("click", protectNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeExit);
      document.removeEventListener("click", protectNavigation, true);
    };
  }, [hasDraft]);

  useEffect(() => {
    if (previousSelectedKey.current === selectedKey) return;
    previousSelectedKey.current = selectedKey;
    setDraft("");
    setSelectedReferences([]);
    setError("");
    setNotice("");
    setSendUncertain(false);
    requestKey.current = null;
  }, [selectedKey]);

  useEffect(() => {
    if (!sendUncertain || !draft.trim()) return;
    const confirmed = initial.messages.some(
      (message) =>
        !messagesBeforeAttempt.current.has(message.id) &&
        message.sender_id === initial.userId &&
        message.content === draft.trim(),
    );
    if (!confirmed) return;
    setDraft("");
    setSelectedReferences([]);
    setError("");
    setSendUncertain(false);
    setNotice("Mensagem confirmada no histórico.");
    requestKey.current = null;
  }, [draft, initial.messages, initial.userId, sendUncertain]);

  useEffect(() => {
    if (!selected || initial.page !== 1 || !initial.messages.length) return;
    const latest = initial.messages.at(-1)!;
    if (
      latest.sender_id === initial.userId ||
      latest.sent_at <= (initial.lastReadAt ?? "") ||
      readAttempted.current === latest.id
    )
      return;
    readAttempted.current = latest.id;
    void fetch(`/api/v1/clinics/${initial.clinic.id}/messages/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selected.patientId,
        doctor_id: selected.doctorId,
        message_id: latest.id,
      }),
    }).then((response) => {
      if (response.ok) router.refresh();
      else readAttempted.current = null;
    });
  }, [
    initial.clinic.id,
    initial.lastReadAt,
    initial.messages,
    initial.page,
    initial.userId,
    router,
    selected,
  ]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selected) return;
    const content = draft.trim();
    if (!content) {
      setError("Escreva uma mensagem antes de enviar.");
      return;
    }
    if (selectedReferences.length !== activeReferences.length) {
      setSelectedReferences(activeReferences.map((reference) => `${reference.type}:${reference.id}`));
      requestKey.current = null;
      setError("Uma das referências selecionadas não está mais disponível.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    setSendUncertain(false);
    messagesBeforeAttempt.current = new Set(
      initial.messages.map((message) => message.id),
    );
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey.current,
          },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            patient_id: selected.patientId,
            doctor_id: selected.doctorId,
            content,
            references: activeReferences.map((reference) => ({
              type: reference.type,
              id: reference.id,
            })),
          }),
        },
      );
      let result: { error?: string } = {};
      try {
        result = (await response.json()) as { error?: string };
      } catch {}
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível enviar a mensagem.");
      setDraft("");
      setSelectedReferences([]);
      requestKey.current = null;
      setNotice("Mensagem enviada.");
      router.refresh();
    } catch (reason) {
      const uncertain =
        !(reason instanceof Error) ||
        reason.name === "TimeoutError" ||
        reason.name === "AbortError" ||
        reason instanceof TypeError;
      setSendUncertain(uncertain);
      setError(
        uncertain
          ? "Não conseguimos confirmar o envio. Seu texto foi mantido. Atualize a conversa e confira o histórico antes de tentar novamente."
          : reason.message,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  // Área do paciente: um chat comum. Com um só médico (o MVP), a conversa
  // abre direto, sem lista de destinatários; balões compactos, hora pequena e
  // o aviso de urgência fixo, com atalho para Sinais de alerta.
  if (!isStaffConversation) {
    const lastOwn = [...initial.messages].reverse().find((message) => message.sender_id === initial.userId);
    const dayOf = (at: string) =>
      new Date(at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
    const rows = initial.messages.map((message, index) => ({
      message,
      day: dayOf(message.sent_at),
      showDay: index === 0 || dayOf(initial.messages[index - 1].sent_at) !== dayOf(message.sent_at),
    }));
    return (
      <div className="pv-chat">
        {initial.recipients.length > 1 && (
          <nav className="pv-chat-recipients" aria-label={directoryTitle}>
            {initial.recipients.map((recipient) => (
              <Link
                key={recipient.id}
                href={conversationHref(base, recipientParam, recipient.id)}
                aria-current={selected?.doctorId === recipient.id ? "page" : undefined}
              >
                {recipient.displayName}
                {recipient.hasUnread && <span className="pv-dot" aria-label="Nova mensagem" />}
              </Link>
            ))}
          </nav>
        )}
        {selected ? (
          <>
            <header className="pv-chat-head">
              <span className="pv-avatar" aria-hidden="true">
                {selected.displayName
                  .replace(/^(Dra?\.)\s+/i, "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <span>
                <strong>{selected.displayName}</strong>
                <small>Mensagens sem pressa · sem anexos</small>
              </span>
            </header>
            <PreviousPrescriptions
              tenantId={initial.clinic.id}
              patientId={selected.patientId}
              patientView={true}
            />
            <p className="pv-chat-urgent">
              Não é canal de urgência.{" "}
              <Link href={`/clinicas/${initial.clinic.id}/meu-cuidado/alerta`}>Veja o que fazer</Link>
            </p>
            {initial.page > 1 || initial.hasNext ? (
              <nav className="pv-chat-pages" aria-label="Páginas de mensagens">
                {initial.hasNext && (
                  <Link href={conversationHref(base, recipientParam, selected.doctorId, initial.page + 1)}>
                    Mensagens anteriores
                  </Link>
                )}
                {initial.page > 1 && (
                  <Link href={conversationHref(base, recipientParam, selected.doctorId, initial.page - 1)}>
                    Mais recentes
                  </Link>
                )}
              </nav>
            ) : null}
            {initial.messages.length ? (
              <ol className="pv-chat-list" aria-live="polite">
                {rows.map(({ message, day, showDay }) => {
                  const own = message.sender_id === initial.userId;
                  return (
                    <li key={message.id} className={own ? "is-own" : undefined}>
                      {showDay && <p className="pv-chat-day">{day}</p>}
                      <div className="pv-bubble">
                        <span className="pv-visually-hidden">{own ? "Você:" : `${selected.displayName}:`}</span>
                        <p>{message.content}</p>
                        {message.references.map((reference, index) =>
                          reference.available ? (
                            <a className="pv-bubble-ref" href={reference.href} key={`${reference.href}:${index}`}>
                              {reference.label}
                            </a>
                          ) : (
                            <span className="pv-bubble-ref" key={`unavailable:${index}`}>{reference.label}</span>
                          ),
                        )}
                        <time dateTime={message.sent_at}>
                          {new Date(message.sent_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Sao_Paulo",
                          })}
                          {own && message.id === lastOwn?.id ? " · Enviado ✓" : ""}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="pv-card pv-chat-empty">
                <h2 className="pv-h2">Escreva para {selected.displayName}</h2>
                <p className="pv-lead">Para dúvidas que podem esperar. As respostas aparecem aqui.</p>
              </div>
            )}
            <form className="pv-composer" onSubmit={submit}>
              {error && <p className="pv-form-error" role="alert">{error}</p>}
              {sendUncertain && (
                <div className="pv-inline">
                  <button type="button" className="pv-link" onClick={() => router.refresh()}>
                    Atualizar conversa
                  </button>
                  <button type="button" className="pv-link" onClick={() => setSendUncertain(false)}>
                    Tentar novamente
                  </button>
                </div>
              )}
              {notice && <p className="pv-visually-hidden" role="status">{notice}</p>}
              {initial.references.length > 0 && (
                <details className="pv-more">
                  <summary>
                    Citar documentos ou orientações
                    {activeReferences.length > 0 ? ` (${activeReferences.length})` : ""}
                  </summary>
                  <fieldset className="message-reference-options" disabled={pending}>
                    <legend className="pv-visually-hidden">Referências compartilhadas</legend>
                    {initial.references.map((reference) => {
                      const key = `${reference.type}:${reference.id}`;
                      return (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={selectedReferences.includes(key)}
                            disabled={
                              !selectedReferences.includes(key) &&
                              selectedReferences.length >= 10
                            }
                            onChange={(event) => {
                              setSelectedReferences((current) =>
                                event.target.checked
                                  ? [...current, key]
                                  : current.filter((item) => item !== key),
                              );
                              requestKey.current = null;
                            }}
                          />
                          <span>{reference.label}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  <small className="pv-muted">Você pode citar até 10 itens.</small>
                </details>
              )}
              <div className="pv-composer-row">
                <label className="pv-visually-hidden" htmlFor="direct-message">
                  Mensagem para {selected.displayName}
                </label>
                <textarea
                  id="direct-message"
                  name="content"
                  ref={composer}
                  rows={1}
                  maxLength={4000}
                  required
                  disabled={pending}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escreva sua mensagem"
                />
                <button
                  className="pv-send"
                  aria-label={pending ? "Enviando" : "Enviar mensagem"}
                  disabled={pending || sendUncertain || !draft.trim()}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </div>
              {draft.length > 3500 && <small className="pv-muted">{draft.length}/4.000 caracteres</small>}
            </form>
          </>
        ) : (
          <div className="pv-card">
            <h2 className="pv-h2">Nenhuma conversa disponível</h2>
            <p className="pv-lead">{emptyDirectory}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="conversation-workspace conversation-workspace-staff">
      <section className="conversation-directory" aria-label={directoryTitle}>
        <h2>{directoryTitle}</h2>
        <p>Somente vínculos ativos aparecem aqui.</p>
        {initial.recipients.length ? (
          <nav className="conversation-recipient-list" aria-label={directoryTitle}>
            {initial.recipients.map((recipient) => (
              <Link
                key={recipient.id}
                className="conversation-recipient"
                href={conversationHref(base, recipientParam, recipient.id)}
                aria-current={
                  selected &&
                  (recipientParam === "paciente"
                    ? selected.patientId === recipient.id
                    : selected.doctorId === recipient.id)
                    ? "page"
                    : undefined
                }
              >
                <span className="conversation-recipient-avatar" aria-hidden="true">
                  {initialsFor(recipient.displayName)}
                </span>
                <strong>{recipient.displayName}</strong>
                {recipient.hasUnread && (
                  <span className="conversation-unread">Nova mensagem</span>
                )}
                <small>
                  {recipient.lastMessageAt
                    ? `Última mensagem: ${clinicalTime(recipient.lastMessageAt)}`
                    : "Nenhuma mensagem ainda"}
                </small>
              </Link>
            ))}
          </nav>
        ) : (
          <p className="conversation-directory-empty">{emptyDirectory}</p>
        )}
      </section>
      <section className="conversation-detail" aria-label="Conteúdo da conversa">
        {selected ? (
          <>
            <header className="conversation-detail-heading">
              <div>
                {isStaffConversation ? (
                  <Link
                    className="conversation-return-link"
                    href={`/clinicas/${initial.clinic.id}/pacientes/${selected.patientId}`}
                  >
                    Voltar à ficha de {selected.displayName}
                  </Link>
                ) : (
                  <Link
                    className="conversation-return-link"
                    href={`/clinicas/${initial.clinic.id}/meu-cuidado`}
                  >
                    Voltar ao meu cuidado
                  </Link>
                )}
                <h2>Conversa entre você e {selected.displayName}</h2>
                <p>Destinatário: {selected.displayName} · mensagens diretas e assíncronas.</p>
              </div>
              <span className="quiet-label">Canal não emergencial</span>
            </header>
            {isStaffConversation && initial.context ? (
              <SelectedPatientContextCards
                tenantId={initial.clinic.id}
                patientId={selected.patientId}
                context={initial.context}
              />
            ) : null}
            {initial.messages.length ? (
              <div className="conversation-messages" aria-live="polite">
                {initial.messages.map((message) => {
                  const ownMessage = message.sender_id === initial.userId;
                  return (
                    <article
                      className={`conversation-message ${
                        ownMessage ? "outgoing" : "incoming"
                      }`}
                      key={message.id}
                    >
                      <small>
                        Remetente: {ownMessage ? "Você" : selected.displayName} · {clinicalTime(message.sent_at)}
                      </small>
                      <p>{message.content}</p>
                      {message.references.map((reference, index) =>
                        reference.available ? (
                          <a
                            className="conversation-reference"
                            href={reference.href}
                            key={`${reference.href}:${index}`}
                          >
                            <span>
                              {reference.type === "document"
                                ? "Documento compartilhado"
                                : "Plano de cuidado publicado"}
                            </span>
                            <strong>{reference.label}</strong>
                            <small>Abrir com acesso atual</small>
                          </a>
                        ) : (
                          <span className="conversation-reference unavailable" key={`unavailable:${index}`}>
                            {reference.label}
                          </span>
                        ),
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="conversation-empty">
                <h3>Comece a conversa</h3>
                <p>A primeira mensagem ficará visível apenas para vocês dois.</p>
              </section>
            )}
            <nav className="agenda-actions" aria-label="Páginas de mensagens">
              {initial.page > 1 && (
                <Link
                  href={conversationHref(
                    base,
                    recipientParam,
                    recipientParam === "paciente"
                      ? selected.patientId
                      : selected.doctorId,
                    initial.page - 1,
                  )}
                >
                  Anterior
                </Link>
              )}
              {initial.hasNext && (
                <Link
                  href={conversationHref(
                    base,
                    recipientParam,
                    recipientParam === "paciente"
                      ? selected.patientId
                      : selected.doctorId,
                    initial.page + 1,
                  )}
                >
                  Próxima
                </Link>
              )}
            </nav>
            <form className="conversation-composer" onSubmit={submit}>
              {error && <p role="alert">{error}</p>}
              {sendUncertain && (
                <div className="conversation-recovery">
                  {/* Só o texto é anunciado; os botões não entram no alerta. */}
                  <p role="alert">Não foi possível confirmar o envio. Confira o histórico antes de tentar novamente.</p>
                  <button type="button" onClick={() => router.refresh()}>
                    Atualizar conversa
                  </button>
                  <button type="button" className="secondary" onClick={() => setSendUncertain(false)}>
                    Tentar novamente
                  </button>
                </div>
              )}
              {notice && <p role="status">{notice}</p>}
              <label htmlFor="direct-message">Mensagem para {selected.displayName}</label>
              <textarea
                id="direct-message"
                name="content"
                ref={composer}
                rows={3}
                maxLength={4000}
                required
                disabled={pending}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escreva sua mensagem"
                aria-describedby="direct-message-boundary"
              />
              <p id="direct-message-boundary" className="conversation-boundary">
                Este canal é assíncrono e não deve ser usado para urgências. Não
                aceita anexos nesta etapa; use Documentos para arquivos.
              </p>
              {initial.references.length > 0 && (
                <div className="conversation-reference-picker">
                  <fieldset className="message-reference-options" disabled={pending}>
                    <legend>Referências compartilhadas (opcional)</legend>
                    {["Plano de cuidado publicado", "Documentos compartilhados"].map(
                      (group) => {
                        const options = initial.references.filter(
                          (reference) => reference.group === group,
                        );
                        return options.length ? (
                          <div className="message-reference-group" key={group}>
                            <strong>{group}</strong>
                            {options.map((reference) => (
                              <label key={`${reference.type}:${reference.id}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedReferences.includes(`${reference.type}:${reference.id}`)}
                                  disabled={
                                    !selectedReferences.includes(`${reference.type}:${reference.id}`) &&
                                    selectedReferences.length >= 10
                                  }
                                  onChange={(event) => {
                                    const key = `${reference.type}:${reference.id}`;
                                    setSelectedReferences((current) =>
                                      event.target.checked
                                        ? [...current, key]
                                        : current.filter((item) => item !== key),
                                    );
                                    requestKey.current = null;
                                  }}
                                />
                                <span>{reference.label}</span>
                              </label>
                            ))}
                          </div>
                        ) : null;
                      },
                    )}
                  </fieldset>
                  {activeReferences.length > 0 && (
                    <button
                      type="button"
                      className="secondary conversation-reference-remove"
                      onClick={() => {
                        setSelectedReferences([]);
                        requestKey.current = null;
                      }}
                    >
                      Remover referências
                    </button>
                  )}
                  <small>
                    Cite até 10 itens. Somente documentos compartilhados e o plano
                    atualmente publicado aparecem aqui. Nenhum arquivo é enviado pela conversa.
                  </small>
                </div>
              )}
              <div>
                <span>{draft.length}/4.000 caracteres</span>
                <button disabled={pending || sendUncertain}>
                  {pending ? "Enviando…" : "Enviar mensagem"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <section className="conversation-empty">
            <h2>Nenhuma conversa disponível</h2>
            <p>{emptyDirectory}</p>
          </section>
        )}
      </section>
      {selected && (
        <aside className="conversation-context" aria-label="Contexto do paciente">
          <div className="conversation-context-patient">
            <span className="conversation-context-avatar" aria-hidden="true">
              {initialsFor(selected.displayName)}
            </span>
            <div>
              <h2>{selected.displayName}</h2>
              <p>Conversa direta com este paciente.</p>
            </div>
          </div>
          <dl className="conversation-context-details">
            <div>
              <dt>Canal</dt>
              <dd>Não emergencial</dd>
            </div>
            <div>
              <dt>Compartilhamento</dt>
              <dd>Sem anexos</dd>
            </div>
          </dl>
          <Link
            className="secondary conversation-context-link"
            href={`/clinicas/${initial.clinic.id}/pacientes/${selected.patientId}`}
          >
            Abrir ficha
          </Link>
        </aside>
      )}
    </div>
  );
}

export function StaffMessagesWorkspace({ initial }: { initial: StaffMessages }) {
  return (
    <ConversationWorkspace
      initial={initial}
      base={`/clinicas/${initial.clinic.id}/mensagens`}
      recipientParam="paciente"
      directoryTitle="Pacientes"
      emptyDirectory="Não há paciente com vínculo ativo disponível para conversa."
    />
  );
}

export function PatientMessagesWorkspace({
  initial,
}: {
  initial: PatientMessages;
}) {
  return (
    <ConversationWorkspace
      initial={initial}
      base={`/clinicas/${initial.clinic.id}/meu-cuidado/conversas`}
      recipientParam="medico"
      directoryTitle="Médicos vinculados"
      emptyDirectory="Não há médico com vínculo ativo disponível para conversa."
    />
  );
}
