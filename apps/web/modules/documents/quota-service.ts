import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId, InputError } from "@/lib/validation";
import { DocumentError } from "./service";

export type ExamUploadQuotaState = {
  cycle_id: string; version: number; received: number; reserved: number;
  remaining: number; request_pending: boolean; eligible: boolean;
};

export async function examUploadQuota(tenant: string, patient: string) {
  const t = tenantId(tenant), p = tenantId(patient);
  const { client } = await requireClinic(t, ["doctor", "nurse", "patient"]);
  const result = await client.rpc("get_exam_upload_quota", { target_tenant: t, target_patient: p });
  if (result.error) throw new DocumentError("Seu acesso mudou. Atualize a página para conferir os envios.", result.error.code === "42501" ? 403 : 503);
  return result.data as unknown as ExamUploadQuotaState;
}

export async function changeExamUploadQuota(tenant: string, patient: string, input: unknown) {
  const t = tenantId(tenant), p = tenantId(patient);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("Ação inválida.");
  const body = input as Record<string, unknown>;
  if (body.action === "request") {
    if (Object.keys(body).some(key => key !== "action")) throw new InputError("Ação inválida.");
    const { client } = await requireClinic(t, ["patient"]);
    const result = await client.rpc("request_exam_upload_capacity", { target_tenant: t, target_patient: p });
    if (result.error) throw new DocumentError("Não foi possível solicitar mais envios.", result.error.code === "42501" ? 403 : 409);
    return { id: result.data };
  }
  if (body.action !== "grant" || body.confirmed !== true || typeof body.reason !== "string" || body.reason.trim().length < 3 || body.reason.length > 1000 || typeof body.cycle_id !== "string" || typeof body.idempotency_key !== "string" || Object.keys(body).some(key => !["action","confirmed","reason","cycle_id","idempotency_key"].includes(key))) throw new InputError("Confirme a liberação e informe o motivo.");
  const { client } = await requireClinic(t, ["doctor"]);
  const result = await client.rpc("grant_exam_upload_cycle", { target_tenant: t, target_patient: p, expected_cycle: tenantId(body.cycle_id), input_reason: body.reason.trim(), input_idempotency_key: tenantId(body.idempotency_key) });
  if (result.error) throw new DocumentError("Este ciclo mudou ou seu vínculo não está ativo. Atualize a página.", result.error.code === "42501" ? 403 : 409);
  return { id: result.data };
}
