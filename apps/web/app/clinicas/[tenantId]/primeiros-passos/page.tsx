import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClinic, AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import {
  getPatientOnboardingContext,
  OnboardingError,
} from "@/modules/onboarding/service";
import { PatientShell } from "@/components/patient-shell";
import { OnboardingWorkspace } from "@/components/onboarding-workspace";
import { getOwnPatientIntake } from "@/modules/patient-intake/service";
import { PatientIntakePanel } from "@/components/patient-intake-panel";

export const dynamic = "force-dynamic";
export default async function FirstSteps({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const context = await requireClinic(tenantId, ["patient"]).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const [data, intake] = await Promise.all([
    getPatientOnboardingContext(tenantId).catch((error) => {
      if (error instanceof OnboardingError && error.status === 404) return null;
      throw error;
    }),
    getOwnPatientIntake(tenantId),
  ]);
  return (
    <PatientShell clinic={context.clinic} active="primeiros-passos" title="Primeiros passos" heading="page">
      {data ? (
        <OnboardingWorkspace tenantId={tenantId} clinicName={data.clinicName} doctorName={data.doctorName}
          initial={{...data.onboarding, answers:{...data.onboarding.answers,
            goal:data.onboarding.answers.goal || [intake?.reason, intake?.expectedOutcome].filter(Boolean).join(". ")}}}/>
      ) : intake ? (
        <PatientIntakePanel tenantId={tenantId} patientId={intake.patientId} initial={intake} canEdit
          audience="patient" continueHref={`/clinicas/${tenantId}/meu-cuidado/hoje`}/>
      ) : (
        <section className="panel">
          <h1>Seu cuidado já começou</h1>
          <p>
            Não há um cadastro inicial pendente para esta conta. Você pode
            enviar exames e conversar com seu médico pela sua área.
          </p>
          <Link
            className="button"
            href={`/clinicas/${tenantId}/meu-cuidado/hoje`}
          >
            Ir para meu cuidado
          </Link>
        </section>
      )}
    </PatientShell>
  );
}
