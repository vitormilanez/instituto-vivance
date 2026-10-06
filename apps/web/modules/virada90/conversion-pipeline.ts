import { buildAdsReceivedRequest, type AdClick } from './attribution.ts';
import { readPulseReceivedAttribution } from './pulse-event.ts';

export type ConsentedOpportunity = {
  reference: string;
  click: AdClick;
  createdAt: string;
  expiresAt: string;
  consent: 'granted' | 'revoked';
};

export type ClaimedOpportunity = ConsentedOpportunity & { leaseId: string };

/** Implementations must atomically claim the first inbound event per reference. */
export type ConversionStore = {
  /** Returns false only when the generated reference already exists. */
  createOpportunity(opportunity: ConsentedOpportunity): Promise<boolean>;
  /** Revocation must delete the click identifier or make it permanently unreadable. */
  revokeOpportunity(reference: string): Promise<boolean>;
  /**
   * Atomically records the first inbound message and leases it for submission.
   * A retry of that same message may return the opportunity after its lease
   * expires; later messages for the reference must always return null.
   * A busy lease throws so the webhook receives a retryable response.
   */
  claimFirstReceived(input: {
    reference: string;
    messageId: string;
    receivedAt: string;
  }): Promise<ClaimedOpportunity | null>;
  markSubmitted(reference: string, leaseId: string, requestId: string): Promise<void>;
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
  // a revoked, absent or expired reference and every later message, while
  // allowing a safe retry of the same first message until submission.
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
  await dependencies.store.markSubmitted(opportunity.reference, opportunity.leaseId, requestId);
  return 'submitted';
}
