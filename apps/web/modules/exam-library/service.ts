import "server-only";
import { DomainError } from "@/lib/errors";
import { InputError, tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { clinicalSourceInput } from "./validation";
import type { Json } from "@/lib/supabase/database.types";

export class ExamLibraryError extends DomainError {}
function failure(code?: string): never {
  if (code === "42501") throw new ExamLibraryError("Seu acesso à biblioteca mudou. Entre novamente.", 403);
  if (["22023","22P02","23514"].includes(code ?? "")) throw new ExamLibraryError("Confira os dados e a aplicabilidade da fonte.", 400);
  if (code === "40001") throw new ExamLibraryError("Esta versão mudou ou expirou. Cadastre uma nova versão.", 409);
  throw new ExamLibraryError("Não foi possível atualizar as fontes. Tente novamente.", 503);
}
export async function examClinicalLibrary(id: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant,["doctor"]);
  const result = await client.rpc("get_exam_clinical_library",{ target_tenant: tenant });
  if (result.error) failure(result.error.code);
  return result.data;
}
export async function createClinicalSource(id: string, input: unknown) {
  const tenant = tenantId(id);
  const body = input as Record<string,unknown>;
  if (!body || typeof body !== "object") throw new InputError("Informe a fonte.");
  const requestId = tenantId(typeof body.requestId === "string" ? body.requestId : "");
  const values = clinicalSourceInput(body.source);
  const { client } = await requireClinic(tenant,["doctor"]);
  const result = await client.rpc("create_exam_clinical_source",{ target_tenant: tenant, target_request: requestId, source_data: values as unknown as Json });
  if (result.error) failure(result.error.code);
  return { id: result.data };
}
export async function reviewClinicalSource(id: string, input: unknown) {
  const tenant = tenantId(id), body = input as Record<string,unknown>;
  if (!body || typeof body !== "object" || !["current","superseded"].includes(String(body.status))
    || typeof body.note !== "string" || body.note.trim().length < 10 || body.note.length > 1000) throw new InputError("Registre o motivo da aprovação ou retirada.");
  const source = tenantId(typeof body.sourceId === "string" ? body.sourceId : "");
  const { client } = await requireClinic(tenant,["doctor"]);
  const result = await client.rpc("review_exam_clinical_source",{ target_tenant: tenant, target_source: source, target_status: String(body.status), review_note: body.note.trim() });
  if (result.error) failure(result.error.code);
  return { changed: result.data };
}
