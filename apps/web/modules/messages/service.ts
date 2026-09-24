import { DomainError, databaseFailure as databaseFailureFor } from "@/lib/errors";
import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import type { Database } from "@/lib/supabase/database.types";
import {
  messageInput,
  messagePage,
  messageReadInput,
  messageRequestKey,
  messageRecipient,
} from "./validation";

type ConversationRow =
  Database["public"]["Tables"]["care_conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["care_messages"]["Row"];
type MessageReferenceRow = Pick<
  Database["public"]["Tables"]["care_message_references"]["Row"],
  "message_id" | "position" | "reference_type" | "reference_id"
>;

export type MessageReferenceType = "document" | "care_plan";
export type MessageReferenceOption = {
  type: MessageReferenceType;
  id: string;
  label: string;
  group: "Documentos compartilhados" | "Plano de cuidado publicado";
};
export type MessageReference =
  | { available: false; label: "Conteúdo compartilhado indisponível" }
  | {
      available: true;
      type: MessageReferenceType;
      label: string;
      href: string;
    };
export type DirectMessage = Omit<MessageRow, "reference_type" | "reference_id"> & {
  references: MessageReference[];
};

export type MessageRecipient = {
  id: string;
  displayName: string;
  lastMessageAt: string | null;
  hasUnread: boolean;
};
export type SelectedConversation = {
  patientId: string;
  doctorId: string;
  displayName: string;
};

export class ConversationError extends DomainError {}

// Typed explicitly so TypeScript keeps narrowing after a call that throws.
const databaseFailure: (code?: string) => never = databaseFailureFor({
  error: ConversationError,
  denied:
    "Seu acesso mudou ou esta conversa não está disponível. Atualize a página.",
  conflict:
    "Esta conversa mudou. Atualize a página antes de tentar novamente.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Direct message operation failed",
});

function recentByRecipient(rows: ConversationRow[]) {
  return new Map(rows.map((row) => [row.patient_id, row]));
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
  patientView: boolean,
) {
  if (!selected)
    return {
      messages: [] as DirectMessage[],
      hasNext: false,
      lastReadAt: null as string | null,
    };
  const [result, read] = await Promise.all([
    client
      .from("care_messages")
      .select(
        "id,tenant_id,conversation_id,patient_id,doctor_id,sender_id,content,sent_at,client_request_id,reference_type,reference_id",
      )
      .eq("tenant_id", tenant)
      .eq("patient_id", selected.patientId)
      .eq("doctor_id", selected.doctorId)
      .order("sent_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * 20, page * 20),
    client
      .from("care_conversation_reads")
      .select("last_read_sent_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", selected.patientId)
      .eq("doctor_id", selected.doctorId)
      .maybeSingle(),
  ]);
  if (result.error || read.error)
    databaseFailure(result.error?.code ?? read.error?.code);
  const rows = (result.data ?? []).slice(0, 20).reverse() as MessageRow[];
  const messageIds = rows.map((message) => message.id);
  const storedReferences = messageIds.length
    ? await client
        .from("care_message_references")
        .select("message_id,position,reference_type,reference_id")
        .eq("tenant_id", tenant)
        .in("message_id", messageIds)
        .order("position", { ascending: true })
    : { data: [], error: null };
  if (storedReferences.error) databaseFailure(storedReferences.error.code);
  const referencesByMessage = new Map<string, MessageReferenceRow[]>();
  for (const reference of storedReferences.data ?? []) {
    const current = referencesByMessage.get(reference.message_id) ?? [];
    current.push(reference as MessageReferenceRow);
    referencesByMessage.set(reference.message_id, current);
  }
  // The scalar columns remain as a deployment compatibility bridge for
  // messages created by an older client during rollout.
  for (const message of rows) {
    if (
      !referencesByMessage.has(message.id) &&
      message.reference_type &&
      message.reference_id
    ) {
      referencesByMessage.set(message.id, [
        {
          message_id: message.id,
          position: 0,
          reference_type: message.reference_type,
          reference_id: message.reference_id,
        },
      ]);
    }
  }
  const allReferences = [...referencesByMessage.values()].flat();
  const documentIds = allReferences.flatMap((reference) =>
    reference.reference_type === "document" ? [reference.reference_id] : [],
  );
  const publicationIds = allReferences.flatMap((reference) =>
    reference.reference_type === "care_plan" ? [reference.reference_id] : [],
  );
  const [documents, publications] = await Promise.all([
    documentIds.length
      ? client
          .from("patient_documents")
          .select("id,original_filename")
          .eq("tenant_id", tenant)
          .eq("patient_id", selected.patientId)
          .eq("status", "available")
          .eq("visibility", "shared")
          .in("id", documentIds)
      : Promise.resolve({ data: [], error: null }),
    publicationIds.length
      ? client
          .from("care_plan_publications")
          .select("id,plan_id,title")
          .eq("tenant_id", tenant)
          .eq("patient_id", selected.patientId)
          .eq("status", "published")
          .in("id", publicationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (documents.error || publications.error)
    databaseFailure(documents.error?.code ?? publications.error?.code);
  const documentById = new Map(
    (documents.data ?? []).map((document) => [document.id, document]),
  );
  const publicationById = new Map(
    (publications.data ?? []).map((publication) => [publication.id, publication]),
  );
  const messages: DirectMessage[] = rows.map((message) => {
    const visible: Omit<MessageRow, "reference_type" | "reference_id"> = {
      client_request_id: message.client_request_id,
      content: message.content,
      conversation_id: message.conversation_id,
      doctor_id: message.doctor_id,
      id: message.id,
      patient_id: message.patient_id,
      sender_id: message.sender_id,
      sent_at: message.sent_at,
      tenant_id: message.tenant_id,
    };
    return {
      ...visible,
      references: (referencesByMessage.get(message.id) ?? []).map((reference) => {
        if (reference.reference_type === "document") {
          const document = documentById.get(reference.reference_id);
          return document
            ? {
                available: true as const,
                type: "document" as const,
                label: document.original_filename,
                href: `/api/v1/clinics/${tenant}/documents/${document.id}/download`,
              }
            : { available: false as const, label: "Conteúdo compartilhado indisponível" as const };
        }
        const publication = publicationById.get(reference.reference_id);
        return publication
          ? {
              available: true as const,
              type: "care_plan" as const,
              label: publication.title,
              href: patientView
                ? `/clinicas/${tenant}/meu-cuidado/plano#plano-${publication.id}`
                : `/clinicas/${tenant}/planos/${publication.plan_id}`,
            }
          : { available: false as const, label: "Conteúdo compartilhado indisponível" as const };
      }),
    };
  });
  return {
    messages,
    hasNext: (result.data?.length ?? 0) > 20,
    lastReadAt: read.data?.last_read_sent_at ?? null,
  };
}

async function referenceOptions(
  client: Awaited<ReturnType<typeof requireClinic>>["client"],
  tenant: string,
  patientId: string | null,
): Promise<MessageReferenceOption[]> {
  if (!patientId) return [];
  const [documents, publications] = await Promise.all([
    client
      .from("patient_documents")
      .select("id,original_filename")
      .eq("tenant_id", tenant)
      .eq("patient_id", patientId)
      .eq("status", "available")
      .eq("visibility", "shared")
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("care_plan_publications")
      .select("id,title")
      .eq("tenant_id", tenant)
      .eq("patient_id", patientId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20),
  ]);
  if (documents.error || publications.error)
    databaseFailure(documents.error?.code ?? publications.error?.code);
  return [
    ...(publications.data ?? []).map((publication) => ({
      type: "care_plan" as const,
      id: publication.id,
      label: publication.title,
      group: "Plano de cuidado publicado" as const,
    })),
    ...(documents.data ?? []).map((document) => ({
      type: "document" as const,
      id: document.id,
      label: document.original_filename,
      group: "Documentos compartilhados" as const,
    })),
  ];
}

export async function staffMessages(
  id: string,
  patientInput?: string | string[],
  pageInput?: string,
) {
  const tenant = tenantId(id);
  const page = messagePage(pageInput);
  const { client, clinic, user } = await requireClinic(tenant, ["doctor"]);
  const [relationships, conversations, reads] = await Promise.all([
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
      .select("id,patient_id,doctor_id,last_message_at,last_sender_id")
      .eq("tenant_id", tenant)
      .eq("doctor_id", user.id),
    client
      .from("care_conversation_reads")
      .select("conversation_id,last_read_sent_at")
      .eq("tenant_id", tenant)
      .eq("reader_id", user.id),
  ]);
  if (relationships.error || conversations.error || reads.error)
    databaseFailure(
      relationships.error?.code ?? conversations.error?.code ?? reads.error?.code,
    );
  const latest = recentByRecipient(
    (conversations.data ?? []) as ConversationRow[],
  );
  const readByConversation = new Map(
    (reads.data ?? []).map((read) => [
      read.conversation_id,
      read.last_read_sent_at,
    ]),
  );
  const recipients = sortRecipients(
    (relationships.data ?? []).map((relationship) => ({
      id: relationship.patient_id,
      displayName: relationship.patients?.display_name ?? "Paciente",
      lastMessageAt: latest.get(relationship.patient_id)?.last_message_at ?? null,
      hasUnread: Boolean(
        latest.get(relationship.patient_id)?.last_sender_id !== user.id &&
          latest.get(relationship.patient_id)?.last_message_at &&
          latest.get(relationship.patient_id)!.last_message_at >
            (readByConversation.get(latest.get(relationship.patient_id)!.id) ?? ""),
      ),
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
  const [conversationHistory, references] = await Promise.all([
    history(client, tenant, selected, page, false),
    referenceOptions(client, tenant, selected?.patientId ?? null),
  ]);
  return {
    clinic,
    userId: user.id,
    recipients,
    selected,
    page,
    references,
    ...conversationHistory,
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
      messages: [] as DirectMessage[],
      page,
      hasNext: false,
      lastReadAt: null as string | null,
      references: [] as MessageReferenceOption[],
    };

  const [doctors, conversations, reads] = await Promise.all([
    client
      .from("memberships")
      .select("user_id,display_name")
      .eq("tenant_id", tenant)
      .eq("role", "doctor")
      .eq("status", "active")
      .order("display_name"),
    client
      .from("care_conversations")
      .select("id,patient_id,doctor_id,last_message_at,last_sender_id")
      .eq("tenant_id", tenant)
      .eq("patient_id", account.data.patient_id),
    client
      .from("care_conversation_reads")
      .select("conversation_id,last_read_sent_at")
      .eq("tenant_id", tenant)
      .eq("reader_id", user.id),
  ]);
  if (doctors.error || conversations.error || reads.error)
    databaseFailure(doctors.error?.code ?? conversations.error?.code ?? reads.error?.code);
  const latest = new Map(
    ((conversations.data ?? []) as ConversationRow[]).map((row) => [
      row.doctor_id,
      row,
    ]),
  );
  const readByConversation = new Map(
    (reads.data ?? []).map((read) => [
      read.conversation_id,
      read.last_read_sent_at,
    ]),
  );
  const recipients = sortRecipients(
    (doctors.data ?? []).map((doctor) => ({
      id: doctor.user_id,
      displayName: doctor.display_name?.trim() || "Médico vinculado",
      lastMessageAt: latest.get(doctor.user_id)?.last_message_at ?? null,
      hasUnread: Boolean(
        latest.get(doctor.user_id)?.last_sender_id !== user.id &&
          latest.get(doctor.user_id)?.last_message_at &&
          latest.get(doctor.user_id)!.last_message_at >
            (readByConversation.get(latest.get(doctor.user_id)!.id) ?? ""),
      ),
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
  const [conversationHistory, references] = await Promise.all([
    history(client, tenant, selected, page, true),
    referenceOptions(client, tenant, selected?.patientId ?? null),
  ]);
  return {
    clinic,
    userId: user.id,
    recipients,
    selected,
    page,
    references,
    ...conversationHistory,
  };
}

export async function sendDirectMessage(
  id: string,
  input: unknown,
  requestKeyInput: string | null,
) {
  const tenant = tenantId(id);
  const values = messageInput(input);
  const requestKey = messageRequestKey(requestKeyInput);
  const { client } = await requireClinic(tenant, ["doctor", "patient"]);
  const result = await client.rpc("send_direct_message_with_references", {
    target_tenant: tenant,
    target_patient: values.patientId,
    target_doctor: values.doctorId,
    message_text: values.content,
    request_key: requestKey,
    message_reference_types: values.references.map((reference) => reference.type),
    message_reference_ids: values.references.map((reference) => reference.id),
  });
  if (result.error) databaseFailure(result.error.code);
  const sent = result.data?.[0];
  if (!sent?.conversation_id || !sent.message_id || !sent.sent_at)
    throw new Error("Direct message returned an invalid response");
  return sent;
}

export async function markDirectMessagesRead(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = messageReadInput(input);
  const { client } = await requireClinic(tenant, ["doctor", "patient"]);
  const result = await client.rpc("mark_direct_messages_read", {
    target_tenant: tenant,
    target_patient: values.patientId,
    target_doctor: values.doctorId,
    target_message: values.messageId,
  });
  if (result.error) databaseFailure(result.error.code);
  return { readAt: result.data };
}

export type StaffMessages = Awaited<ReturnType<typeof staffMessages>>;
export type PatientMessages = Awaited<ReturnType<typeof patientMessages>>;
