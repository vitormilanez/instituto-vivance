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

export const dynamic = "force-dynamic";
export default async function FirstSteps({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const context = await requireClinic(tenantId, ["patient"]).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const data = await getPatientOnboardingContext(tenantId).catch((error) => {
    if (error instanceof OnboardingError && error.status === 404) return null;
    throw error;
  });
  return (
    <PatientShell clinic={context.clinic} active="hoje">
      {data ? (
        <OnboardingWorkspace
          tenantId={tenantId}
          clinicName={data.clinicName}
          doctorName={data.doctorName}
          initial={data.onboarding}
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
