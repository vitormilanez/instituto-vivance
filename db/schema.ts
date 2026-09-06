import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role', { enum: ['professional', 'patient'] }).notNull(),
    patientId: text('patient_id'),
    passwordHash: text('password_hash').notNull(),
    passwordSalt: text('password_salt').notNull(),
    passwordIterations: integer('password_iterations').notNull(),
    status: text('status', { enum: ['active', 'blocked'] }).notNull().default('active'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('users_username_unique').on(table.username),
    check('users_role_check', sql`${table.role} in ('professional', 'patient')`),
    check('users_status_check', sql`${table.status} in ('active', 'blocked')`),
    check(
      'users_patient_scope_check',
      sql`(${table.role} = 'patient' and ${table.patientId} is not null) or (${table.role} = 'professional' and ${table.patientId} is null)`,
    ),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('idx_sessions_user_id').on(table.userId),
  ],
);

export const careRelationships = sqliteTable(
  'care_relationships',
  {
    id: text('id').primaryKey(),
    professionalUserId: text('professional_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    patientUserId: text('patient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    patientProfileId: text('patient_profile_id').notNull(),
    status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('care_relationships_professional_patient_unique').on(
      table.professionalUserId,
      table.patientUserId,
    ),
    uniqueIndex('care_relationships_patient_profile_unique').on(table.patientProfileId),
    index('idx_care_relationships_professional').on(table.professionalUserId, table.status),
    index('idx_care_relationships_patient').on(table.patientUserId, table.status),
    check('care_relationships_status_check', sql`${table.status} in ('active', 'inactive')`),
    check(
      'care_relationships_distinct_users_check',
      sql`${table.professionalUserId} <> ${table.patientUserId}`,
    ),
  ],
);

export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    relationshipId: text('relationship_id')
      .notNull()
      .references(() => careRelationships.id, { onDelete: 'restrict' }),
    createdAt: text('created_at').notNull(),
    lastMessageAt: text('last_message_at'),
  },
  (table) => [uniqueIndex('conversations_relationship_unique').on(table.relationshipId)],
);

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'restrict' }),
    senderUserId: text('sender_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    clientMessageId: text('client_message_id').notNull(),
    context: text('context', { enum: ['care-plan', 'check-in', 'diary', 'general'] }).notNull(),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('messages_sender_client_message_unique').on(
      table.senderUserId,
      table.clientMessageId,
    ),
    index('idx_messages_conversation_history').on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    check(
      'messages_context_check',
      sql`${table.context} in ('care-plan', 'check-in', 'diary', 'general')`,
    ),
    check('messages_distinct_users_check', sql`${table.senderUserId} <> ${table.recipientUserId}`),
  ],
);

export const messageReceipts = sqliteTable(
  'message_receipts',
  {
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    deliveredAt: text('delivered_at').notNull(),
    readAt: text('read_at'),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.recipientUserId] }),
    index('idx_message_receipts_unread').on(
      table.recipientUserId,
      table.readAt,
      table.deliveredAt,
    ),
  ],
);

export const clinicalSynthesisVersions = sqliteTable('clinical_synthesis_versions', {
  id: text('id').primaryKey(),
  relationshipId: text('relationship_id').notNull().references(() => careRelationships.id, { onDelete: 'restrict' }),
  patientId: text('patient_id').notNull(),
  encounterId: text('encounter_id').notNull(),
  version: integer('version').notNull(),
  requestId: text('request_id').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  artifact: text('artifact').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('synthesis_scope_version_unique').on(table.relationshipId, table.encounterId, table.version),
  uniqueIndex('synthesis_request_unique').on(table.createdBy, table.requestId),
  check('synthesis_positive_version', sql`${table.version} > 0`),
]);

export const careCycles = sqliteTable('care_cycles', {
  id: text('id').primaryKey(),
  relationshipId: text('relationship_id').notNull().references(() => careRelationships.id, { onDelete: 'restrict' }),
  encounterId: text('encounter_id').notNull(),
  revision: integer('revision').notNull().default(0),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('care_cycle_scope_unique').on(table.relationshipId, table.encounterId)]);

export const careCycleMutations = sqliteTable('care_cycle_mutations', {
  id: text('id').primaryKey(),
  cycleId: text('cycle_id').notNull().references(() => careCycles.id, { onDelete: 'restrict' }),
  actorId: text('actor_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  requestId: text('request_id').notNull(),
  command: text('command').notNull(),
  inputHash: text('input_hash').notNull(),
  result: text('result').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('care_cycle_request_unique').on(table.actorId, table.requestId)]);

export const careFiles = sqliteTable('care_files', {
  id: text('id').primaryKey(),
  relationshipId: text('relationship_id').notNull().references(() => careRelationships.id, { onDelete: 'restrict' }),
  encounterId: text('encounter_id').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  name: text('name').notNull(), mediaType: text('media_type').notNull(),
  size: integer('size').notNull(), objectKey: text('object_key').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('care_files_scope').on(table.relationshipId, table.encounterId)]);

// Clinic policy is shared; patient context and authorization remain relationship-scoped.
export const clinicalPolicyMembers = sqliteTable('clinical_policy_members', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'restrict' }),
  clinicId: text('clinic_id').notNull(),
});

export const clinicalPolicyWorkspaces = sqliteTable('clinical_policy_workspaces', {
  clinicId: text('clinic_id').primaryKey(),
  revision: integer('revision').notNull(),
  activeVersion: integer('active_version').notNull(),
  data: text('data').notNull(),
});

export const clinicalPolicyVersions = sqliteTable('clinical_policy_versions', {
  clinicId: text('clinic_id').notNull().references(() => clinicalPolicyWorkspaces.clinicId, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  snapshot: text('snapshot').notNull(),
}, (table) => [primaryKey({ columns: [table.clinicId, table.version] })]);

export const clinicalPatientPermissions = sqliteTable('clinical_patient_permissions', {
  relationshipId: text('relationship_id').primaryKey().references(() => careRelationships.id, { onDelete: 'restrict' }),
  authorized: integer('authorized', { mode: 'boolean' }).notNull().default(false),
  paused: integer('paused', { mode: 'boolean' }).notNull().default(false),
  revision: integer('revision').notNull().default(0),
  updatedBy: text('updated_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  updatedAt: text('updated_at').notNull(),
  basis: text('basis').notNull(),
});
