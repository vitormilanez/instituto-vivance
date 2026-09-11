import Link from "next/link";
import { redirect } from "next/navigation";
import { clinics, AccessError, roleLabels } from "@/modules/identity/service";
import { Header } from "@/components/header";
export const dynamic = "force-dynamic";
export default async function Clinics() {
  const context = await clinics().catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    throw error;
  });
  return (
    <>
      <Header />
      <main id="conteudo" className="container">
        <h1>Minhas clínicas</h1>
        <p>Escolha a clínica para abrir seu painel de trabalho.</p>
        {context.clinics.length === 0 ? (
          <section className="panel empty">
            <h2>Aguardando liberação de acesso</h2>
            <p>
              Sua conta ainda não possui vínculo ativo com uma clínica. Solicite
              a liberação ao administrador.
            </p>
          </section>
        ) : (
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
        )}
        <p className="notice">
          {context.clinics.length > 0 &&
          context.clinics.every((c) => c.role === "patient")
            ? "Seu perfil e suas consultas já estão disponíveis. Planos e mensagens serão liberados nas próximas entregas."
            : "Já disponíveis: visão geral, cadastro de pacientes e agenda. Atendimentos e acompanhamento serão liberados nas próximas entregas."}
        </p>
      </main>
    </>
  );
}
