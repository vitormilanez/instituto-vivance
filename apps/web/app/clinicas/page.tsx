import Link from "next/link";
import { redirect } from "next/navigation";
import { clinics, AccessError, roleLabels } from "@/modules/identity/service";
import { Header } from "@/components/header";
import { PatientInvitations } from "@/components/patient-invitations";
import { listMyPatientInvitations } from "@/modules/onboarding/service";
import { ClinicInvitations } from "@/components/clinic-invitations";
import { singlePatientDestination } from "@/modules/identity/entry";
export const dynamic = "force-dynamic";
export default async function Clinics({ searchParams }: { searchParams: Promise<{ gerenciar?: string }> }) {
  const context = await clinics().catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    throw error;
  });
  const { gerenciar } = await searchParams;
  const destination = singlePatientDestination(context.clinics);
  if (destination && gerenciar !== "1") redirect(destination);
  const patientInvitations = await listMyPatientInvitations();
  return (
    <>
      <Header />
      <main id="conteudo" className="container">
        <h1>Minhas clínicas</h1>
        <p>Escolha a clínica para continuar.</p>
        <ClinicInvitations invitations={context.invitations} />
        <PatientInvitations invitations={patientInvitations} />
        {context.clinics.length === 0 &&
        context.invitations.length === 0 &&
        patientInvitations.length === 0 ? (
          <section className="panel empty">
            <h2>Aguardando liberação de acesso</h2>
            <p>
              Sua conta ainda não possui vínculo ativo com uma clínica. Solicite
              a liberação ao administrador.
            </p>
          </section>
        ) : context.clinics.length > 0 ? (
          <ul className="clinic-list">
            {context.clinics.map((c) => (
              <li key={c.id} className="panel">
                {c.role === "patient" ? (
                  <Link href={`/clinicas/${c.id}/meu-cuidado/hoje`}>
                    <div>
                      <h2>{c.name}</h2>
                      <small>Paciente · Abrir meu cuidado</small>
                    </div>
                  </Link>
                ) : (
                  <Link href={`/clinicas/${c.id}`}>
                    <div>
                      <h2>{c.name}</h2>
                      <small>{roleLabels[c.role]}</small>
                    </div>
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="notice">
          {context.clinics.length > 0 &&
          context.clinics.every((c) => c.role === "patient")
            ? "Abra Meu cuidado para ver suas consultas, orientações e conversas com o médico."
            : "Já disponíveis: visão geral, cadastro de pacientes, agenda, atendimentos e equipe de cuidado."}
        </p>
      </main>
    </>
  );
}
