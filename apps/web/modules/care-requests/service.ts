import "server-only";
import { DomainError, databaseFailure as databaseFailureFor } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { careRequestInput } from "./validation";

export class CareRequestError extends DomainError {}

// Mesmos códigos que o resto do produto já traduz: 42501 é acesso que mudou,
// 23xxx/40001 é registro que se moveu sob a pessoa. Nada de vazar detalhe de
// banco em erro genérico.
const databaseFailure: (code?: string) => never = databaseFailureFor({
  error: CareRequestError,
  denied:
    "Seu vínculo de cuidado com este paciente mudou. Atualize a página antes de solicitar.",
  conflict:
    "Já existe uma solicitação pendente deste tipo para este paciente. Atualize a página.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Care request operation failed",
});

// Pedir é ato do médico com vínculo ativo; o banco repete essa checagem na RPC,
// então aqui só se evita a chamada inútil. A chave idempotente vem do cliente e
// é o que impede que dois cliques virem duas pendências.
export async function requestPatientCare(
  id: string,
  patientInput: string,
  input: unknown,
) {
  const tenant = tenantId(id);
  const patient = tenantId(patientInput);
  const values = careRequestInput(input);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("request_patient_care", {
    target_tenant: tenant,
    target_patient: patient,
    target_kind: values.kind,
    request_note: values.note,
    request_key: values.requestKey,
    replace_pending: values.replacePending,
  });
  if (result.error) databaseFailure(result.error.code);
  if (typeof result.data !== "string")
    throw new Error("Care request returned an invalid response");
  return { id: result.data, kind: values.kind };
}

// O que foi pedido a esta pessoa. A RLS já limita a leitura ao próprio
// paciente; aqui só se escolhe o que vira tarefa no "Hoje".
export async function myPendingCareRequests(id: string) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client
    .from("patient_care_requests")
    .select("kind,requested_at")
    .eq("tenant_id", tenant)
    .eq("status", "requested")
    .order("requested_at")
    .order("id");
  if (result.error) databaseFailure(result.error.code);
  return result.data ?? [];
}

// Leitura para o card: só a pendência interessa ao médico, e o histórico
// completo já vive na auditoria da tabela.
export async function pendingCareRequests(id: string, patientInput: string) {
  const tenant = tenantId(id);
  const patient = tenantId(patientInput);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client
    .from("patient_care_requests")
    .select("kind,status,requested_at")
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .eq("status", "requested")
    .order("requested_at")
    .order("id");
  if (result.error) databaseFailure(result.error.code);
  return result.data ?? [];
}
