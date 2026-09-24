import Link from "next/link";
import { TeleconsultationWorkspace } from "@/components/teleconsultation-workspace";
import { getAppointmentTeleconsultation } from "@/modules/teleconsultations/service";
import { patientCareContext } from "@/modules/workspace/today";
import {
  ContextCardList,
  contextCardsFrom,
} from "@/components/context-card-list";
import { EncounterPreparationSummary } from "@/components/preparation-summary";
import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/modules/identity/service";
import { EncounterError, loadEncounter } from "@/modules/encounters/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { EncounterEditor } from "@/components/encounter-editor";
import { stageFromSlug } from "@/modules/encounters/stages";
import { getSubmittedPatientOnboarding } from "@/modules/onboarding/service";
import { encounterPreparation } from "@/modules/return-preparation/service";
import { getPatientIntake } from "@/modules/patient-intake/service";
export const dynamic = "force-dynamic";
export default async function EncounterPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; encounterId: string }>;
  searchParams: Promise<{
    versoes_antes_de?: string;
    adendos_antes_de?: string;
    etapa?: string;
    modo?: string;
  }>;
}) {
  const { tenantId, encounterId } = await params;
  const page = await searchParams;
  const detail = await loadEncounter(tenantId, encounterId, {
    beforeVersion: page.versoes_antes_de,
    beforeAddendum: page.adendos_antes_de,
  }).catch((e) => {
    if (e instanceof AccessError && e.status === 401) redirect("/login");
    if (
      e instanceof AccessError ||
      e instanceof EncounterError ||
      e instanceof InputError
    )
      notFound();
    throw e;
  });
  const focusMode =
    page.modo === "teleconsulta" && detail.clinic.role === "doctor";
  const [intake, onboarding, preparation, call, careContext] =
    await Promise.all([
      getPatientIntake(tenantId, detail.encounter.patient_id),
      getSubmittedPatientOnboarding(tenantId, detail.encounter.patient_id),
      encounterPreparation(tenantId, detail.encounter.appointment_id),
      focusMode
        ? getAppointmentTeleconsultation(
            tenantId,
            detail.encounter.appointment_id,
          )
            .then((teleconsultation) => ({
              teleconsultation,
              unavailable: false,
            }))
            .catch(() => ({ teleconsultation: null, unavailable: true }))
        : null,
      focusMode
        ? patientCareContext(tenantId, detail.encounter.patient_id)
        : null,
    ]);
  const editor = (
    <EncounterEditor
      key={`${detail.encounter.id}:${page.versoes_antes_de ?? "latest"}:${page.adendos_antes_de ?? "latest"}`}
      initial={detail}
      intake={intake}
      onboarding={onboarding}
      preparation={preparation}
      initialStage={stageFromSlug(
        page.etapa ?? (focusMode ? "consulta" : undefined),
      )}
      autoSave={focusMode}
      compact={focusMode}
    />
  );
  const base = `/clinicas/${tenantId}`;
  // Use this appointment's preparation, never a different future appointment.
  const context = careContext
    ? {
        ...careContext,
        preparation: preparation
          ? {
              id: preparation.id,
              status: preparation.status,
              submitted_at: preparation.submission.submitted_at,
            }
          : null,
      }
    : null;
  return (
    <ClinicShell
      clinic={detail.clinic}
      active="atendimentos"
      focusMode={focusMode}
    >
      {focusMode ? (
        <TeleconsultationWorkspace
          tenantId={tenantId}
          encounterId={encounterId}
          patientName={detail.encounter.patients?.display_name ?? "Paciente"}
          url={
            detail.encounter.status === "draft" &&
            call?.teleconsultation?.delivery_mode === "video"
              ? call.teleconsultation.join_url
              : null
          }
          unavailable={call?.unavailable}
          context={
            <>
              <section className="panel">
                <h2>Contexto para a conversa</h2>
                {context ? (
                  <ContextCardList
                    cards={contextCardsFrom(
                      base,
                      detail.encounter.patient_id,
                      context,
                    )}
                  />
                ) : (
                  <p>O contexto não está disponível para este vínculo.</p>
                )}
              </section>
              {preparation && (
                <details className="panel">
                  <summary>Pré-consulta · relato original do paciente</summary>
                  <EncounterPreparationSummary
                    preparation={preparation}
                    tenantId={tenantId}
                  />
                </details>
              )}
            </>
          }
        >
          {editor}
        </TeleconsultationWorkspace>
      ) : (
        <>
          {detail.clinic.role === "doctor" && (
            <div className="teleconsultation-open-mode">
              <Link
                className="button secondary"
                href={`${base}/atendimentos/${encounterId}?modo=teleconsulta&etapa=consulta`}
              >
                Abrir modo atendimento
              </Link>
            </div>
          )}
          {editor}
        </>
      )}
    </ClinicShell>
  );
}
