import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "./header";
import { roleLabels, type ClinicAccess } from "@/modules/identity/service";
import {
  staffModules,
  type StaffModuleSlug,
} from "@/modules/workspace/navigation";
import { unreadInAppNotificationCount } from "@/modules/notifications/service";

export async function ClinicShell({
  clinic,
  active,
  children,
}: {
  clinic: ClinicAccess;
  active:
    | "home"
    | "patients"
    | "team"
    | "audit"
    | "notifications"
    | StaffModuleSlug;
  children: ReactNode;
}) {
  const base = `/clinicas/${clinic.id}`;
  const notificationCount = await unreadInAppNotificationCount(clinic.id);
  const moduleLinks = staffModules
    .filter((module) => clinic.role !== "admin" || module.slug !== "processamentos")
    .map((module) => ({
      key: module.slug,
      label: module.title,
      href: `${base}/${module.slug}`,
    }));
  const links = [
    {
      key: "home",
      label: clinic.role === "admin" ? "Visão geral" : "Hoje",
      href: base,
    },
    { key: "patients", label: "Pacientes", href: `${base}/pacientes` },
    ...moduleLinks,
    { key: "notifications", label: "Avisos", href: `${base}/avisos` },
    { key: "team", label: "Equipe de cuidado", href: `${base}/equipe` },
    ...(clinic.role === "admin"
      ? [
          {
            key: "audit",
            label: "Histórico de ações",
            href: `${base}/historico`,
          },
        ]
      : []),
  ];
  const navigationGroups = [
    {
      label: "Cuidado",
      links: links.filter((link) =>
        ["home", "agenda", "patients", "preparo", "atendimentos"].includes(link.key),
      ),
    },
    {
      label: "Acompanhamento",
      links: links.filter((link) =>
        [
          "planos",
          "acompanhamento",
          "documentos",
          "mensagens",
          "processamentos",
          "notifications",
        ].includes(
          link.key,
        ),
      ),
    },
    {
      label: "Clínica",
      links: links.filter((link) =>
        ["team", "relatorios", "ia", "audit"].includes(link.key),
      ),
    },
  ];
  const activeLabel =
    links.find((link) => link.key === active)?.label ?? "Clínica";
  const clinicInitials = clinic.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <>
      <Header
        variant="staff"
        homeHref={base}
        notificationsHref={`${base}/avisos`}
        notificationCount={notificationCount}
        title={activeLabel}
        context={`${clinic.name} · ${roleLabels[clinic.role]}`}
      />
      <div className="workspace">
        <aside className="workspace-nav">
          <div className="workspace-identity">
            <span className="workspace-avatar" aria-hidden="true">
              {clinicInitials}
            </span>
            <span>
              <strong>{clinic.name}</strong>
              <small>{roleLabels[clinic.role]}</small>
            </span>
          </div>
          <nav aria-label="Navegação da clínica">
            {navigationGroups.map((group) => (
              <div className="workspace-nav-group" key={group.label}>
                <span className="workspace-nav-label">{group.label}</span>
                {group.links.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    aria-current={active === link.key ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <p className="workspace-note">Seu espaço para organizar o cuidado.</p>
        </aside>
        <main id="conteudo" className="workspace-main">
          {children}
        </main>
      </div>
      <nav
        className="staff-mobile-dock"
        aria-label="Navegação rápida da clínica"
      >
        {[
          { key: "home", label: "Hoje", href: base },
          { key: "agenda", label: "Agenda", href: `${base}/agenda` },
          { key: "patients", label: "Pacientes", href: `${base}/pacientes` },
          { key: "planos", label: "Planos", href: `${base}/planos` },
        ].map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <details>
          <summary>Mais</summary>
          <div>
            {links
              .filter(
                (link) =>
                  !["home", "agenda", "patients", "planos"].includes(link.key),
              )
              .map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={active === link.key ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
          </div>
        </details>
      </nav>
    </>
  );
}
