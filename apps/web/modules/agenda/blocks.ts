import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { agendaDate, localToInstant } from "./validation";
import { agendaBlockInput, agendaBlockPatch } from "./blocks-validation";

export type AgendaBlock = {
  id: string;
  doctor_id: string;
  doctor_display_name: string;
  starts_at: string;
  ends_at: string;
  version: number;
  status: "active" | "cancelled";
};

export class AgendaBlockError extends DomainError {}

const fields =
  "id, doctor_id, doctor_display_name, starts_at, ends_at, version, status" as const;
function databaseError(code?: string): never {
  if (code === "42501")
    throw new AgendaBlockError(
      "Você não pode alterar os bloqueios deste médico.",
      403,
    );
  if (code === "23P01")
    throw new AgendaBlockError(
      "Este horário já tem uma consulta ou outro bloqueio. Atualize a agenda e escolha outro intervalo.",
      409,
    );
  if (code === "40001")
    throw new AgendaBlockError(
      "O bloqueio foi alterado por outra ação. Atualize a agenda.",
      409,
    );
  if (code === "23514")
    throw new AgendaBlockError(
      "Não foi possível bloquear este horário. Confira o médico e o intervalo.",
      400,
    );
  throw new Error("Unable to save agenda block");
}

export async function listAgendaBlocks(
  id: string,
  from: string,
  until: string,
): Promise<AgendaBlock[]> {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["admin", "doctor", "nurse"]);
  const start = localToInstant(agendaDate(from), "00:00");
  const end = localToInstant(agendaDate(until), "00:00");
  if (end <= start || Date.parse(end) - Date.parse(start) > 93 * 86_400_000)
    throw new AgendaBlockError("Selecione um período de até 93 dias.", 400);
  const { data, error } = await client
    .from("agenda_blocks")
    .select(fields)
    .eq("tenant_id", tenant)
    .eq("status", "active")
    .lt("starts_at", end)
    .gt("ends_at", start)
    .order("starts_at")
    .order("id")
    .limit(500);
  if (error) throw new Error("Unable to load agenda blocks");
  return (data ?? []) as AgendaBlock[];
}

export async function createAgendaBlock(id: string, input: unknown) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, ["admin", "doctor", "nurse"]);
  const { data, error } = await client
    .from("agenda_blocks")
    .insert({ tenant_id: tenant, ...agendaBlockInput(input) })
    .select(fields)
    .single();
  if (error) databaseError(error.code);
  return data as AgendaBlock;
}

export async function cancelAgendaBlock(
  id: string,
  blockIdInput: string,
  input: unknown,
) {
  const tenant = tenantId(id), blockId = tenantId(blockIdInput);
  const { client } = await requireClinic(tenant, ["admin", "doctor", "nurse"]);
  const change = agendaBlockPatch(input);
  const { data, error } = await client
    .from("agenda_blocks")
    .update({ status: change.status, expected_version: change.version })
    .eq("tenant_id", tenant)
    .eq("id", blockId)
    .eq("version", change.version)
    .eq("status", "active")
    .select(fields)
    .maybeSingle();
  if (error) databaseError(error.code);
  if (!data)
    throw new AgendaBlockError(
      "O bloqueio foi alterado ou não está disponível. Atualize a agenda.",
      409,
    );
  return data as AgendaBlock;
}
