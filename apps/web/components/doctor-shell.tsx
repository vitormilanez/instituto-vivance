import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import type { ClinicAccess } from "@/modules/identity/service";
import { navLabel, staffModules } from "@/modules/workspace/navigation";
import "@/app/doctor.css";
import "@/app/doctor-home.css";
import "@/app/doctor-patients.css";

const paths: Record<string, string> = {
  home: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  review: "M4 4h16v16H4zM8 8h8m-8 4h8m-8 4h4",
  patients:
    "M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-3a7 7 0 0 1 14 0v3M19 4a3 3 0 0 1 0 6M22 19v-2a6 6 0 0 0-3-5",
  agenda: "M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1M8 3v4m8-4v4M4 10h16",
  mensagens: "M4 4h16v12H9l-5 4V4",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-1.8 4.2L21 21",
  bell: "M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3V9m4 12h4",
};

export function DoctorIcon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] ?? paths.review} />
    </svg>
  );
}

export function DoctorShell({
  clinic,
  active,
  notificationCount,
  children,
}: {
  clinic: ClinicAccess;
  active: string;
  notificationCount: number;
  children: ReactNode;
}) {
  const base = `/clinicas/${clinic.id}`;
  const primary = [
    { key: "home", label: "Hoje", mobile: "Hoje", href: base },
    {
      key: "review",
      label: "Para revisar",
      mobile: "Revisar",
      href: `${base}/revisar`,
    },
    {
      key: "patients",
      label: "Pacientes",
      mobile: "Pacientes",
      href: `${base}/pacientes`,
    },
    {
      key: "agenda",
      label: "Agenda",
      mobile: "Agenda",
      href: `${base}/agenda`,
    },
    {
      key: "mensagens",
      label: "Mensagens",
      mobile: "Mensagens",
      href: `${base}/mensagens`,
    },
  ];
  const secondary = [
    ...staffModules
      .filter((module) => !["agenda", "mensagens"].includes(module.slug))
      .map((module) => ({
        key: module.slug,
        label: navLabel(module),
        href: `${base}/${module.slug}`,
      })),
    { key: "team", label: "Equipe de cuidado", href: `${base}/equipe` },
  ];
  const title =
    [...primary, ...secondary, { key: "notifications", label: "Avisos" }].find(
      (link) => link.key === active,
    )?.label ?? "Vivance";
  const name = clinic.displayName || "Médico";
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const secondaryLinks = secondary.map((link) => (
    <Link
      key={link.key}
      href={link.href}
      aria-current={active === link.key ? "page" : undefined}
    >
      {link.label}
    </Link>
  ));
  return (
    <div className="dv">
      <aside className="dv-sidebar">
        <Link className="dv-brand" href={base}>
          <span className="dv-mark" aria-hidden="true">
            V
          </span>
          <span>
            <strong>Vivance</strong>
            <small>{clinic.name}</small>
          </span>
        </Link>
        <nav className="dv-primary-nav" aria-label="Área do médico">
          {primary.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
            >
              <DoctorIcon name={link.key} />
              {link.label}
            </Link>
          ))}
        </nav>
        <details
          className="dv-tools"
          open={secondary.some((link) => link.key === active)}
        >
          <summary>Mais ferramentas</summary>
          <nav aria-label="Ferramentas de cuidado">{secondaryLinks}</nav>
        </details>
        <div className="dv-account">
          <span className="dv-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <strong>{name}</strong>
            <small>Médico</small>
          </div>
        </div>
        <div className="dv-account-actions">
          <Link href="/clinicas">Minhas clínicas</Link>
          <form action={logout}>
            <button type="submit" data-leave-clinic>
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="dv-workspace">
        <header className="dv-topbar">
          <span className="dv-location">{title}</span>
          <form
            action={`${base}/pacientes`}
            role="search"
            className="dv-global-search"
          >
            <DoctorIcon name="search" />
            <label className="sr-only" htmlFor="doctor-patient-search">
              Buscar paciente
            </label>
            <input
              id="doctor-patient-search"
              name="q"
              type="search"
              maxLength={80}
              placeholder="Buscar paciente"
            />
            <button type="submit">Buscar</button>
          </form>
          <Link
            className="dv-notifications"
            href={`${base}/avisos`}
            aria-label={`Avisos${notificationCount ? `: ${notificationCount} não lidos` : ""}`}
          >
            <DoctorIcon name="bell" />
            <span>Avisos</span>
            {notificationCount > 0 && (
              <b>{notificationCount > 99 ? "99+" : notificationCount}</b>
            )}
          </Link>
          <details className="dv-mobile-tools">
            <summary>Menu</summary>
            <nav aria-label="Outras áreas">
              {secondaryLinks}
              <Link href="/clinicas">Minhas clínicas</Link>
              <form action={logout}>
                <button type="submit" data-leave-clinic>
                  Sair
                </button>
              </form>
            </nav>
          </details>
        </header>
        <main id="conteudo" className="workspace-main dv-main">
          {children}
        </main>
      </div>
      <nav className="dv-mobile-nav" aria-label="Área do médico no celular">
        {primary.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active === link.key ? "page" : undefined}
          >
            <DoctorIcon name={link.key} />
            <span>{link.mobile}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
