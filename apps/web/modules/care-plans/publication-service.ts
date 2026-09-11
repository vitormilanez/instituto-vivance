import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { CarePlanError, loadPlan } from "./service";
import { planPage } from "./validation";
import {
  publicationInput,
  withdrawalInput,
  receiptInput,
} from "./publication-validation";
function failed(code?: string): never {
  if (code === "42501")
    throw new CarePlanError(
      "Seu acesso mudou ou esta publicação não está disponível. Atualize a página.",
      403,
    );
  if (["23514", "23503", "23505"].includes(code ?? ""))
    throw new CarePlanError(
      "O plano ou a publicação mudou. Atualize a página e confira a versão antes de confirmar novamente.",
      409,
    );
  throw new Error("Plan publication operation failed");
}
export async function publishPlan(id: string, planId: string, input: unknown) {
  const v = publicationInput(input),
    { client } = await requireClinic(tenantId(id), ["doctor"]);
  const { error } = await client.rpc("publish_care_plan", {
    target_tenant: id,
    target_plan: tenantId(planId),
    read_version: v.version,
    previous_publication: v.previousPublication,
    confirmed: true,
  });
  if (error) failed(error.code);
  return loadPlan(id, planId);
}
export async function withdrawPlan(id: string, planId: string, input: unknown) {
  const v = withdrawalInput(input),
    { client } = await requireClinic(tenantId(id), ["doctor"]);
  const { error } = await client.rpc("withdraw_care_plan", {
    target_tenant: id,
    target_plan: tenantId(planId),
    target_publication: v.publicationId,
    reason: v.reason,
    confirmed: true,
  });
  if (error) failed(error.code);
  return loadPlan(id, planId);
}
export async function patientPublications(id: string, pageInput?: string) {
  const { client, clinic } = await requireClinic(tenantId(id), ["patient"]),
    page = planPage(pageInput);
  // The RLS policy resolves the patient's account, not a client-supplied patient ID.
  const { data, error } = await client
    .from("care_plan_publications")
    .select(
      "id,tenant_id,title,goals,actions,frequency,period,review_on,revision,doctor_display_name,approved_at,published_at,care_plan_receipts(acknowledged_at)",
    )
    .eq("tenant_id", id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (error) failed(error.code);
  return {
    clinic,
    publications: (data ?? []).slice(0, 20),
    page,
    hasNext: (data?.length ?? 0) > 20,
  };
}
export async function acknowledgePlan(
  id: string,
  publicationId: string,
  input: unknown,
) {
  receiptInput(input);
  const { client } = await requireClinic(tenantId(id), ["patient"]);
  const { data, error } = await client.rpc("acknowledge_care_plan", {
    target_tenant: id,
    target_publication: tenantId(publicationId),
    confirmed: true,
  });
  if (error) failed(error.code);
  const receipt = await client
    .from("care_plan_receipts")
    .select("acknowledged_at")
    .eq("tenant_id", id)
    .eq("id", data)
    .maybeSingle();
  if (receipt.error) failed(receipt.error.code);
  if (!receipt.data)
    throw new CarePlanError(
      "A publicação mudou. Atualize suas orientações.",
      409,
    );
  return receipt.data;
}
export type PatientPublications = Awaited<
  ReturnType<typeof patientPublications>
>;
