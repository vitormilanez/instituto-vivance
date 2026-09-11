import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import {
  encounterAddendum,
  encounterCursor,
  encounterDetailCursor,
  encounterDetailPageSize,
  encounterPageSize,
  encounterPatch,
  encounterSearch,
  encounterStart,
} from "./validation";
export class EncounterError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const fields =
  "id,tenant_id,appointment_id,patient_id,doctor_id,doctor_display_name,status,reason,evolution,version,created_at,updated_at,finalized_at,patients!encounters_tenant_id_patient_id_fkey(display_name)" as const;
function failed(code?: string): never {
  if (code === "42501")
    throw new EncounterError(
      "Você precisa ser o médico responsável e ter um vínculo de cuidado ativo.",
      403,
    );
  if (["23514", "23503", "23505", "40001"].includes(code ?? ""))
    throw new EncounterError(
      "O atendimento não pode ser alterado. Atualize a página e confira a situação da consulta.",
      409,
    );
  throw new Error("Encounter operation failed");
}
export async function listEncounters(id: string, input: unknown = {}) {
  const clinicId = tenantId(id);
  const page = encounterSearch(input, clinicId);
  const { client, clinic, user } = await requireClinic(clinicId, [
    "doctor",
    "nurse",
  ]);
  const { data, error } = await client.rpc("list_encounters_page", {
    target_tenant: clinicId,
    search_text: page.query,
    before_created_at: page.beforeCreatedAt,
    before_id: page.beforeId,
    page_limit: encounterPageSize + 1,
  });
  if (error) failed(error.code);
  const encounters = (data ?? []).slice(0, encounterPageSize);
  const last = encounters.at(-1);
  return {
    clinic,
    userId: user.id,
    query: page.query,
    encounters,
    nextCursor:
      (data?.length ?? 0) > encounterPageSize && last
        ? encounterCursor(clinicId, last.created_at, last.id, page.query)
        : null,
  };
}
export async function loadEncounter(
  id: string,
  encounterId: string,
  cursors: { beforeVersion?: unknown; beforeAddendum?: unknown } = {},
) {
  const clinicId = tenantId(id);
  const beforeVersion = encounterDetailCursor(cursors.beforeVersion);
  const beforeAddendum = encounterDetailCursor(cursors.beforeAddendum);
  const { client, clinic, user } = await requireClinic(clinicId, [
    "doctor",
    "nurse",
  ]);
  const { data, error } = await client
    .from("encounters")
    .select(fields)
    .eq("tenant_id", clinicId)
    .eq("id", tenantId(encounterId))
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new EncounterError("Atendimento não disponível para sua conta.", 404);
  let historyQuery = client
      .from("encounter_versions")
      .select("id,version,status,reason,evolution,actor_user_id,created_at")
      .eq("tenant_id", clinicId)
      .eq("encounter_id", encounterId)
      .order("version", { ascending: false })
      .limit(encounterDetailPageSize + 1);
  if (beforeVersion !== undefined)
    historyQuery = historyQuery.lt("version", beforeVersion);
  let addendumQuery = client
      .from("encounter_addenda")
      .select(
        "id,encounter_version,addendum_number,reason,content,actor_user_id,created_at",
      )
      .eq("tenant_id", clinicId)
      .eq("encounter_id", encounterId)
      .order("addendum_number", { ascending: false })
      .limit(encounterDetailPageSize + 1);
  if (beforeAddendum !== undefined)
    addendumQuery = addendumQuery.lt("addendum_number", beforeAddendum);
  const [history, addendumHistory] = await Promise.all([
    historyQuery,
    addendumQuery,
  ]);
  if (history.error) failed(history.error.code);
  if (addendumHistory.error) failed(addendumHistory.error.code);
  const versions = (history.data ?? []).slice(0, encounterDetailPageSize);
  const addenda = (addendumHistory.data ?? []).slice(
    0,
    encounterDetailPageSize,
  );
  return {
    clinic,
    encounter: data,
    versions,
    versionCursor: beforeVersion ?? null,
    nextVersionCursor:
      (history.data?.length ?? 0) > encounterDetailPageSize
        ? versions.at(-1)?.version ?? null
        : null,
    addenda,
    addendumCursor: beforeAddendum ?? null,
    nextAddendumCursor:
      (addendumHistory.data?.length ?? 0) > encounterDetailPageSize
        ? addenda.at(-1)?.addendum_number ?? null
        : null,
    canEdit:
      clinic.role === "doctor" &&
      data.doctor_id === user.id &&
      data.status === "draft",
    canAddendum:
      clinic.role === "doctor" &&
      data.doctor_id === user.id &&
      data.status === "finalized",
  };
}
export async function startEncounter(id: string, input: unknown) {
  const { client } = await requireClinic(tenantId(id), ["doctor"]);
  const value = encounterStart(input);
  const { data, error } = await client.rpc("start_encounter", {
    target_tenant: id,
    target_appointment: value.appointment_id,
    accept_care: true,
    read_version: value.appointment_version,
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
    .update({ ...values, expected_version: version })
    .eq("tenant_id", id)
    .eq("id", tenantId(encounterId))
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

export async function createEncounterAddendum(
  id: string,
  encounterId: string,
  input: unknown,
) {
  const { client } = await requireClinic(tenantId(id), ["doctor"]);
  const value = encounterAddendum(input);
  const { data, error } = await client
    .from("encounter_addenda")
    .insert({
      tenant_id: id,
      encounter_id: tenantId(encounterId),
      encounter_version: value.encounter_version,
      reason: value.reason,
      content: value.content,
    })
    .select("id")
    .maybeSingle();
  if (error) failed(error.code);
  if (!data)
    throw new EncounterError(
      "O adendo não foi registrado. Atualize a página e confira o atendimento.",
      409,
    );
  return loadEncounter(id, encounterId);
}
export type EncounterDetail = Awaited<ReturnType<typeof loadEncounter>>;
export type EncounterList = Awaited<ReturnType<typeof listEncounters>>;
