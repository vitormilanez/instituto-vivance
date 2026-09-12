import Link from "next/link";
import { Brand } from "./brand";
import { logout } from "@/app/actions";

export function Header({
  variant = "patient",
  homeHref = "/clinicas",
  notificationsHref,
  notificationCount = 0,
  title,
  context,
}: {
  variant?: "patient" | "staff";
  homeHref?: string;
  notificationsHref?: string;
  notificationCount?: number;
  title?: string;
  context?: string;
}) {
  const actions = (
    <div className="topbar-actions">
      <Link href="/clinicas">Minhas clínicas</Link>
      {notificationsHref && (
        <Link
          href={notificationsHref}
          aria-label={
            notificationCount > 0
              ? `${notificationCount} avisos não lidos`
              : undefined
          }
        >
          Avisos
          {notificationCount > 0 && (
            <span className="notification-count" aria-hidden="true">
              {notificationCount}
            </span>
          )}
        </Link>
      )}
      <form action={logout}>
        <button className="secondary" data-leave-clinic>
          Sair
        </button>
      </form>
    </div>
  );

  if (variant === "staff")
    return (
      <header className="staff-topbar">
        <Link className="staff-brand" href={homeHref} aria-label="VIVANCE — início">
          <Brand />
        </Link>
        <div className="staff-topbar-main">
          <div className="topbar-route-context">
            <strong>{title}</strong>
            <span>{context}</span>
          </div>
          {actions}
        </div>
      </header>
    );

  return (
    <header className="topbar">
      <Link className="header-brand" href={homeHref} aria-label="VIVANCE — início">
        <Brand />
      </Link>
      {actions}
    </header>
  );
}
