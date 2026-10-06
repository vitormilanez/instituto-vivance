import { buildAdsReceivedRequest, type AdClick } from './attribution.ts';
import { readPulseReceivedAttribution } from './pulse-event.ts';

export type ConsentedOpportunity = {
  reference: string;
  click: AdClick;
  createdAt: string;
  expiresAt: string;
  consent: 'granted' | 'revoked';
};

/** Implementations must atomically claim the first inbound event per reference. */
export type ConversionStore = {
  claimFirstReceived(input: {
    reference: string;
    messageId: string;
    receivedAt: string;
  }): Promise<ConsentedOpportunity | null>;
  markSubmitted(reference: string, requestId: string): Promise<void>;
};

export type AdsUploader = (request: ReturnType<typeof buildAdsReceivedRequest>) => Promise<string>;

export async function processPulseReceivedEvent(
  body: unknown,
  dependencies: {
    store: ConversionStore;
    upload: AdsUploader;
    customerId: string;
    conversionActionId: string;
  }
): Promise<'ignored' | 'submitted'> {
  const received = readPulseReceivedAttribution(body);
  if (!received) return 'ignored';

  // The store is responsible for an atomic first-message claim. It must reject
  // a revoked, absent, expired or already claimed reference without exposing
  // any patient data to this process.
  const opportunity = await dependencies.store.claimFirstReceived({
    reference: received.reference,
    messageId: received.messageId,
    receivedAt: received.occurredAt
  });
  if (!opportunity || opportunity.consent !== 'granted') return 'ignored';
  const occurredAt = Date.parse(received.occurredAt);
  if (occurredAt < Date.parse(opportunity.createdAt) || occurredAt >= Date.parse(opportunity.expiresAt)) {
    return 'ignored';
  }

  const request = buildAdsReceivedRequest({
    reference: opportunity.reference,
    click: opportunity.click,
    receivedAt: received.occurredAt
  }, {
    customerId: dependencies.customerId,
    conversionActionId: dependencies.conversionActionId
  });
  const requestId = await dependencies.upload(request);
  // A Data Manager request ID confirms submission, not attributed conversion.
  await dependencies.store.markSubmitted(opportunity.reference, requestId);
  return 'submitted';
}
