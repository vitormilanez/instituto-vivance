import { DomainError, databaseFailure } from "@/lib/errors";
import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { planCreate, planPatch, planPage } from "./validation";
export class CarePlanError extends DomainError {}
// Typed explicitly so TypeScript keeps narrowing after a call that throws.
const failed: (code?: string) => never = databaseFailure({
  error: CarePlanError,
  denied:
    "Somente o médico autor com vínculo ativo pode alterar este plano.",
  conflict:
    "O plano mudou ou a transição não é permitida. Seu texto permanece na tela; confira a versão salva antes de continuar.",
  conflictCodes: ["23514", "23503", "23505", "40001"],
  log: "Care plan operation failed",
});
const fields =
  "*,patients!care_plans_tenant_id_patient_id_fkey(display_name)" as const;
export async function listPlans(id: string, pageInput?: string) {
  const clinicId = tenantId(id),
    page = planPage(pageInput);
  const { client, clinic } = await requireClinic(clinicId, ["doctor", "nurse"]);
  const { data, error } = await client
    .from("care_plans")
    .select(
      "id,title,status,revision,updated_at,patients!care_plans_tenant_id_patient_id_fkey(display_name)",
    )
    .eq("tenant_id", clinicId)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (error) failed(error.code);
  return {
    clinic,
    plans: (data ?? []).slice(0, 20),
    page,
    hasNext: (data?.length ?? 0) > 20,
  };
}
export async function loadPlan(id: string, planId: string, pageInput?: string, publicationPageInput?:string) {
  const clinicId = tenantId(id),
    recordId = tenantId(planId),
    page = planPage(pageInput), publicationPage=planPage(publicationPageInput);
  const { client, clinic, user } = await requireClinic(clinicId, [
    "doctor",
    "nurse",
  ]);
  const { data, error } = await client
    .from("care_plans")
    .select(fields)
    .eq("tenant_id", clinicId)
    .eq("id", recordId)
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new CarePlanError("Plano não disponível para sua conta.", 404);
  const history = await client
    .from("care_plan_versions")
    .select("*")
    .eq("tenant_id", clinicId)
    .eq("plan_id", recordId)
    .order("version", { ascending: false })
    .range((page - 1) * 10, page * 10);
  if (history.error) failed(history.error.code);
  const [publicationHistory,currentPublication]=await Promise.all([
    client.from("care_plan_publications").select("*,care_plan_receipts(acknowledged_at)")
      .eq("tenant_id",clinicId).eq("plan_id",recordId).order("published_at",{ascending:false}).order("id")
      .range((publicationPage-1)*20,publicationPage*20),
    client.from("care_plan_publications").select("*,care_plan_receipts(acknowledged_at)")
      .eq("tenant_id",clinicId).eq("plan_id",recordId).eq("status","published").maybeSingle()
  ]);
  if(publicationHistory.error)failed(publicationHistory.error.code);
  if(currentPublication.error)failed(currentPublication.error.code);
  return {
    clinic,
    plan: data,
    versions: (history.data ?? []).slice(0, 10),
    page,
    hasNext: (history.data?.length ?? 0) > 10,
    canEdit: clinic.role === "doctor" && data.doctor_id === user.id,
    publications:(publicationHistory.data??[]).slice(0,20),
    currentPublication:currentPublication.data,
    publicationPage,hasMorePublications:(publicationHistory.data?.length??0)>20,
  };
}
export async function newPlanContext(id: string, input: unknown) {
  const clinicId = tenantId(id),
    value = planCreate(input);
  const { client, clinic, user } = await requireClinic(clinicId, ["doctor"]);
  const { data, error } = await client
    .from("care_relationships")
    .select(
      "patient_id,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
    )
    .eq("tenant_id", clinicId)
    .eq("patient_id", value.patient_id)
    .eq("professional_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new CarePlanError(
      "É necessário um vínculo de cuidado ativo com este paciente.",
      403,
    );
  if (value.encounter_id) {
    const source = await client
      .from("encounters")
      .select("id")
      .eq("tenant_id", clinicId)
      .eq("id", value.encounter_id)
      .eq("patient_id", value.patient_id)
      .maybeSingle();
    if (source.error) failed(source.error.code);
    if (!source.data)
      throw new CarePlanError("Atendimento de origem indisponível.", 404);
  }
  return {
    clinic,
    patientName: data.patients?.display_name ?? "Paciente",
    ...value,
  };
}
export async function createPlan(id: string, input: unknown) {
  const context = await newPlanContext(id, input);
  const { client } = await requireClinic(tenantId(id), ["doctor"]);
  const { data, error } = await client
    .from("care_plans")
    .insert({
      tenant_id: id,
      patient_id: context.patient_id,
      encounter_id: context.encounter_id,
    })
    .select("id")
    .single();
  if (error) failed(error.code);
  return { id: data.id };
}
export async function savePlan(id: string, planId: string, input: unknown) {
  const { client } = await requireClinic(tenantId(id), ["doctor"]);
  const value = planPatch(input);
  const { data, error } = await client
    .from("care_plans")
    .update({ ...value.values, expected_version: value.version })
    .eq("tenant_id", id)
    .eq("id", tenantId(planId))
    .select("id")
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new CarePlanError(
      "Plano indisponível ou acesso revogado. Seu texto permanece na tela.",
      409,
    );
  return loadPlan(id, planId);
}
export type PlanDetail = Awaited<ReturnType<typeof loadPlan>>;
