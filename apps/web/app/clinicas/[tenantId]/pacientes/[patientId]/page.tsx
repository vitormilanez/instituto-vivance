import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPatient } from "@/modules/patients/service";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import {
  DevelopmentNotice,
  EmptyModule,
  ModuleTabs,
} from "@/components/module-ui";
import { selectedTab } from "@/modules/workspace/navigation";
export const dynamic = "force-dynamic";

export default async function Patient({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; patientId: string }>;
  searchParams: Promise<{ aba?: string | string[] }>;
}) {
  const { tenantId, patientId } = await params;
  const context = await getPatient(tenantId, patientId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  if (!context.patient) notFound();
  const p = context.patient;
  const tabs = ["Visão geral", "Linha do tempo", "Documentos", "Evolução"];
  const active = selectedTab(tabs, (await searchParams).aba);
  return (
    <ClinicShell clinic={context.clinic} active="patients">
      <Link className="back-link" href={`/clinicas/${tenantId}/pacientes`}>
        Voltar aos pacientes
      </Link>
      <div className="page-heading">
        <div>
          <h1>{p.display_name}</h1>
          <p>Ficha cadastral · {context.clinic.name}</p>
        </div>
      </div>
      <ModuleTabs
        tabs={tabs}
        active={active}
        base={`/clinicas/${tenantId}/pacientes/${patientId}`}
      />
      {active === "Visão geral" ? (
        <section className="panel">
          <h2>Dados do paciente</h2>
          <dl className="patient-facts">
            <div>
              <dt>Nome completo</dt>
              <dd>{p.display_name}</dd>
            </div>
            <div>
              <dt>Data de nascimento</dt>
              <dd>
                {p.birth_date
                  ? p.birth_date.split("-").reverse().join("/")
                  : "Não informada"}
              </dd>
            </div>
            <div>
              <dt>Cadastrado em</dt>
              <dd>
                {new Date(p.created_at).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </dd>
            </div>
            <div>
              <dt>Última atualização</dt>
              <dd>
                {new Date(p.updated_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <>
          <DevelopmentNotice />
          <section className="panel">
            <h2>{active}</h2>
            <EmptyModule title="Esta parte da ficha ainda será conectada">
              Os registros clínicos serão disponibilizados após a integração e a
              definição das permissões da equipe de cuidado.
            </EmptyModule>
          </section>
        </>
      )}
      <section className="panel future-care">
        <h2>Próximas etapas do cuidado</h2>
        <p>
          Agenda, atendimentos, evolução, planos e documentos ainda não estão
          disponíveis nesta versão.
        </p>
        <p>
          Esta ficha reúne os dados cadastrais. O registro clínico será liberado
          com acesso específico para a equipe responsável pelo cuidado.
        </p>
      </section>
    </ClinicShell>
  );
}
