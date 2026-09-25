import Link from "next/link";
import { notFound } from "next/navigation";
import { DoctorShell } from "@/components/doctor-shell";
import { ConsultationBlock } from "@/components/consultation-block";
import { StaffMessagesWorkspace } from "@/components/messages-workspace";
import { Agenda } from "@/components/agenda";
import { OnboardingWorkspace, type OnboardingDraft } from "@/components/onboarding-workspace";
import { PatientInvitationForm } from "@/components/patient-invitation-form";
import type { Appointment } from "@/modules/agenda/service";
import type { PatientCareContext } from "@/modules/workspace/today";
import { staffActions } from "@/modules/workspace/navigation";
import { clinicDate } from "@/modules/agenda/validation";

export const dynamic = "force-dynamic";

// Development-only composition of the real components, using synthetic data.
// No credentials, records or alternative write endpoints are provided here.
export default async function RefinementsPreview({ searchParams }: {
  searchParams: Promise<{ tela?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { tela } = await searchParams;
  const tenant = "00000000-0000-4000-8000-000000000001";
  const patient = "00000000-0000-4000-8000-000000000002";
  const doctor = "00000000-0000-4000-8000-000000000003";
  const now = new Date();
  const today = clinicDate(now);
  const instant = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();
  const base = `/clinicas/${tenant}`;
  const appointment: Appointment = {
    id: "00000000-0000-4000-8000-000000000004", patient_id: patient, doctor_id: doctor,
    doctor_display_name: "Dra. Marina · FICTÍCIO", starts_at: instant(15), ends_at: instant(45),
    kind: "consultation", status: "scheduled", version: 1, started_at: null, completed_at: null,
    cancelled_at: null, no_show_at: null, patients: { display_name: "Ana Souza · FICTÍCIO" },
  };
  const draft: OnboardingDraft = {
    tenantId: tenant, patientId: patient, status: "draft", currentStep: "questions", skippedSteps: [], version: 2,
    profile: { photoDocumentId: null, birthDate: null },
    measurements: { weightKg: 78.8, heightCm: 173, waistCm: null, measuredOn: today },
    answers: { goal: "Cuidar do peso", history: "Quero cuidar melhor da minha rotina.", routine: "Sono irregular durante a semana.", treatments: "Conversar com a médica.", questions: "Como organizar os próximos passos?" },
    examDocumentIds: [], shareConsent: false, submittedAt: null, updatedAt: now.toISOString(),
  };
  const context: PatientCareContext = {
    relationshipId: "synthetic-relationship", canReviewPreparation: true,
    encounter: { id: "synthetic-previous", finalized_at: instant(-1440), evolution: "Registro demonstrativo de acompanhamento." },
    nextAppointment: { id: appointment.id, starts_at: appointment.starts_at, status: "scheduled" },
    preparationAppointmentAt: appointment.starts_at, publications: [],
    preparation: { id: "synthetic-preparation", status: "submitted", submitted_at: instant(-90), goal: "Revisar a rotina e tirar dúvidas.", answers: draft.answers },
    previousPreparation: null,
    onboarding: { submittedAt: instant(-20160), answers: draft.answers, measurements: { ...draft.measurements, weightKg: 82, measuredOn: new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10) } },
    documents: { total: 2, latest_at: instant(-120) }, measurements: { total: 3, latest_at: instant(-90) },
    intake: { hasGoal: true, updatedAt: instant(-90) }, requests: [],
  };
  const dates = [-14, -7, 0].map(days => new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10));
  return <DoctorShell clinic={{ id: tenant, name: "Clínica demonstrativa", role: "doctor", displayName: "Dra. Marina · FICTÍCIO" }} active={tela === "agenda" ? "agenda" : tela === "mensagens" ? "mensagens" : "home"} notificationCount={0}>
    <section className="notice" aria-label="Prévia local">
      <strong>Prévia local · dados fictícios</strong>
      <p>Componentes reais com dados fictícios. Links para prontuário e solicitações exigem login; esta prévia mostra o layout, sem criar registros.</p>
      <nav className="agenda-actions" aria-label="Telas da prévia">
        <Link href="/refinamentos-preview">Consulta</Link>
        <Link href="/refinamentos-preview?tela=agenda">Agenda</Link>
        <Link href="/refinamentos-preview?tela=convite">Convite</Link>
        <Link href="/refinamentos-preview?tela=onboarding">Onboarding</Link>
        <Link href="/refinamentos-preview?tela=mensagens">Mensagens</Link>
      </nav>
    </section>
    {tela === "agenda" ? <Agenda tenantId={tenant} today={today} date={today} currentTime={now.toISOString()} canStart canManage truncated={false}
      options={{ patients: [{ id: patient, display_name: "Ana Souza · FICTÍCIO" }], doctors: [{ user_id: doctor, display_name: "Dra. Marina · FICTÍCIO" }] }}
      appointments={[
        { ...appointment, id: "00000000-0000-4000-8000-000000000010", starts_at: instant(-90), ends_at: instant(-60) },
        { ...appointment, id: "00000000-0000-4000-8000-000000000011", starts_at: instant(-60), ends_at: instant(-30), status: "completed", encounter: { id: "synthetic-final", appointment_id: "00000000-0000-4000-8000-000000000011", status: "finalized" } },
        { ...appointment, id: "00000000-0000-4000-8000-000000000012", starts_at: instant(-15), ends_at: instant(15), status: "in_progress", encounter: { id: "synthetic-draft", appointment_id: "00000000-0000-4000-8000-000000000012", status: "draft" } },
        appointment,
      ]} />
      : tela === "mensagens" ? <StaffMessagesWorkspace initial={{
        clinic: { id: tenant, name: "Clínica demonstrativa", role: "doctor", displayName: "Dra. Marina · FICTÍCIO" }, userId: doctor,
        recipients: [{ id: patient, displayName: "Ana Souza · FICTÍCIO", lastMessageAt: null, hasUnread: false }],
        selected: { patientId: patient, doctorId: doctor, displayName: "Ana Souza · FICTÍCIO" },
        page: 1, references: [], messages: [], hasNext: false, lastReadAt: null,
        context: {
          documents: { state: "ready", count: 2, latest: { title: "Avaliação inicial.pdf", at: instant(-120), href: `${base}/documentos?paciente=${patient}` } },
          exams: { state: "ready", count: 3, latest: { title: "Exames laboratoriais.pdf", at: instant(-90), href: `${base}/documentos?paciente=${patient}` } },
          records: { state: "ready", count: 1, latest: { title: "Consulta de acompanhamento", at: instant(-1440), href: `${base}/atendimentos/synthetic-previous` } },
          weight: { state: "ready", points: [{ value: 82, date: dates[0] }, { value: 80.5, date: dates[1] }, { value: 78.8, date: dates[2] }] },
        },
      }} />
      : tela === "convite" ? <PatientInvitationForm tenantId={tenant} role="admin" doctors={[{ id: doctor, displayName: "Dra. Marina · FICTÍCIO" }]} />
      : tela === "onboarding" ? <OnboardingWorkspace tenantId={tenant} clinicName="Clínica demonstrativa" doctorName="Dra. Marina" initial={draft} />
      : <div className="doctor-home-overview"><aside className="doctor-home-focus"><ConsultationBlock compact base={base} tenantId={tenant} today={today} now={now.toISOString()} appointment={{ ...appointment, teleconsultation: { delivery_mode: "video", join_url: "https://meet.google.com/abc-defg-hij" } }} eyebrow="Próxima consulta" link={{ status: "active" }} context={context} weight={[{ value: 82, date: dates[0] }, { value: 80.5, date: dates[1] }, { value: 78.8, date: dates[2] }]} draft={null} received={{ visible: [], more: [], total: 0, empty: "Nenhum novo envio desde a última consulta.", failedLabels: [] }} /><section className="doctor-shortcuts panel"><h2>Ações rápidas</h2><ul className="more-tools-list">{staffActions(base).map(action => <li key={action.title}><Link className="more-tools-link" href={action.href}><strong>{action.title}</strong></Link></li>)}</ul></section></aside><aside className="panel"><h2>Para revisar</h2><p>Nenhum envio pendente nesta demonstração.</p></aside></div>}
  </DoctorShell>;
}
