import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/header";
import { myPatientProfile } from "@/modules/patients/portal";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
export const dynamic = "force-dynamic";

export default async function MyProfile({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const { clinic, patient } = await myPatientProfile(tenantId).catch(
    (error) => {
      if (error instanceof AccessError && error.status === 401) redirect("/");
      if (error instanceof AccessError || error instanceof InputError)
        notFound();
      throw error;
    },
  );
  return (
    <>
      <Header />
      <main id="conteudo" className="container">
        <div className="page-heading">
          <div>
            <h1>Meu perfil</h1>
            <p>Clínica: {clinic.name}.</p>
          </div>
        </div>
        {patient ? (
          <section className="panel">
            <h2>Seus dados</h2>
            <dl className="patient-facts">
              <div>
                <dt>Nome completo</dt>
                <dd>{patient.display_name}</dd>
              </div>
              <div>
                <dt>Data de nascimento</dt>
                <dd>
                  {patient.birth_date
                    ? patient.birth_date.split("-").reverse().join("/")
                    : "Não informada"}
                </dd>
              </div>
            </dl>
            <p style={{ marginTop: 28 }}>
              Se algum dado precisar de correção, fale com a equipe da clínica.
            </p>
          </section>
        ) : (
          <section className="panel">
            <h2>Seu cadastro está sendo preparado</h2>
            <p>
              A equipe precisa vincular sua conta à sua ficha. Entre em contato
              com a clínica.
            </p>
          </section>
        )}
        <section className="panel future-care">
          <h2>Seu acompanhamento</h2>
          <p>
            Consultas, planos de cuidado, documentos e mensagens serão
            disponibilizados nas próximas etapas.
          </p>
        </section>
      </main>
    </>
  );
}
