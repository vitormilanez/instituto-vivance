import Link from "next/link";
import type { ReactNode } from "react";
import type { ClinicAccess } from "@/modules/identity/service";
import { patientSections } from "@/modules/workspace/navigation";
import { Header } from "./header";

export function PatientShell({
  clinic,
  active,
  children,
}: {
  clinic: ClinicAccess;
  active: string;
  children: ReactNode;
}) {
  const base = `/clinicas/${clinic.id}/meu-cuidado`;
  const primarySections = patientSections.slice(0, 4);
  return (
    <>
      <Header homeHref={`${base}/hoje`} />
      <div className="patient-shell-grid">
        <aside className="patient-sidebar">
          <div className="patient-sidebar-context">
            <span>Seu cuidado com</span>
            <strong>{clinic.name}</strong>
          </div>
          <nav aria-label="Navegação do paciente">
            {primarySections.map((section) => (
              <Link
                key={section.slug}
                href={`${base}/${section.slug}`}
                aria-current={active === section.slug ? "page" : undefined}
              >
                {section.title}
              </Link>
            ))}
          </nav>
          <Link
            className="patient-profile-link"
            href={`/clinicas/${clinic.id}/meu-perfil`}
            aria-current={active === "perfil" ? "page" : undefined}
          >
            Meu perfil
          </Link>
        </aside>
        <main id="conteudo" className="patient-workspace">
          {children}
        </main>
      </div>
      <nav
        className="patient-navigation patient-navigation-mobile"
        aria-label="Navegação do paciente"
      >
        {primarySections.map((section) => (
          <Link
            key={section.slug}
            href={`${base}/${section.slug}`}
            aria-current={active === section.slug ? "page" : undefined}
          >
            {section.title}
          </Link>
        ))}
      </nav>
    </>
  );
}
