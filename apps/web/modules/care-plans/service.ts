import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { planCreate, planPatch, planPage } from "./validation";
export class CarePlanError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
function failed(code?: string): never {
  if (code === "42501")
    throw new CarePlanError(
      "Somente o médico autor com vínculo ativo pode alterar este plano.",
      403,
    );
  if (["23514", "23503", "23505", "40001"].includes(code ?? ""))
    throw new CarePlanError(
      "O plano mudou ou a transição não é permitida. Seu texto permanece na tela; confira a versão salva antes de continuar.",
      409,
    );
  throw new Error("Care plan operation failed");
}
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
export async function loadPlan(id: string, planId: string, pageInput?: string) {
  const clinicId = tenantId(id),
    recordId = tenantId(planId),
    page = planPage(pageInput);
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
  return {
    clinic,
    plan: data,
    versions: (history.data ?? []).slice(0, 10),
    page,
    hasNext: (history.data?.length ?? 0) > 10,
    canEdit: clinic.role === "doctor" && data.doctor_id === user.id,
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
