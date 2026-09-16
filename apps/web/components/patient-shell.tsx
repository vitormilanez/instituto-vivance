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
  // Desktop gets the full map of "Meu cuidado" up front, so orientações,
  // documentos e relatórios não exigem entrar no hub primeiro para descobri-los.
  const careSections = patientSections.filter(
    (section) => section.group === "cuidado" && section.slug !== "cuidado",
  );
  const careSectionActive =
    active === "cuidado" || careSections.some((section) => section.slug === active);
  return (
    <>
      <Header
        homeHref={`${base}/hoje`}
        notificationsHref={`/clinicas/${clinic.id}/avisos`}
      />
      <div className="patient-shell-grid">
        <aside className="patient-sidebar">
          <div className="patient-sidebar-context">
            <span>Seu cuidado com</span>
            <strong>{clinic.name}</strong>
          </div>
          <nav aria-label="Navegação do paciente">
            {primarySections.map((section) => (
              <span key={section.slug} className="patient-sidebar-group">
                <Link
                  href={`${base}/${section.slug}`}
                  aria-current={active === section.slug ? "page" : undefined}
                  data-group-current={
                    section.slug === "cuidado" && careSectionActive
                      ? "true"
                      : undefined
                  }
                >
                  {section.title}
                </Link>
                {section.slug === "cuidado" && (
                  <span className="patient-sidebar-subnav">
                    {careSections.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`${base}/${sub.slug}`}
                        aria-current={active === sub.slug ? "page" : undefined}
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </span>
                )}
              </span>
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
            aria-current={
              active === section.slug ||
              (section.slug === "cuidado" && careSectionActive)
                ? "page"
                : undefined
            }
          >
            {section.title}
          </Link>
        ))}
      </nav>
    </>
  );
}
