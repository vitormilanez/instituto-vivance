import { notFound, redirect } from "next/navigation";
import { PatientIntakePanel } from "@/components/patient-intake-panel";
import { PatientShell } from "@/components/patient-shell";
import { PatientGoalsInitializer } from "@/components/patient-goals-initializer";
import { AccessError } from "@/modules/identity/service";
import { getPatientOnboarding, OnboardingError } from "@/modules/onboarding/service";
import { getOwnPatientIntake } from "@/modules/patient-intake/service";
import { myPatientProfile } from "@/modules/patients/portal";
import { InputError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function PatientGoalsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const profile = await myPatientProfile(tenantId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const [onboarding, intake] = await Promise.all([
    getPatientOnboarding(tenantId).catch((error) => {
      if (error instanceof OnboardingError && error.status === 404) return null;
      throw error;
    }),
    getOwnPatientIntake(tenantId),
  ]);

  // Contas anteriores ao onboarding não têm linha nessa tabela. Elas já estão
  // em cuidado e podem usar o intake versionado normalmente; só um onboarding
  // realmente em rascunho precisa voltar aos primeiros passos.
  if (onboarding?.status === "draft")
    redirect(`/clinicas/${tenantId}/primeiros-passos`);

  return (
    <PatientShell
      clinic={profile.clinic}
      active="metas"
      title="Metas e expectativas"
      heading="bar"
      backHref={`/clinicas/${tenantId}/meu-cuidado/hoje`}
    >
      {profile.patient && intake ? (
        <div className="onboarding-workspace">
          <header className="onboarding-header">
            <div>
              <h1>Metas e expectativas</h1>
              <p>
                Atualize o que você busca no cuidado. Você pode salvar um
                rascunho e compartilhar quando estiver pronto.
              </p>
            </div>
          </header>
          <PatientIntakePanel
            tenantId={tenantId}
            patientId={intake.patientId}
            initial={intake}
            canEdit
            audience="patient"
          />
        </div>
      ) : profile.patient ? (
        <section className="panel">
          <h1>Comece suas metas</h1>
          <p>
            Prepare um rascunho com o que você busca no cuidado. Nada será
            compartilhado com a equipe até você confirmar o envio.
          </p>
          <PatientGoalsInitializer tenantId={tenantId} />
        </section>
      ) : (
        <section className="panel">
          <h1>Metas ainda indisponíveis</h1>
          <p>A equipe precisa vincular sua conta à sua ficha antes desta etapa.</p>
        </section>
      )}
    </PatientShell>
  );
}
