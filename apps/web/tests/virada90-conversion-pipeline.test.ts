import test from 'node:test';
import assert from 'node:assert/strict';
import { processPulseReceivedEvent, type ConsentedOpportunity, type ConversionStore } from '../modules/virada90/conversion-pipeline.ts';

const reference = `V90-${'B'.repeat(26)}`;
const base: ConsentedOpportunity = {
  reference,
  click: { kind: 'gclid', value: 'synthetic-click-id' },
  createdAt: '2026-10-05T17:00:00Z',
  expiresAt: '2026-10-06T17:00:00Z',
  consent: 'granted'
};
const event = {
  eventType: 'MESSAGE_RECEIVED', date: '2026-10-05T18:00:00Z',
  content: {
    id: 'e656d5d4-3159-4ea2-8132-2eae52e09c15',
    direction: 'TO_HUB', type: 'TEXT',
    text: `Olá, referência ${reference}. Sintoma de teste que nunca deve ser enviado.`,
    contact: { phone: 'PRIVATE' }
  }
};

test('claims and uploads only the first consented received message', async () => {
  let claimed = false;
  let uploadCount = 0;
  const store: ConversionStore = {
    async claimFirstReceived() {
      if (claimed) return null;
      claimed = true;
      return base;
    },
    async markSubmitted(ref, requestId) {
      assert.equal(ref, reference);
      assert.equal(requestId, 'synthetic-request');
    }
  };
  const dependencies = {
    store, customerId: '4216172711', conversionActionId: '123456789',
    async upload(request: Parameters<Parameters<typeof processPulseReceivedEvent>[1]['upload']>[0]) {
      uploadCount++;
      assert.doesNotMatch(JSON.stringify(request), /Sintoma|PRIVATE|phone/i);
      return 'synthetic-request';
    }
  };
  assert.equal(await processPulseReceivedEvent(event, dependencies), 'submitted');
  assert.equal(await processPulseReceivedEvent(event, dependencies), 'ignored');
  assert.equal(uploadCount, 1);
});

test('does not upload a revoked or expired reference or an unrelated event', async () => {
  for (const opportunity of [
    { ...base, consent: 'revoked' as const },
    { ...base, expiresAt: '2026-10-05T17:30:00Z' }
  ]) {
    let uploaded = false;
    const result = await processPulseReceivedEvent(event, {
      store: {
        async claimFirstReceived() { return opportunity; },
        async markSubmitted() { throw new Error('unexpected'); }
      },
      async upload() { uploaded = true; return 'unexpected'; },
      customerId: '4216172711', conversionActionId: '123456789'
    });
    assert.equal(result, 'ignored');
    assert.equal(uploaded, false);
  }
});
