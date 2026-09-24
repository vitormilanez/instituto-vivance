import { getSubmittedPatientOnboarding } from "@/modules/onboarding/service";
import { OnboardingSummary } from "@/components/onboarding-summary";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPatient } from "@/modules/patients/service";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientRecordHeader } from "@/components/patient-record-header";
import { selectedTab } from "@/modules/workspace/navigation";
import { patientCareContext } from "@/modules/workspace/today";
import { patientHeaderFacts } from "@/modules/workspace/patient-header-facts";
import { PatientCareLinks } from "@/components/today-workspace";
import { StaffLongitudinalWorkspace } from "@/components/longitudinal-workspace";
import { StaffCheckInsPanel } from "@/components/staff-check-ins";
import { staffCheckIns } from "@/modules/daily-check-ins/service";
import { CheckInError } from "@/modules/check-ins/service";
import { staffLongitudinal } from "@/modules/longitudinal/service";
import { DocumentError, staffDocuments } from "@/modules/documents/service";
import { StaffPatientDocumentsPanel } from "@/components/documents-workspace";
import {
  canInvitePatientToIntake,
  getPatientIntake,
} from "@/modules/patient-intake/service";
import { PatientIntakePanel } from "@/components/patient-intake-panel";
import { PatientInvitationForm } from "@/components/patient-invitation-form";
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
    acolhimento?: string;
  }>;
}) {
  const { tenantId, patientId } = await params;
  const query = await searchParams;
  const context = await getPatient(tenantId, patientId).catch((error) => {
    if (error instanceof AccessError && error.status === 401)
      redirect("/login");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  if (!context.patient) notFound();
  const p = context.patient;
  const tabs = ["Visão geral", "Linha do tempo", "Documentos", "Evolução"];
  const active = selectedTab(tabs, query.aba);
  const recordBase = `/clinicas/${tenantId}/pacientes/${patientId}`;
  const clinicalArea = context.clinic.role !== "admin";
  const [onboarding, intake, care] = await Promise.all([
    clinicalArea && active === "Visão geral"
      ? getSubmittedPatientOnboarding(tenantId, patientId)
      : Promise.resolve(null),
    clinicalArea && active === "Visão geral"
      ? getPatientIntake(tenantId, patientId)
      : Promise.resolve(null),
    clinicalArea
      ? patientCareContext(tenantId, patientId)
      : Promise.resolve(null),
  ]);
  const canInviteToIntake =
    intake && !intake.awaitingPatient && context.clinic.role === "doctor"
      ? await canInvitePatientToIntake(tenantId, patientId)
      : false;
  const headerFacts = patientHeaderFacts(care, tenantId);
  const doctorView = context.clinic.role === "doctor";
  const careOverview = care ? (
    <section className="panel patient-record-care">
      <div className="section-heading patient-record-section-heading">
        <div>
          <h2>Visão do cuidado</h2>
          <p>Registros disponíveis para orientar a próxima conversa.</p>
        </div>
      </div>
      <PatientCareLinks
        compactRequests={doctorView}
        base={`/clinicas/${tenantId}`}
        patientId={patientId}
        context={care}
        recordBase={recordBase}
      />
    </section>
  ) : null;
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
  const checkIns =
    clinicalArea && active === "Evolução"
      ? await staffCheckIns(tenantId, patientId).catch(() => null)
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
  const recordSecondary = (
    <div className="patient-record-secondary">
      <section className="panel future-care">
        <h2>Equipe de cuidado</h2>
        {context.clinic.role === "admin" ? (
          <>
            <p>
              Atribua ou revise os profissionais responsáveis por este
              paciente. O acesso clínico começa após o aceite do profissional.
            </p>
            <Link
              className="button secondary"
              href={`/clinicas/${tenantId}/equipe?paciente=${patientId}`}
            >
              Gerenciar equipe deste paciente
            </Link>
          </>
        ) : (
          <p>Consulte os profissionais com responsabilidade ativa por este paciente.</p>
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
  );
  return (
    <ClinicShell clinic={context.clinic} active="patients">
      <div className={doctorView ? "dv-record" : undefined}>
        <Link className="back-link" href={`/clinicas/${tenantId}/pacientes`}>
          Voltar aos pacientes
        </Link>
        <PatientRecordHeader
          patient={p}
          clinicName={context.clinic.name}
          tenantId={tenantId}
          headerFacts={headerFacts}
          hasOnboarding={Boolean(onboarding)}
          clinicalArea={clinicalArea}
          tabs={tabs}
          activeTab={active}
          recordBase={recordBase}
        />
        {active === "Visão geral" ? (
          <div className={doctorView ? "dv-record-overview" : undefined}>
            <div className={doctorView ? "dv-record-main" : undefined}>
            {doctorView && careOverview}
            {intake &&
              (doctorView ? (
                <details
                  className="panel dv-record-disclosure"
                  open={query.acolhimento === "novo"}
                >
                  <summary>Acolhimento e história inicial</summary>
                  <PatientIntakePanel
                    key={`${tenantId}:${patientId}:${intake.record.id}`}
                    tenantId={tenantId}
                    patientId={patientId}
                    initial={intake.record}
                    canEdit={context.clinic.role === "doctor" && !intake.awaitingPatient}
                    awaitingPatient={intake.awaitingPatient}
                    focusOnLoad={query.acolhimento === "novo"}
                  />
                  {canInviteToIntake ? (
                    <details className="patient-record-invitation">
                      <summary>Enviar para o paciente continuar</summary>
                      <PatientInvitationForm
                        tenantId={tenantId}
                        role="doctor"
                        targetPatient={{
                          id: patientId,
                          displayName: p.display_name,
                        }}
                      />
                    </details>
                  ) : null}
                </details>
              ) : (
                <>
                  <PatientIntakePanel
                    key={`${tenantId}:${patientId}:${intake.record.id}`}
                    tenantId={tenantId}
                    patientId={patientId}
                    initial={intake.record}
                    canEdit={
                      context.clinic.role === "doctor" &&
                      !intake.awaitingPatient
                    }
                    awaitingPatient={intake.awaitingPatient}
                    focusOnLoad={query.acolhimento === "novo"}
                  />
                  {canInviteToIntake ? (
                    <details className="panel patient-record-invitation">
                      <summary>Enviar para o paciente continuar</summary>
                      <PatientInvitationForm
                        tenantId={tenantId}
                        role="doctor"
                        targetPatient={{
                          id: patientId,
                          displayName: p.display_name,
                        }}
                      />
                    </details>
                  ) : null}
                </>
              ))}
            {onboarding &&
              (doctorView ? (
                <details className="panel dv-record-disclosure">
                  <summary>Cadastro enviado pelo paciente</summary>
                  <OnboardingSummary
                    record={onboarding}
                    documentsHref={`${recordBase}?aba=Documentos`}
                  />
                </details>
              ) : (
                <OnboardingSummary
                  record={onboarding}
                  documentsHref={`${recordBase}?aba=Documentos`}
                />
              ))}
            {!doctorView && careOverview}
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
            </div>
            {doctorView && recordSecondary}
          </div>
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
          <>
            {checkIns && (
              <StaffCheckInsPanel
                data={checkIns}
                tenantId={tenantId}
                patientId={patientId}
                canEdit={context.clinic.role === "doctor"}
              />
            )}
            <StaffLongitudinalWorkspace
              initial={longitudinal}
              base={recordBase}
              showPatientPicker={false}
              showTimeline={false}
              backHref={`${recordBase}?aba=Linha%20do%20tempo`}
              backLabel="Abrir linha do tempo do paciente"
            />
          </>
        ) : null}
        {active === "Visão geral" && !doctorView && recordSecondary}
      </div>
    </ClinicShell>
  );
}
