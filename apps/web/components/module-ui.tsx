import Link from "next/link";

export function DevelopmentNotice() {
  return (
    <p className="development-notice">
      <strong>Em desenvolvimento</strong>
      <span>
        Você já pode conhecer esta área. Os dados e as ações ainda não estão
        conectados.
      </span>
    </p>
  );
}

export function EmptyModule({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="module-empty">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M4 6h16v14H4zM8 3v6m8-6v6M4 11h16m-12 5h8" />
      </svg>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function ModuleTabs({
  tabs,
  active,
  base,
}: {
  tabs: readonly string[];
  active: string;
  base: string;
}) {
  return (
    <nav className="module-tabs" aria-label="Seções desta área">
      {tabs.map((tab) => (
        <Link
          key={tab}
          href={`${base}?aba=${encodeURIComponent(tab)}`}
          aria-current={tab === active ? "page" : undefined}
        >
          {tab}
        </Link>
      ))}
    </nav>
  );
}

export function FutureButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="future-button"
      disabled
      title="Em desenvolvimento"
    >
      {children}
    </button>
  );
}

export function EmptyConversation() {
  return (
    <div className="conversation-workspace">
      <section className="conversation-directory">
        <h2>Conversas</h2>
        <p>A lista de conversas aparecerá aqui após a integração.</p>
      </section>
      <section
        className="conversation-detail"
        aria-label="Conteúdo da conversa"
      >
        <EmptyModule title="Um espaço para conversar">
          O envio e o recebimento de mensagens ainda não estão disponíveis.
        </EmptyModule>
        <div className="disabled-composer">
          <label htmlFor="future-message">Mensagem</label>
          <textarea
            id="future-message"
            disabled
            placeholder="Disponível após a integração"
            rows={2}
          />
          <div>
            <FutureButton>Anexar arquivo</FutureButton>
            <FutureButton>Enviar mensagem</FutureButton>
          </div>
        </div>
      </section>
    </div>
  );
}
