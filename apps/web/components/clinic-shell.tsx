import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "./header";
import { roleLabels, type ClinicAccess } from "@/modules/identity/service";
import {
  staffModules,
  type StaffModuleSlug,
} from "@/modules/workspace/navigation";
import { unreadInAppNotificationCount } from "@/modules/notifications/service";

// Only what a doctor/nurse/admin reaches for constantly stays on the surface;
// everything else keeps its route but moves into "Mais" so the sidebar reads
// as four choices, not thirteen.
const primaryKeys = ["home", "patients", "agenda", "acompanhamento"] as const;
const secondaryGroups = [
  { label: "Atendimento", keys: ["atendimentos", "preparo", "planos"] },
  {
    label: "Registros e comunicação",
    keys: ["documentos", "mensagens", "relatorios", "processamentos", "notifications"],
  },
  { label: "Clínica", keys: ["team", "ia", "audit"] },
] as const;

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
  const linkByKey = (key: string) => links.find((link) => link.key === key);
  const primaryLinks = primaryKeys
    .map((key) => linkByKey(key))
    .filter((link): link is NonNullable<typeof link> => Boolean(link));
  const secondaryLinkKeys = new Set<string>(
    secondaryGroups.flatMap((group) => group.keys),
  );
  const secondaryActive = active !== "home" && secondaryLinkKeys.has(active);
  const activeLabel =
    links.find((link) => link.key === active)?.label ?? "Clínica";
  // The member's own name when it exists; an honest fallback to the
  // clinic's name (never a blank avatar) when it does not — this card
  // identifies the signed-in person, not the clinic they are working in.
  const identityName = clinic.displayName?.trim() || clinic.name;
  const identityInitials = identityName
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
      <div className={`workspace workspace-${clinic.role}`}>
        <aside className="workspace-nav">
          <div className="workspace-identity">
            <span className="workspace-avatar" aria-hidden="true">
              {identityInitials}
            </span>
            <span>
              <strong>{identityName}</strong>
              <small>{roleLabels[clinic.role]}</small>
            </span>
          </div>
          <nav aria-label="Navegação da clínica">
            <div className="workspace-nav-group">
              {primaryLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={active === link.key ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <details className="workspace-nav-more" open={secondaryActive}>
              <summary>Mais</summary>
              <div>
                {secondaryGroups.map((group) => {
                  const groupLinks = group.keys
                    .map((key) => linkByKey(key))
                    .filter((link): link is NonNullable<typeof link> =>
                      Boolean(link),
                    );
                  if (!groupLinks.length) return null;
                  return (
                    <div className="workspace-nav-group" key={group.label}>
                      <span className="workspace-nav-label">{group.label}</span>
                      {groupLinks.map((link) => (
                        <Link
                          key={link.key}
                          href={link.href}
                          aria-current={active === link.key ? "page" : undefined}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
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
        {primaryLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <details open={secondaryActive}>
          <summary>Mais</summary>
          <div>
            {links
              .filter(
                (link) => !primaryKeys.includes(link.key as (typeof primaryKeys)[number]),
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
