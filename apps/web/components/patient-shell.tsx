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
  return (
    <>
      <Header />
      <div className="patient-workspace">
        <div className="patient-context">
          <span>{clinic.name}</span>
          <Link
            href={`/clinicas/${clinic.id}/meu-perfil`}
            aria-current={active === "perfil" ? "page" : undefined}
          >
            Meu perfil
          </Link>
        </div>
        <nav className="patient-navigation" aria-label="Navegação do paciente">
          {patientSections.slice(0, 4).map((section) => (
            <Link
              key={section.slug}
              href={`/clinicas/${clinic.id}/meu-cuidado/${section.slug}`}
              aria-current={active === section.slug ? "page" : undefined}
            >
              {section.title}
            </Link>
          ))}
        </nav>
        <main id="conteudo">{children}</main>
      </div>
    </>
  );
}
