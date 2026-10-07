import Link from "next/link";
import { notFound } from "next/navigation";
import { DoctorShell } from "@/components/doctor-shell";
import { ConsultationBlock } from "@/components/consultation-block";
import { StaffMessagesWorkspace } from "@/components/messages-workspace";
import { Agenda } from "@/components/agenda";
import { OnboardingWorkspace, type OnboardingDraft } from "@/components/onboarding-workspace";
import { PatientInvitationForm } from "@/components/patient-invitation-form";
import type { Appointment } from "@/modules/agenda/service";
import { deterministicConsultationBrief } from "@/modules/ai/consultation-brief-data";
import type { PatientCareContext } from "@/modules/workspace/today";
import { staffShortcuts } from "@/modules/workspace/navigation";
import { clinicDate } from "@/modules/agenda/validation";
import { StaffPatientDocumentsPanel } from "@/components/documents-workspace";
import type { StaffDocuments } from "@/modules/documents/service";

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
    preparation: { id: "synthetic-preparation", status: "submitted", submitted_at: instant(-90), goal: "Revisar a rotina e tirar dúvidas.", answers: {goal: "Revisar a rotina e tirar dúvidas sobre os próximos passos.", changes: "Estou dormindo melhor nos últimos dias.", routine: "Tenho caminhado no fim da tarde.", treatment: "Estou seguindo as orientações da última conversa.", questions: "Como manter a rotina durante as viagens?"} },
    previousPreparation: { id: "synthetic-preparation-before", submitted_at: instant(-10080), answers: { goal: "Entender como organizar os horários.", changes: "Comecei a anotar meu sono.", routine: "Ainda sem rotina fixa.", treatment: "Orientações da consulta anterior.", questions: "Como acompanhar a mudança na rotina?" } },
    preparationHistory: [],
    documentItems: [{id: "synthetic-exam-1", title: "Exames laboratoriais · FICTÍCIO", created_at: instant(-120)}, {id: "synthetic-exam-2", title: "Exame de imagem · FICTÍCIO", created_at: instant(-240)}],
    prescriptions: {total: 0, available: true},
    onboarding: { id: "synthetic-onboarding", submittedAt: instant(-20160), answers: draft.answers, measurements: { ...draft.measurements, weightKg: 82, measuredOn: new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10) } },
    documents: { total: 2, latest_at: instant(-120) }, measurements: { total: 3, latest_at: instant(-90) },
    intake: null, requests: [{ id: "synthetic-goals-request", kind: "goals", requested_at: instant(-180) }],
  };
  const dates = [-14, -12, -10, -7, -5, -3, -1, 0].map(days => new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10));
  const weights = [82, 81.2, 81.4, 80.5, 80.6, 79.9, 79.2, 78.8].map((value, index) => ({ value, date: dates[index] }));
  const demoDocuments = [
    { id: "00000000-0000-4000-8000-000000000021", display_title: "Ultrassonografia da tireoide e região cervical", category: "exam", original_filename: "f1a2b3c4-1111-4222-8333-123456789abc.pdf", content_type: "application/pdf", created_at: instant(-360), available_at: instant(-360) },
    { id: "00000000-0000-4000-8000-000000000022", display_title: "Ultrassonografia do abdome total", category: "exam", original_filename: "f1a2b3c4-1111-4222-8333-123456789abd.pdf", content_type: "application/pdf", created_at: instant(-420), available_at: instant(-420) },
    { id: "00000000-0000-4000-8000-000000000023", display_title: "Ultrassonografia da tireoide e região cervical", category: "exam", original_filename: "f1a2b3c4-1111-4222-8333-123456789abe.pdf", content_type: "application/pdf", created_at: instant(-1440), available_at: instant(-1440) },
    { id: "00000000-0000-4000-8000-000000000024", display_title: null, category: "clinical_document", original_filename: "Captura de Tela 2026-09-22 às 12.35.25.png", content_type: "image/png", created_at: instant(-2880), available_at: instant(-2880) },
  ];
  const documentPreview = {
    clinic: { id: tenant, name: "Clínica demonstrativa", role: "doctor", displayName: "Dra. Marina · FICTÍCIO" },
    documents: demoDocuments.map((item) => ({ ...item, tenant_id: tenant, patient_id: patient, uploaded_by: patient,
      storage_path: `patient-documents/${item.id}`, byte_size: 180000, visibility: "shared", status: "available",
      rejected_at: null, attached_to: "documents", patients: { display_name: "Ana Souza · FICTÍCIO" } })),
    reviews: [], canReview: true, patients: [{ id: patient, display_name: "Ana Souza · FICTÍCIO" }],
    patient, page: 1, hasNext: false,
  } as unknown as StaffDocuments;
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
        <Link href="/refinamentos-preview?tela=documentos">Documentos</Link>
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
        page: 1, references: [
          { type: "document", id: "synthetic-exam-1", label: "Exames laboratoriais · FICTÍCIO", group: "Documentos compartilhados" },
          { type: "document", id: "synthetic-exam-2", label: "Exame de imagem · FICTÍCIO", group: "Documentos compartilhados" },
        ], messages: [
          { id: "synthetic-message-1", client_request_id: "synthetic-request-1", content: "Tenho dúvidas sobre a rotina desta semana. · FICTÍCIO", conversation_id: "synthetic-conversation", doctor_id: doctor, patient_id: patient, sender_id: patient, sent_at: instant(-360), tenant_id: tenant, references: [] },
          { id: "synthetic-message-2", client_request_id: "synthetic-request-2", content: "Podemos conversar na próxima consulta. · FICTÍCIO", conversation_id: "synthetic-conversation", doctor_id: doctor, patient_id: patient, sender_id: doctor, sent_at: instant(-240), tenant_id: tenant, references: [] },
          { id: "synthetic-message-3", client_request_id: "synthetic-request-3", content: "Enviei os exames pelo app. · FICTÍCIO", conversation_id: "synthetic-conversation", doctor_id: doctor, patient_id: patient, sender_id: patient, sent_at: instant(-120), tenant_id: tenant, references: [] },
        ], hasNext: false, lastReadAt: null,
        context: {
          documents: { state: "ready", count: 2, latest: { title: "Avaliação inicial.pdf", at: instant(-120), href: `${base}/documentos?paciente=${patient}` } },
          exams: { state: "ready", count: 3, latest: { title: "Exames laboratoriais.pdf", at: instant(-90), href: `${base}/documentos?paciente=${patient}` } },
          records: { state: "ready", count: 1, latest: { title: "Consulta de acompanhamento", at: instant(-1440), href: `${base}/atendimentos/synthetic-previous` } },
          weight: { state: "ready", points: [{ value: 82, date: dates[0] }, { value: 80.5, date: dates[1] }, { value: 78.8, date: dates[2] }] },
        },
      }} />
      : tela === "documentos" ? <StaffPatientDocumentsPanel initial={documentPreview} base={`${base}/pacientes/${patient}?aba=Documentos`} />
      : tela === "convite" ? <PatientInvitationForm tenantId={tenant} role="admin" doctors={[{ id: doctor, displayName: "Dra. Marina · FICTÍCIO" }]} />
      : tela === "onboarding" ? <OnboardingWorkspace tenantId={tenant} clinicName="Clínica demonstrativa" doctorName="Dra. Marina" initial={draft} />
      : <div className="doctor-home"><div className="doctor-home-overview"><aside className="doctor-home-focus"><ConsultationBlock compact base={base} tenantId={tenant} today={today} now={now.toISOString()} appointment={{ ...appointment, teleconsultation: { delivery_mode: "video", join_url: "https://meet.google.com/abc-defg-hij" } }} eyebrow="Próxima consulta" link={{ status: "active" }} context={context} weight={weights} brief={deterministicConsultationBrief({tenantId:tenant, patientId:patient, appointment, context, documentReview:{pending:true,total:2,documentIds:["synthetic-exam-1","synthetic-exam-2"]}})} workItems={[{kind:"documents",id:"docs-demo",patientId:patient,patientName:"Ana · FICTÍCIO",total:2,state:"2 documentos sem revisão médica",action:"Revisar documentos",href:`${base}/pacientes/${patient}?aba=Documentos`,since:instant(-240)}]} draft={{id:"synthetic-draft",appointment_id:null,updated_at:instant(-60)}} received={{ visible: [], more: [], total: 0, empty: "Nenhum novo envio desde a última consulta.", failedLabels: [] }} /><section className="doctor-shortcuts panel"><h2>Ações rápidas</h2><ul className="more-tools-list">{staffShortcuts(base).map(action => <li key={action.title}><Link className="more-tools-link" href={action.href}><strong>{action.title}</strong></Link></li>)}</ul></section></aside><aside className="panel"><h2>Para revisar</h2><p>Nenhum envio pendente nesta demonstração.</p></aside></div></div>}
  </DoctorShell>;
}
