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
import { patientCareContext } from "@/modules/workspace/today";
import { PatientCareLinks } from "@/components/today-workspace";
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
  const care =
    context.clinic.role !== "admin" && active === "Visão geral"
      ? await patientCareContext(tenantId, patientId)
      : null;
  return (
    <ClinicShell clinic={context.clinic} active="patients">
      <Link className="back-link" href={`/clinicas/${tenantId}/pacientes`}>
        Voltar aos pacientes
      </Link>
      <header className="clinical-patient-header patient-record-header">
        <span className="patient-avatar patient-avatar-xl" aria-hidden="true">
          {p.display_name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="clinical-patient-title">
          <h1>{p.display_name}</h1>
          <p>Contexto do paciente · {context.clinic.name}</p>
          <p>
            {p.birth_date
              ? `Nascimento: ${p.birth_date.split("-").reverse().join("/")}`
              : "Nascimento não informado"}
          </p>
        </div>
        <span className="appointment-status scheduled">Cadastro ativo</span>
      </header>
      <ModuleTabs
        tabs={tabs}
        active={active}
        base={`/clinicas/${tenantId}/pacientes/${patientId}`}
      />
      {active === "Visão geral" ? (
        <>
          {care && (
            <section className="panel">
              <h2>Contexto do acompanhamento</h2>
              <p>Registros disponíveis conforme seu vínculo de cuidado.</p>
              <PatientCareLinks
                base={`/clinicas/${tenantId}`}
                patientId={patientId}
                context={care}
              />
            </section>
          )}
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
        </>
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
        <h2>Equipe de cuidado</h2>
        {context.clinic.role === "admin" ? (
          <>
            <p>
              Atribua ou revise os profissionais responsáveis por este paciente.
              A atribuição só libera acesso clínico após o aceite do
              profissional.
            </p>
            <Link
              className="button secondary"
              href={`/clinicas/${tenantId}/equipe?paciente=${patientId}`}
            >
              Gerenciar equipe deste paciente
            </Link>
          </>
        ) : (
          <p>
            Consulte em Equipe de cuidado se este paciente está entre suas
            responsabilidades ativas.
          </p>
        )}
      </section>
      <section className="panel future-care">
        <h2>Próximas etapas do cuidado</h2>
        <p>
          Agenda, Atendimentos e Planos já estão disponíveis. Check-ins e
          documentos serão conectados nas próximas etapas.
        </p>
        <p>
          Esta ficha reúne os dados cadastrais. Os registros de consulta ficam
          em Atendimentos, com acesso restrito à equipe com vínculo de cuidado
          ativo.
        </p>
      </section>
    </ClinicShell>
  );
}
