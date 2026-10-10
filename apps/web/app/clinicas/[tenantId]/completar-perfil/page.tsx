import { notFound, redirect } from "next/navigation";
import { AccessError, requireClinic } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { getPatientOnboarding, OnboardingError } from "@/modules/onboarding/service";
import { getPatientProfileContext } from "@/modules/onboarding/profile-service";
import { PatientShell } from "@/components/patient-shell";
import { PatientProfileWorkspace } from "@/components/patient-profile-workspace";
import type { ProfileSection } from "@/modules/onboarding/profile-types";

export const dynamic = "force-dynamic";
export default async function CompleteProfile({params,searchParams}:{params:Promise<{tenantId:string}>;searchParams:Promise<{etapa?:string}>}) {
  const {tenantId}=await params;
  const query=await searchParams;
  const context=await requireClinic(tenantId,['patient']).catch(error=>{
    if(error instanceof AccessError&&error.status===401) redirect('/login');
    if(error instanceof AccessError||error instanceof InputError) notFound();
    throw error;
  });
  const onboarding=await getPatientOnboarding(tenantId).catch(error=>{if(error instanceof OnboardingError&&error.status===404)return null;throw error;});
  if(onboarding?.status!=='submitted') redirect(`/clinicas/${tenantId}/primeiros-passos`);
  const profileContext=await getPatientProfileContext(tenantId);
  const stages:Record<string,ProfileSection>={alimentacao:'nutrition',fotos:'photos',exames:'exams'};
  const section=stages[query.etapa??'alimentacao'];
  if(!section) notFound();
  return <PatientShell clinic={context.clinic} active="completar-perfil" title="Seu perfil de cuidado" heading="page" backHref=""><PatientProfileWorkspace key={section} tenantId={tenantId} initial={profileContext} section={section}/></PatientShell>;
}
