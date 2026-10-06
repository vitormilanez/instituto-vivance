import { randomBytes } from 'node:crypto';

// The reference is intentionally opaque. No campaign identifier, health choice,
// phone number or Google click ID is encoded in the WhatsApp message.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const referencePattern = /^V90-[A-HJ-NP-Z2-9]{26}$/;
const clickIdPattern = /^[A-Za-z0-9_+./=~-]{1,200}$/;

export type AdClick =
  | { kind: 'gclid'; value: string }
  | { kind: 'gbraid'; value: string }
  | { kind: 'wbraid'; value: string };

export type ReceivedOpportunity = {
  reference: string;
  click: AdClick;
  receivedAt: string;
};

export function makeReference(bytes: Uint8Array = randomBytes(26)): string {
  if (bytes.length < 26) throw new Error('Insufficient randomness for attribution reference');
  return `V90-${Array.from(bytes.slice(0, 26), byte => alphabet[byte & 31]).join('')}`;
}

export function isReference(value: unknown): value is string {
  return typeof value === 'string' && referencePattern.test(value);
}

/** Choose a single Google Ads identifier. Never fall back to a user's identity. */
export function readAdClick(input: unknown): AdClick | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const values = input as Record<string, unknown>;
  for (const kind of ['gclid', 'gbraid', 'wbraid'] as const) {
    const value = values[kind];
    if (typeof value === 'string' && clickIdPattern.test(value)) return { kind, value };
  }
  return null;
}

/** Only an ad click and a consented first inbound message can become an upload. */
export function buildAdsReceivedRequest(
  opportunity: ReceivedOpportunity,
  destination: { customerId: string; conversionActionId: string },
  validateOnly = false
) {
  if (!isReference(opportunity.reference)) throw new Error('Invalid attribution reference');
  if (!/^\d{10}$/.test(destination.customerId) || !/^\d+$/.test(destination.conversionActionId)) {
    throw new Error('Invalid Google Ads destination');
  }
  if (!clickIdPattern.test(opportunity.click.value)) throw new Error('Invalid ad click identifier');
  if (!Number.isFinite(Date.parse(opportunity.receivedAt))) throw new Error('Invalid received timestamp');
  return {
    destinations: [{
      operatingAccount: { accountType: 'GOOGLE_ADS', accountId: destination.customerId },
      loginAccount: { accountType: 'GOOGLE_ADS', accountId: destination.customerId },
      productDestinationId: destination.conversionActionId
    }],
    events: [{
      adIdentifiers: { [opportunity.click.kind]: opportunity.click.value },
      eventTimestamp: new Date(opportunity.receivedAt).toISOString(),
      transactionId: opportunity.reference,
      eventSource: 'MESSAGE',
      consent: { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_DENIED' }
    }],
    validateOnly
  };
}
