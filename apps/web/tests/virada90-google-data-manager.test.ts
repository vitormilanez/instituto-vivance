import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataManagerUploader } from '../modules/virada90/google-data-manager.ts';
import { buildAdsReceivedRequest } from '../modules/virada90/attribution.ts';

const request = buildAdsReceivedRequest({
  reference: `V90-${'B'.repeat(26)}`,
  click: { kind: 'gclid', value: 'synthetic-click' },
  receivedAt: '2026-10-05T18:00:00Z'
}, { customerId: '4216172711', conversionActionId: '123456789' }, true);

test('submits the allowlisted event to Data Manager and returns its request ID', async () => {
  const captured: Array<{ url: string; init?: RequestInit }> = [];
  const upload = createDataManagerUploader({
    async accessToken() { return 'synthetic-token'; },
    async fetch(url, init) {
      captured.push({ url: String(url), init });
      return Response.json({ requestId: 'synthetic-request' });
    }
  });
  assert.equal(await upload(request), 'synthetic-request');
  assert.equal(captured[0]?.url, 'https://datamanager.googleapis.com/v1/events:ingest');
  assert.equal((captured[0]?.init?.headers as Record<string, string>).authorization, 'Bearer synthetic-token');
  assert.deepEqual(JSON.parse(String(captured[0]?.init?.body)), request);
});

test('fails closed without exposing a provider response body', async () => {
  const upload = createDataManagerUploader({
    async accessToken() { return 'synthetic-token'; },
    async fetch() { return new Response('PRIVATE PROVIDER BODY', { status: 500 }); }
  });
  await assert.rejects(upload(request), error => {
    assert.doesNotMatch(String(error), /PRIVATE PROVIDER BODY/);
    return true;
  });
});
