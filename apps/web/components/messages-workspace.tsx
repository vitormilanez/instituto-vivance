"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent, MouseEvent } from "react";
import type {
  MessageRecipient,
  PatientMessages,
  SelectedConversation,
  StaffMessages,
} from "@/modules/messages/service";
import { clinicalTime } from "./encounter-editor";

type ConversationInitial = {
  clinic: StaffMessages["clinic"];
  userId: string;
  recipients: MessageRecipient[];
  selected: SelectedConversation | null;
  messages: StaffMessages["messages"];
  page: number;
  hasNext: boolean;
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = initial.selected;
  const hasDraft = draft.trim().length > 0;
  const isStaffConversation = recipientParam === "paciente";

  useEffect(() => {
    if (!hasDraft) return;
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [hasDraft]);

  function confirmDraftNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !hasDraft ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (window.confirm("Você tem uma mensagem não enviada. Deseja sair e descartar este texto?")) return;
    event.preventDefault();
    window.setTimeout(() => composer.current?.focus(), 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selected) return;
    const content = draft.trim();
    if (!content) {
      setError("Escreva uma mensagem antes de enviar.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            patient_id: selected.patientId,
            doctor_id: selected.doctorId,
            content,
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
      setNotice("Mensagem enviada.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Seu texto foi mantido; tente enviar novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="conversation-workspace">
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
                onClick={confirmDraftNavigation}
                aria-current={
                  selected &&
                  (recipientParam === "paciente"
                    ? selected.patientId === recipient.id
                    : selected.doctorId === recipient.id)
                    ? "page"
                    : undefined
                }
              >
                <strong>{recipient.displayName}</strong>
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
                    onClick={confirmDraftNavigation}
                  >
                    Voltar à ficha de {selected.displayName}
                  </Link>
                ) : (
                  <Link
                    className="conversation-return-link"
                    href={`/clinicas/${initial.clinic.id}/meu-cuidado`}
                    onClick={confirmDraftNavigation}
                  >
                    Voltar ao meu cuidado
                  </Link>
                )}
                <h2>Conversa entre você e {selected.displayName}</h2>
                <p>Destinatário: {selected.displayName} · mensagens diretas e assíncronas.</p>
              </div>
              <span className="quiet-label">Canal não emergencial</span>
            </header>
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
                  onClick={confirmDraftNavigation}
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
                  onClick={confirmDraftNavigation}
                >
                  Próxima
                </Link>
              )}
            </nav>
            <form className="conversation-composer" onSubmit={submit}>
              {error && <p role="alert">{error}</p>}
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
              <div>
                <span>{draft.length}/4.000 caracteres</span>
                <button disabled={pending}>
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
