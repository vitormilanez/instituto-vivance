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

// The dock has five equal slots on a 320px phone; long names get a short
// visible label while the link keeps its full accessible name.
const dockLabels: Record<string, string> = { acompanhamento: "Acompanhar" };

// One 20px line-icon family (1.6 stroke) for the phone dock only.
const dockPaths: Record<string, string> = {
  home: "M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-3.5v-4h-5v4H4a.5.5 0 0 1-.5-.5z",
  patients:
    "M7.5 9a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.5 16.5c0-2.8 2.2-4.75 5-4.75s5 1.95 5 4.75M13 4a2.5 2.5 0 0 1 0 4.8M14.5 11.9c1.9.5 3 2.1 3 4.6",
  agenda:
    "M4 5h12a.5.5 0 0 1 .5.5V16a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V5.5A.5.5 0 0 1 4 5ZM3.5 8.5h13M7 3v3.5M13 3v3.5",
  acompanhamento: "M3 14.5l4-4.5 3 2.5 4.5-6 2.5 2.5",
  more: "M5 10h.01M10 10h.01M15 10h.01",
};
function DockIcon({ name }: { name: string }) {
  const d = dockPaths[name];
  if (!d) return null;
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={name === "more" ? 2.6 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  // This card identifies the signed-in person, never the clinic. If an older
  // membership has no display name, say so explicitly instead of borrowing
  // the clinic name and presenting it as a person's identity.
  const identityName =
    clinic.displayName?.trim() ||
    (clinic.role === "admin"
      ? "Administrador não identificado"
      : "Profissional não identificado");
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
        title={clinic.name}
        context={`${roleLabels[clinic.role]} · ${activeLabel}`}
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
            aria-label={link.label}
          >
            <DockIcon name={link.key} />
            <span aria-hidden="true">{dockLabels[link.key] ?? link.label}</span>
          </Link>
        ))}
        <details open={secondaryActive}>
          <summary>
            <DockIcon name="more" />
            <span>Mais</span>
          </summary>
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
