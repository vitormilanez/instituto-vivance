import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import type { SummaryManifest, VerifiedClaim, VerifiedPossibility } from "./analysis";
export type ExamSummaryView = {
  manifest: SummaryManifest; stale: boolean; clinicalLibraryAvailable: boolean;published:boolean;leaseExpired:boolean;rejected:boolean;
  summary: null | { id: string; status: "processing" | "failed" | "draft" | "approved"; claims: VerifiedClaim[]; comparisons: VerifiedClaim[];possibilities:VerifiedPossibility[]; created_at: string; lease_expires_at: string | null; source_manifest: SummaryManifest };
};
export class ExamSummaryError extends DomainError {}
type Rpc = { rpc(name: "get_exam_summary" | "review_exam_summary", args: Record<string, unknown>): PromiseLike<{ data: unknown; error: null | { code?: string } }> };
async function authorized(tenantInput: string, patientInput: string) {
  const tenant = tenantId(tenantInput), patient = tenantId(patientInput);
  const { client } = await requireClinic(tenant, ["doctor"]);
  return { tenant, patient, client, rpc: client as unknown as Rpc };
}
function check(error: { code?: string } | null) {
  if (error) throw new ExamSummaryError(error.code === "40001" ? "As fontes ou o resumo mudaram. Atualize a tela e gere uma nova versão." : "Não foi possível acessar o resumo com seu vínculo atual.", error.code === "42501" ? 403 : error.code === "40001" ? 409 : 503);
}
export async function getExamSummary(t: string, p: string) {
  const { tenant, patient, rpc } = await authorized(t,p);
  const result = await rpc.rpc("get_exam_summary", { target_tenant: tenant, target_patient: patient });
  check(result.error);
  return result.data as ExamSummaryView;
}
export async function generateExamSummary(t: string, p: string) {
  const { tenant, patient, client } = await authorized(t,p);
  const result = await client.functions.invoke("exam-summary-worker", { body: { tenantId: tenant, patientId: patient } });
  if (result.error) throw new ExamSummaryError("Não foi possível gerar o resumo. Confira se há resultados revisados e tente novamente.", 503);
  return result.data as { summaryId: string; cached: boolean; status: string };
}
export async function reviewExamSummary(t: string, p: string, input: unknown) {
  if (!input || typeof input !== "object") throw new ExamSummaryError("Dados inválidos.",400);
  const { summaryId, action, note } = input as Record<string, unknown>;
  if (typeof summaryId !== "string" || !["approve","reject","publish"].includes(String(action)) || (note !== undefined && (typeof note !== "string" || note.length > 2000))) throw new ExamSummaryError("Revisão inválida.",400);
  const { tenant, patient, rpc } = await authorized(t,p);
  const result = await rpc.rpc("review_exam_summary", { target_tenant: tenant, target_patient: patient, target_summary: tenantId(summaryId), action, review_note: note ?? null });
  check(result.error); return { saved: true };
}
