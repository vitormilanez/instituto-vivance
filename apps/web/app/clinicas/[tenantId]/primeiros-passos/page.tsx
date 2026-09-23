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
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ detalhes?: string }>;
}) {
  const { tenantId } = await params;
  const query = await searchParams;
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
    <PatientShell clinic={context.clinic} active="hoje">
      {intake && query.detalhes !== "1" ? (
        <div className="onboarding-workspace">
          <header className="onboarding-header">
            <div>
              <h1>Seu começo na {data?.clinicName ?? context.clinic.name}</h1>
              <p>
                Responda às três perguntas padrão e compartilhe o que é mais
                importante para a primeira conversa.
              </p>
            </div>
          </header>
          <PatientIntakePanel
            tenantId={tenantId}
            patientId={intake.patientId}
            initial={intake}
            canEdit
            audience="patient"
            continueHref={`/clinicas/${tenantId}/meu-cuidado/hoje`}
            detailsHref={data ? `/clinicas/${tenantId}/primeiros-passos?detalhes=1` : undefined}
          />
        </div>
      ) : data ? (
        <OnboardingWorkspace
          tenantId={tenantId}
          clinicName={data.clinicName}
          doctorName={data.doctorName}
          initial={data.onboarding}
          skipQuestions={Boolean(intake)}
        />
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
