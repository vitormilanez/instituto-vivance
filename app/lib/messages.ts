import { getD1 } from '@/db';
import { ensureDemoAccounts, type AppUser } from './auth';

export type ConversationContext = 'care-plan' | 'check-in' | 'diary' | 'general';

export type SharedMessage = {
  id: string;
  patientId: string;
  encounterId: string;
  sender: 'doctor' | 'patient';
  context: ConversationContext;
  body: string;
  sentAtIso: string;
  deliveryState: 'delivered' | 'read';
};

type ConversationAccess = {
  conversationId: string;
  professionalUserId: string;
  patientUserId: string;
  patientProfileId: string;
};

type MessageRow = {
  id: string;
  sender: 'doctor' | 'patient';
  context: ConversationContext;
  body: string;
  sentAtIso: string;
  readAt: string | null;
};

const ALLOWED_CONTEXTS = new Set<ConversationContext>([
  'care-plan',
  'check-in',
  'diary',
  'general',
]);

async function getConversationAccess(user: AppUser, patientId: string) {
  if (user.role !== 'patient' && user.role !== 'professional') return null;
  await ensureDemoAccounts();

  if (user.role === 'patient' && user.patientId !== patientId) return null;

  return getD1()
    .prepare(
      `SELECT
        conversations.id AS conversationId,
        care_relationships.professional_user_id AS professionalUserId,
        care_relationships.patient_user_id AS patientUserId,
        care_relationships.patient_profile_id AS patientProfileId
      FROM conversations
      INNER JOIN care_relationships
        ON care_relationships.id = conversations.relationship_id
      WHERE care_relationships.patient_profile_id = ?
        AND care_relationships.status = 'active'
        AND (
          care_relationships.professional_user_id = ?
          OR care_relationships.patient_user_id = ?
        )
      LIMIT 1`,
    )
    .bind(patientId, user.id, user.id)
    .first<ConversationAccess>();
}

function toSharedMessage(row: MessageRow, patientId: string, encounterId: string): SharedMessage {
  return {
    id: row.id,
    patientId,
    encounterId,
    sender: row.sender,
    context: row.context,
    body: row.body,
    sentAtIso: row.sentAtIso,
    deliveryState: row.readAt ? 'read' : 'delivered',
  };
}

async function getMessageRow(
  conversationId: string,
  userId: string,
  clientMessageId: string,
) {
  return getD1()
    .prepare(
      `SELECT
        messages.id,
        CASE
          WHEN messages.sender_user_id = care_relationships.professional_user_id
          THEN 'doctor'
          ELSE 'patient'
        END AS sender,
        messages.context,
        messages.body,
        messages.created_at AS sentAtIso,
        message_receipts.read_at AS readAt
      FROM messages
      INNER JOIN conversations ON conversations.id = messages.conversation_id
      INNER JOIN care_relationships ON care_relationships.id = conversations.relationship_id
      LEFT JOIN message_receipts ON message_receipts.message_id = messages.id
      WHERE messages.conversation_id = ?
        AND messages.sender_user_id = ?
        AND messages.client_message_id = ?
      LIMIT 1`,
    )
    .bind(conversationId, userId, clientMessageId)
    .first<MessageRow>();
}

export async function listSharedMessages(
  user: AppUser,
  patientId: string,
  encounterId: string,
) {
  const access = await getConversationAccess(user, patientId);
  if (!access) return null;

  const database = getD1();
  const result = await database
    .prepare(
      `SELECT
        messages.id,
        CASE
          WHEN messages.sender_user_id = care_relationships.professional_user_id
          THEN 'doctor'
          ELSE 'patient'
        END AS sender,
        messages.context,
        messages.body,
        messages.created_at AS sentAtIso,
        message_receipts.read_at AS readAt
      FROM messages
      INNER JOIN conversations ON conversations.id = messages.conversation_id
      INNER JOIN care_relationships ON care_relationships.id = conversations.relationship_id
      LEFT JOIN message_receipts ON message_receipts.message_id = messages.id
      WHERE messages.conversation_id = ?
      ORDER BY messages.created_at ASC, messages.id ASC
      LIMIT 100`,
    )
    .bind(access.conversationId)
    .all<MessageRow>();

  const readAt = new Date().toISOString();
  await database
    .prepare(
      `UPDATE message_receipts
      SET read_at = COALESCE(read_at, ?)
      WHERE recipient_user_id = ?
        AND message_id IN (
          SELECT id FROM messages WHERE conversation_id = ?
        )`,
    )
    .bind(readAt, user.id, access.conversationId)
    .run();

  return result.results.map((row) =>
    toSharedMessage(
      row.sender !== (user.role === 'professional' ? 'doctor' : 'patient') && !row.readAt
        ? { ...row, readAt }
        : row,
      patientId,
      encounterId,
    ),
  );
}

export async function sendSharedMessage(
  user: AppUser,
  input: {
    patientId: string;
    encounterId: string;
    context: string;
    body: string;
    clientMessageId: string;
  },
) {
  const body = input.body.trim();
  const context = input.context as ConversationContext;
  if (
    body.length < 2 ||
    [...body].length > 600 ||
    !ALLOWED_CONTEXTS.has(context) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      input.clientMessageId,
    )
  ) {
    return { error: 'invalid' as const };
  }

  const access = await getConversationAccess(user, input.patientId);
  if (!access) return { error: 'not-found' as const };

  const existing = await getMessageRow(access.conversationId, user.id, input.clientMessageId);
  if (existing) {
    return {
      message: toSharedMessage(existing, input.patientId, input.encounterId),
    };
  }

  const recipientUserId =
    user.id === access.professionalUserId ? access.patientUserId : access.professionalUserId;
  const messageId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const database = getD1();

  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO messages (
          id, conversation_id, sender_user_id, recipient_user_id,
          client_message_id, context, body, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        messageId,
        access.conversationId,
        user.id,
        recipientUserId,
        input.clientMessageId,
        context,
        body,
        createdAt,
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO message_receipts (
          message_id, recipient_user_id, delivered_at, read_at
        ) VALUES (?, ?, ?, NULL)`,
      )
      .bind(messageId, recipientUserId, createdAt),
    database
      .prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
      .bind(createdAt, access.conversationId),
  ]);

  const created = await getMessageRow(access.conversationId, user.id, input.clientMessageId);
  if (!created) throw new Error('Shared message was not persisted.');

  return {
    message: toSharedMessage(created, input.patientId, input.encounterId),
  };
}
