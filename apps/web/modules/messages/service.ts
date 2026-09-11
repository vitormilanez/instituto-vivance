import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import type { Database } from "@/lib/supabase/database.types";
import { messageInput, messagePage, messageRecipient } from "./validation";

type ConversationRow =
  Database["public"]["Tables"]["care_conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["care_messages"]["Row"];

export type MessageRecipient = {
  id: string;
  displayName: string;
  lastMessageAt: string | null;
};
export type SelectedConversation = {
  patientId: string;
  doctorId: string;
  displayName: string;
};

export class ConversationError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function databaseFailure(code?: string): never {
  if (code === "42501")
    throw new ConversationError(
      "Seu acesso mudou ou esta conversa não está disponível. Atualize a página.",
      403,
    );
  if (["23503", "23505", "23514"].includes(code ?? ""))
    throw new ConversationError(
      "Esta conversa mudou. Atualize a página antes de tentar novamente.",
      409,
    );
  throw new Error("Direct message operation failed");
}

function recentByRecipient(rows: ConversationRow[]) {
  return new Map(rows.map((row) => [row.patient_id, row.last_message_at]));
}

function sortRecipients(recipients: MessageRecipient[]) {
  return recipients.sort((left, right) => {
    const time = (right.lastMessageAt ?? "").localeCompare(
      left.lastMessageAt ?? "",
    );
    return time || left.displayName.localeCompare(right.displayName, "pt-BR");
  });
}

async function history(
  client: Awaited<ReturnType<typeof requireClinic>>["client"],
  tenant: string,
  selected: SelectedConversation | null,
  page: number,
) {
  if (!selected) return { messages: [] as MessageRow[], hasNext: false };
  const result = await client
    .from("care_messages")
    .select("*")
    .eq("tenant_id", tenant)
    .eq("patient_id", selected.patientId)
    .eq("doctor_id", selected.doctorId)
    .order("sent_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20);
  if (result.error) databaseFailure(result.error.code);
  return {
    messages: (result.data ?? []).slice(0, 20).reverse(),
    hasNext: (result.data?.length ?? 0) > 20,
  };
}

export async function staffMessages(
  id: string,
  patientInput?: string | string[],
  pageInput?: string,
) {
  const tenant = tenantId(id);
  const page = messagePage(pageInput);
  const { client, clinic, user } = await requireClinic(tenant, ["doctor"]);
  const [relationships, conversations] = await Promise.all([
    client
      .from("care_relationships")
      .select(
        "patient_id,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", tenant)
      .eq("professional_id", user.id)
      .eq("status", "active")
      .order("patient_id"),
    client
      .from("care_conversations")
      .select("patient_id,last_message_at")
      .eq("tenant_id", tenant)
      .eq("doctor_id", user.id),
  ]);
  if (relationships.error || conversations.error)
    databaseFailure(relationships.error?.code ?? conversations.error?.code);
  const latest = recentByRecipient(
    (conversations.data ?? []) as ConversationRow[],
  );
  const recipients = sortRecipients(
    (relationships.data ?? []).map((relationship) => ({
      id: relationship.patient_id,
      displayName: relationship.patients?.display_name ?? "Paciente",
      lastMessageAt: latest.get(relationship.patient_id) ?? null,
    })),
  );
  const recipient = messageRecipient(
    patientInput,
    recipients.map((item) => item.id),
  );
  const selected = recipient
    ? {
        patientId: recipient,
        doctorId: user.id,
        displayName:
          recipients.find((item) => item.id === recipient)?.displayName ??
          "Paciente",
      }
    : null;
  return {
    clinic,
    userId: user.id,
    recipients,
    selected,
    page,
    ...(await history(client, tenant, selected, page)),
  };
}

export async function patientMessages(
  id: string,
  doctorInput?: string | string[],
  pageInput?: string,
) {
  const tenant = tenantId(id);
  const page = messagePage(pageInput);
  const { client, clinic, user } = await requireClinic(tenant, ["patient"]);
  const account = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (account.error) databaseFailure(account.error.code);
  if (!account.data)
    return {
      clinic,
      userId: user.id,
      recipients: [] as MessageRecipient[],
      selected: null as SelectedConversation | null,
      messages: [] as MessageRow[],
      page,
      hasNext: false,
    };

  const [doctors, conversations] = await Promise.all([
    client
      .from("memberships")
      .select("user_id,display_name")
      .eq("tenant_id", tenant)
      .eq("role", "doctor")
      .eq("status", "active")
      .order("display_name"),
    client
      .from("care_conversations")
      .select("doctor_id,last_message_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", account.data.patient_id),
  ]);
  if (doctors.error || conversations.error)
    databaseFailure(doctors.error?.code ?? conversations.error?.code);
  const latest = new Map(
    (conversations.data ?? []).map((row) => [
      row.doctor_id,
      row.last_message_at,
    ]),
  );
  const recipients = sortRecipients(
    (doctors.data ?? []).map((doctor) => ({
      id: doctor.user_id,
      displayName: doctor.display_name?.trim() || "Médico vinculado",
      lastMessageAt: latest.get(doctor.user_id) ?? null,
    })),
  );
  const recipient = messageRecipient(
    doctorInput,
    recipients.map((item) => item.id),
  );
  const selected = recipient
    ? {
        patientId: account.data.patient_id,
        doctorId: recipient,
        displayName:
          recipients.find((item) => item.id === recipient)?.displayName ??
          "Médico vinculado",
      }
    : null;
  return {
    clinic,
    userId: user.id,
    recipients,
    selected,
    page,
    ...(await history(client, tenant, selected, page)),
  };
}

export async function sendDirectMessage(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = messageInput(input);
  const { client } = await requireClinic(tenant, ["doctor", "patient"]);
  const result = await client.rpc("send_direct_message", {
    target_tenant: tenant,
    target_patient: values.patientId,
    target_doctor: values.doctorId,
    message_text: values.content,
  });
  if (result.error) databaseFailure(result.error.code);
  const sent = result.data?.[0];
  if (!sent?.conversation_id || !sent.message_id || !sent.sent_at)
    throw new Error("Direct message returned an invalid response");
  return sent;
}

export type StaffMessages = Awaited<ReturnType<typeof staffMessages>>;
export type PatientMessages = Awaited<ReturnType<typeof patientMessages>>;
