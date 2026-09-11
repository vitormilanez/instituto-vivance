import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "./header";
import { roleLabels, type ClinicAccess } from "@/modules/identity/service";

export function ClinicShell({
  clinic,
  active,
  children,
}: {
  clinic: ClinicAccess;
  active: "home" | "patients" | "audit";
  children: ReactNode;
}) {
  const base = `/clinicas/${clinic.id}`;
  const links = [
    { key: "home", label: "Visão geral", href: base },
    { key: "patients", label: "Pacientes", href: `${base}/pacientes` },
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
  return (
    <>
      <Header />
      <div className="workspace">
        <aside className="workspace-nav">
          <div className="workspace-identity">
            <strong>{clinic.name}</strong>
            <span>{roleLabels[clinic.role]}</span>
          </div>
          <nav aria-label="Navegação da clínica">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active === link.key ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="workspace-note">Seu espaço para organizar o cuidado.</p>
        </aside>
        <main id="conteudo" className="workspace-main">
          {children}
        </main>
      </div>
    </>
  );
}
