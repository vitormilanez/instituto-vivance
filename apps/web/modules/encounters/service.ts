import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { encounterPatch, encounterStart } from "./validation";
export class EncounterError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const fields =
  "id,tenant_id,appointment_id,patient_id,doctor_id,status,reason,evolution,version,created_at,updated_at,finalized_at,patients!encounters_tenant_id_patient_id_fkey(display_name),memberships!encounters_tenant_id_doctor_id_fkey(display_name)" as const;
const summaryFields =
  "id,patient_id,doctor_id,status,created_at,updated_at,patients!encounters_tenant_id_patient_id_fkey(display_name)" as const;
function failed(code?: string): never {
  if (code === "42501")
    throw new EncounterError(
      "Você precisa ser o médico responsável e ter um vínculo de cuidado ativo.",
      403,
    );
  if (["23514", "23503", "23505"].includes(code ?? ""))
    throw new EncounterError(
      "O atendimento não pode ser alterado. Atualize a página e confira a situação da consulta.",
      409,
    );
  throw new Error("Encounter operation failed");
}
export async function listEncounters(id: string) {
  const { client, clinic, user } = await requireClinic(tenantId(id), [
    "doctor",
    "nurse",
  ]);
  const { data, error } = await client
    .from("encounters")
    .select(summaryFields)
    .eq("tenant_id", id)
    .order("updated_at", { ascending: false })
    .order("id")
    .limit(101);
  if (error) failed(error.code);
  return {
    clinic,
    userId: user.id,
    encounters: (data ?? []).slice(0, 100),
    truncated: (data?.length ?? 0) > 100,
  };
}
export async function loadEncounter(id: string, encounterId: string) {
  const { client, clinic, user } = await requireClinic(tenantId(id), [
    "doctor",
    "nurse",
  ]);
  const { data, error } = await client
    .from("encounters")
    .select(fields)
    .eq("tenant_id", id)
    .eq("id", tenantId(encounterId))
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new EncounterError("Atendimento não disponível para sua conta.", 404);
  const { data: versions, error: historyError } = await client
    .from("encounter_versions")
    .select("id,version,status,reason,evolution,actor_user_id,created_at")
    .eq("tenant_id", id)
    .eq("encounter_id", encounterId)
    .order("version", { ascending: false })
    .limit(101);
  if (historyError) failed(historyError.code);
  return {
    clinic,
    encounter: data,
    versions: (versions ?? []).slice(0, 100),
    historyTruncated: (versions?.length ?? 0) > 100,
    canEdit:
      clinic.role === "doctor" &&
      data.doctor_id === user.id &&
      data.status === "draft",
  };
}
export async function startEncounter(id: string, input: unknown) {
  const { client } = await requireClinic(tenantId(id), ["doctor"]);
  const value = encounterStart(input);
  const { data, error } = await client.rpc("start_encounter", {
    target_tenant: id,
    target_appointment: value.appointment_id,
    accept_care: true,
  });
  if (error) failed(error.code);
  return data;
}
export async function saveEncounter(
  id: string,
  encounterId: string,
  input: unknown,
) {
  const { client } = await requireClinic(tenantId(id), ["doctor"]);
  const { version, values } = encounterPatch(input);
  const { data, error } = await client
    .from("encounters")
    .update(values)
    .eq("tenant_id", id)
    .eq("id", tenantId(encounterId))
    .eq("version", version)
    .eq("status", "draft")
    .select("id,version")
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new EncounterError(
      "O registro mudou, foi finalizado ou seu acesso foi revogado. Seu texto continua na tela; confira a versão atual antes de tentar novamente.",
      409,
    );
  return loadEncounter(id, encounterId);
}
export type EncounterDetail = Awaited<ReturnType<typeof loadEncounter>>;
