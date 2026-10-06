/**
 * Candidate WTS/Pulse adapter. The provider documents the webhook envelope and
 * MESSAGE_RECEIVED event; the exact content shape still needs a synthetic
 * sample from this Pulse account before connecting a live subscription.
 *
 * Only the allowlisted attribution fields leave this function. In particular,
 * message text, contact identity and attachments must never be logged or saved.
 */

export type ReceivedAttribution = {
  messageId: string;
  occurredAt: string;
  reference: string;
};

const referencePattern = /(?:^|[^A-Z0-9])V90-([A-HJ-NP-Z2-9]{26})(?![A-Z0-9])/i;
const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readPulseReceivedAttribution(input: unknown): ReceivedAttribution | null {
  if (!record(input) || input.eventType !== 'MESSAGE_RECEIVED' || !record(input.content)) return null;
  const content = input.content;
  // The message API calls inbound direction TO_HUB. Fail closed if the account's
  // webhook differs rather than counting a message sent by the team.
  if (content.direction !== 'TO_HUB' || content.type !== 'TEXT') return null;
  if (typeof content.id !== 'string' || !uuidPattern.test(content.id)) return null;
  if (typeof content.text !== 'string' || content.text.length > 10_000) return null;
  if (typeof input.date !== 'string' || !/Z$|[+-]\d{2}:\d{2}$/.test(input.date)) return null;
  const timestamp = Date.parse(input.date);
  if (!Number.isFinite(timestamp)) return null;
  const match = referencePattern.exec(content.text);
  if (!match) return null;
  return {
    messageId: content.id,
    occurredAt: new Date(timestamp).toISOString(),
    reference: `V90-${match[1].toUpperCase()}`
  };
}
