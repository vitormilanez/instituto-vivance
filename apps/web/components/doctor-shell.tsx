import Link from "next/link";
import Image from "next/image";
import { Figtree } from "next/font/google";
import { Sun, Inbox, Users, CalendarDays, MessageCircle, Search, Bell, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import type { ClinicAccess } from "@/modules/identity/service";
import { navLabel, staffModules } from "@/modules/workspace/navigation";
import "@/app/doctor.css";
import "@/app/doctor-home.css";
import "@/app/doctor-patients.css";
import "@/app/doctor-review.css";
import "@/app/doctor-communications.css";
const figtree = Figtree({ subsets: ["latin"], variable: "--font-doctor-figtree" });

export function DoctorIcon({ name }: { name: string }) {
  const Icon = ({ home: Sun, review: Inbox, patients: Users, agenda: CalendarDays, mensagens: MessageCircle, search: Search, bell: Bell }[name]) ?? Inbox;
  return <Icon aria-hidden="true" size={20} strokeWidth={1.7} />;
}

export function DoctorShell({
  clinic,
  active,
  notificationCount,
  children,
  focusMode = false,
}: {
  clinic: ClinicAccess;
  active: string;
  notificationCount: number;
  children: ReactNode;
  focusMode?: boolean;
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
    <div className={`dv dv-area-${active} ${focusMode ? "dv-focus-mode" : ""} ${figtree.variable}`}>
      <aside className="dv-sidebar">
        <Link className="dv-brand" href={base}>
          <Image className="dv-mark" src="/brand/vivance-mark.png" alt="" width={38} height={38} />
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
        <Link className="dv-clinic-settings" href={`${base}/equipe`}><Settings size={19} aria-hidden="true" />Clínica e equipe</Link>
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
          <span className="dv-location">{focusMode ? "Modo atendimento" : title}</span>
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
