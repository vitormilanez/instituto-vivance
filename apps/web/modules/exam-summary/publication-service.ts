import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { DomainError } from "@/lib/errors";

export type PublishedExamSummary = { id: string; published_at: string; factual_claims: { text: string; sourceIds: string[] }[] };
export async function patientExamSummaries(t: string,p: string): Promise<PublishedExamSummary[]> {
  const tenant = tenantId(t), patient = tenantId(p);
  const { client } = await requireClinic(tenant,["patient"]);
  const result = await client.rpc("get_published_exam_summaries",{target_tenant:tenant,target_patient:patient});
  if (result.error) throw new DomainError("Não foi possível consultar os resultados publicados.",result.error.code === "42501" ? 403 : 503);
  return result.data as unknown as PublishedExamSummary[];
}
