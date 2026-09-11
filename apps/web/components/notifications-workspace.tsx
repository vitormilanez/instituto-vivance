"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { InAppNotifications } from "@/modules/notifications/service";
import { clinicalTime } from "./encounter-editor";

type Notice = InAppNotifications["notices"][number];

function noticeCopy(kind: string) {
  if (kind === "message")
    return {
      title: "Nova mensagem",
      description: "Você tem uma nova mensagem. Abra a conversa para ver.",
    };
  return {
    title: "Novas orientações",
    description: "Você tem novas orientações disponíveis.",
  };
}

function noticeHref(clinicId: string, page: number) {
  const query = page > 1 ? `?pagina=${page}` : "";
  return `/clinicas/${clinicId}/avisos${query}`;
}

export function NotificationsWorkspace({
  initial,
}: {
  initial: InAppNotifications;
}) {
  const router = useRouter();
  const noticeBusy = useRef<string | null>(null);
  const preferenceBusy = useRef(false);
  const [notices, setNotices] = useState(initial.notices);
  const [inAppEnabled, setInAppEnabled] = useState(initial.inAppEnabled);
  const [pendingPreference, setPendingPreference] = useState(false);
  const [error, setError] = useState("");

  async function openNotice(event: React.MouseEvent, notice: Notice) {
    if (
      notice.read_at ||
      noticeBusy.current ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    noticeBusy.current = notice.id;
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/notifications/${notice.id}/read`,
        { method: "POST", signal: AbortSignal.timeout(20_000) },
      );
      let result: { error?: string; readAt?: string } = {};
      try {
        result = (await response.json()) as {
          error?: string;
          readAt?: string;
        };
      } catch {}
      if (!response.ok || !result.readAt)
        throw new Error(result.error ?? "Não foi possível abrir este aviso.");
      setNotices((current) =>
        current.map((item) =>
          item.id === notice.id ? { ...item, read_at: result.readAt! } : item,
        ),
      );
      router.push(notice.target_path);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Atualize a página antes de tentar novamente.",
      );
    } finally {
      noticeBusy.current = null;
    }
  }

  async function changePreference() {
    if (preferenceBusy.current) return;
    const requested = !inAppEnabled;
    preferenceBusy.current = true;
    setPendingPreference(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${initial.clinic.id}/notification-preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({ in_app_enabled: requested }),
        },
      );
      let result: { error?: string; inAppEnabled?: boolean } = {};
      try {
        result = (await response.json()) as {
          error?: string;
          inAppEnabled?: boolean;
        };
      } catch {}
      if (!response.ok || typeof result.inAppEnabled !== "boolean")
        throw new Error(result.error ?? "Não foi possível atualizar os avisos.");
      setInAppEnabled(result.inAppEnabled);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Atualize a página antes de tentar novamente.",
      );
    } finally {
      preferenceBusy.current = false;
      setPendingPreference(false);
    }
  }

  const unread = notices.filter((notice) => !notice.read_at).length;
  return (
    <section className="notifications-workspace" aria-label="Avisos da conta">
      <div className="notifications-preference">
        <div>
          <h2>Avisos neste app</h2>
          <p>
            {inAppEnabled
              ? "Você receberá novos avisos aqui, sem conteúdo clínico no resumo."
              : "Novos avisos estão pausados nesta conta. Os avisos anteriores continuam disponíveis."}
          </p>
        </div>
        <label className="notifications-switch">
          <input
            type="checkbox"
            checked={inAppEnabled}
            onChange={changePreference}
            disabled={pendingPreference}
          />
          <span>{inAppEnabled ? "Ativados" : "Pausados"}</span>
        </label>
      </div>
      {error && <p className="notifications-error" role="alert">{error}</p>}
      <div className="notifications-heading">
        <div>
          <h2>Seus avisos</h2>
          <p>
            {unread
              ? `${unread} ${unread === 1 ? "não lido" : "não lidos"} nesta página.`
              : "Nenhum aviso não lido nesta página."}
          </p>
        </div>
      </div>
      {notices.length ? (
        <div className="notifications-list">
          {notices.map((notice) => {
            const copy = noticeCopy(notice.kind);
            return (
              <Link
                className={`notification-row${notice.read_at ? "" : " is-unread"}`}
                href={notice.target_path}
                key={notice.id}
                onClick={(event) => openNotice(event, notice)}
              >
                <div>
                  <strong>{copy.title}</strong>
                  <p>{copy.description}</p>
                </div>
                <span>
                  {notice.read_at ? "Lido" : "Novo"} · {clinicalTime(notice.created_at)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="notifications-empty">
          <h3>Nenhum aviso por enquanto</h3>
          <p>Quando houver uma atualização disponível para você, ela aparecerá aqui.</p>
        </div>
      )}
      <nav className="agenda-actions" aria-label="Páginas de avisos">
        {initial.page > 1 && (
          <Link href={noticeHref(initial.clinic.id, initial.page - 1)}>
            Anterior
          </Link>
        )}
        {initial.hasNext && (
          <Link href={noticeHref(initial.clinic.id, initial.page + 1)}>
            Próxima
          </Link>
        )}
      </nav>
    </section>
  );
}
