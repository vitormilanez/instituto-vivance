import { getSubmittedPatientOnboarding } from "@/modules/onboarding/service";
import { OnboardingSummary } from "@/components/onboarding-summary";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPatient } from "@/modules/patients/service";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { ModuleTabs } from "@/components/module-ui";
import { selectedTab } from "@/modules/workspace/navigation";
import { patientCareContext } from "@/modules/workspace/today";
import { patientHeaderFacts } from "@/modules/workspace/patient-header-facts";
import { PatientCareLinks } from "@/components/today-workspace";
import { StaffLongitudinalWorkspace } from "@/components/longitudinal-workspace";
import { CheckInError } from "@/modules/check-ins/service";
import { staffLongitudinal } from "@/modules/longitudinal/service";
import { DocumentError, staffDocuments } from "@/modules/documents/service";
import { StaffPatientDocumentsPanel } from "@/components/documents-workspace";
export const dynamic = "force-dynamic";

export default async function Patient({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; patientId: string }>;
  searchParams: Promise<{
    aba?: string | string[];
    pagina?: string;
    inicio?: string;
    fim?: string;
    cursor?: string;
  }>;
}) {
  const { tenantId, patientId } = await params;
  const query = await searchParams;
  const context = await getPatient(tenantId, patientId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  if (!context.patient) notFound();
  const p = context.patient;
  const tabs = ["Visão geral", "Linha do tempo", "Documentos", "Evolução"];
  const active = selectedTab(tabs, query.aba);
  const recordBase = `/clinicas/${tenantId}/pacientes/${patientId}`;
  const clinicalArea = context.clinic.role !== "admin";
  const onboarding =
    clinicalArea && active === "Visão geral"
      ? await getSubmittedPatientOnboarding(tenantId, patientId)
      : null;
  const care = clinicalArea
    ? await patientCareContext(tenantId, patientId)
    : null;
  const headerFacts = patientHeaderFacts(care, tenantId);
  const longitudinal =
    clinicalArea && ["Linha do tempo", "Evolução"].includes(active)
      ? await staffLongitudinal(tenantId, patientId, {
          from: query.inicio,
          to: query.fim,
          cursor: query.cursor,
        }).catch((error) => {
          if (error instanceof CheckInError || error instanceof InputError)
            redirect(`${recordBase}?aba=Evolu%C3%A7%C3%A3o`);
          throw error;
        })
      : null;
  const documents =
    clinicalArea && active === "Documentos"
      ? await staffDocuments(tenantId, query.pagina, patientId).catch(
          (error) => {
            if (error instanceof DocumentError || error instanceof InputError)
              notFound();
            throw error;
          },
        )
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
        {headerFacts ? null : (
          <span className="appointment-status scheduled">
            Cadastro disponível
          </span>
        )}
        {clinicalArea && (
          <nav
            className="patient-record-actions"
            aria-label="Ações deste paciente"
          >
            <Link href={`/clinicas/${tenantId}/agenda`}>Ver agenda</Link>
            <Link href={`/clinicas/${tenantId}/atendimentos`}>Atendimentos</Link>
            <Link href={`/clinicas/${tenantId}/planos`}>Planos de cuidado</Link>
          </nav>
        )}
      </header>
      {headerFacts && (
        <dl
          className="encounter-context-strip patient-record-facts"
          aria-label="Contexto de cuidado do paciente"
        >
          <div>
            <dt>Vínculo</dt>
            <dd>{headerFacts.relationshipLabel}</dd>
          </div>
          <div>
            <dt>Última consulta</dt>
            <dd>
              {headerFacts.encounterHref ? (
                <Link href={headerFacts.encounterHref}>
                  {headerFacts.encounterLabel}
                </Link>
              ) : (
                "Nenhum registro finalizado"
              )}
            </dd>
          </div>
          <div>
            <dt>Plano de cuidado</dt>
            <dd>
              {headerFacts.planHref ? (
                <Link href={headerFacts.planHref}>{headerFacts.planLabel}</Link>
              ) : (
                "Nenhum plano publicado"
              )}
            </dd>
          </div>
          <div>
            <dt>Próxima consulta</dt>
            <dd>
              {headerFacts.nextAppointmentHref ? (
                <Link href={headerFacts.nextAppointmentHref}>
                  {headerFacts.nextAppointmentLabel}
                </Link>
              ) : (
                "Nenhuma consulta agendada"
              )}
            </dd>
          </div>
        </dl>
      )}
      <ModuleTabs tabs={tabs} active={active} base={recordBase} />
      {active === "Visão geral" ? (
        <>
          {onboarding && (
            <OnboardingSummary
              record={onboarding}
              documentsHref={`${recordBase}?aba=Documentos`}
            />
          )}
          {care && (
            <section className="panel patient-record-care">
              <div className="section-heading patient-record-section-heading">
                <div>
                  <h2>Visão do cuidado</h2>
                  <p>Registros disponíveis para orientar a próxima conversa.</p>
                </div>
              </div>
              <PatientCareLinks
                base={`/clinicas/${tenantId}`}
                patientId={patientId}
                context={care}
                recordBase={recordBase}
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
      ) : !clinicalArea ? (
        <section className="panel">
          <h2>Acesso clínico restrito</h2>
          <p>
            O perfil administrativo pode organizar vínculos, mas não acessa
            documentos, relatos, medidas ou histórico clínico.
          </p>
        </section>
      ) : active === "Documentos" && documents ? (
        <StaffPatientDocumentsPanel
          initial={documents}
          base={`${recordBase}?aba=Documentos`}
        />
      ) : active === "Linha do tempo" && longitudinal ? (
        <StaffLongitudinalWorkspace
          initial={longitudinal}
          base={recordBase}
          showPatientPicker={false}
          showMeasures={false}
          backHref={`${recordBase}?aba=Visão%20geral`}
          backLabel="Voltar à visão geral do paciente"
        />
      ) : active === "Evolução" && longitudinal ? (
        <StaffLongitudinalWorkspace
          initial={longitudinal}
          base={recordBase}
          showPatientPicker={false}
          showTimeline={false}
          backHref={`${recordBase}?aba=Linha%20do%20tempo`}
          backLabel="Abrir linha do tempo do paciente"
        />
      ) : null}
      {active === "Visão geral" && (
        <div className="patient-record-secondary">
          <section className="panel future-care">
            <h2>Equipe de cuidado</h2>
            {context.clinic.role === "admin" ? (
              <>
                <p>
                  Atribua ou revise os profissionais responsáveis por este
                  paciente. O acesso clínico começa após o aceite do
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
                Consulte os profissionais com responsabilidade ativa por este
                paciente.
              </p>
            )}
          </section>
          <section className="panel future-care">
            <h2>Onde continuar</h2>
            <p>
              Use a Agenda para os próximos encontros e Atendimentos para os
              registros de consulta disponíveis ao seu vínculo.
            </p>
            <div className="patient-record-next-links">
              <Link href={`/clinicas/${tenantId}/agenda`}>Abrir agenda</Link>
              <Link href={`/clinicas/${tenantId}/atendimentos`}>
                Ver atendimentos
              </Link>
            </div>
          </section>
        </div>
      )}
    </ClinicShell>
  );
}
