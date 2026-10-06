import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdsReceivedRequest, isReference, makeReference, readAdClick } from '../modules/virada90/attribution.ts';

test('creates an opaque reference accepted by the Pulse parser', () => {
  const reference = makeReference(new Uint8Array(26).fill(1));
  assert.equal(reference, `V90-${'B'.repeat(26)}`);
  assert.equal(isReference(reference), true);
  assert.equal(isReference('V90-invalid'), false);
  assert.throws(() => makeReference(new Uint8Array(25)));
});

test('selects a single valid click ID without reading personal or clinical fields', () => {
  assert.deepEqual(readAdClick({ gclid: 'abc_123', phone: 'PRIVATE', goal: 'PRIVATE' }), {
    kind: 'gclid', value: 'abc_123'
  });
  assert.deepEqual(readAdClick({ gclid: 'not valid', wbraid: 'ok_123' }), {
    kind: 'wbraid', value: 'ok_123'
  });
  assert.equal(readAdClick({ phone: 'PRIVATE' }), null);
  assert.equal(readAdClick({ gclid: 'x'.repeat(201) }), null);
});

test('builds a distinct offline conversion with stable deduplication and no health data', () => {
  const reference = makeReference(new Uint8Array(26).fill(2));
  const request = buildAdsReceivedRequest({
    reference,
    click: { kind: 'gclid', value: 'synthetic-click-id' },
    receivedAt: '2026-10-05T18:00:00Z'
  }, { customerId: '4216172711', conversionActionId: '123456789' }, true);
  assert.deepEqual(request.events[0], {
    adIdentifiers: { gclid: 'synthetic-click-id' },
    eventTimestamp: '2026-10-05T18:00:00.000Z',
    transactionId: reference,
    eventSource: 'MESSAGE',
    consent: { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_DENIED' }
  });
  assert.equal(request.validateOnly, true);
  assert.doesNotMatch(JSON.stringify(request), /phone|goal|symptom|messageText|name/i);
});
