import Link from "next/link";
import { ModuleTabs } from "@/components/module-ui";
import type { PatientHeaderFacts } from "@/modules/workspace/patient-header-facts";

export type PatientRecordHeaderPatient = {
  display_name: string;
  birth_date: string | null;
};

export type PatientRecordHeaderProps = {
  patient: PatientRecordHeaderPatient;
  clinicName: string;
  tenantId: string;
  headerFacts: PatientHeaderFacts | null;
  hasOnboarding: boolean;
  clinicalArea: boolean;
  tabs: readonly string[];
  activeTab: string;
  recordBase: string;
};

export function PatientRecordHeader({
  patient,
  clinicName,
  tenantId,
  headerFacts,
  hasOnboarding,
  clinicalArea,
  tabs,
  activeTab,
  recordBase,
}: PatientRecordHeaderProps) {
  const initials = patient.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="clinical-patient-header patient-record-header">
        <span className="patient-avatar patient-avatar-xl" aria-hidden="true">
          {initials}
        </span>
        <div className="clinical-patient-title">
          <h1>{patient.display_name}</h1>
          <div className="patient-record-meta">
            <p>Contexto do paciente · {clinicName}</p>
            <p>
              {patient.birth_date
                ? `Nascimento: ${patient.birth_date.split("-").reverse().join("/")}`
                : "Nascimento não informado"}
            </p>
          </div>
          {(headerFacts || hasOnboarding) && (
            <div className="patient-record-badges">
              {headerFacts && (
                <span className="badge">{headerFacts.relationshipLabel}</span>
              )}
              {hasOnboarding && (
                <span className="badge appointment-status completed">
                  Cadastro inicial enviado
                </span>
              )}
            </div>
          )}
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
            <Link href={`/clinicas/${tenantId}/atendimentos`}>
              Atendimentos
            </Link>
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
      <ModuleTabs tabs={tabs} active={activeTab} base={recordBase} />
    </>
  );
}
