import test from 'node:test';
import assert from 'node:assert/strict';
import {
  opportunityDelete,
  opportunityGet,
  opportunityPost,
  pulsePost,
  type Virada90Runtime
} from '../modules/virada90/http.ts';
import type { ConsentedOpportunity, ConversionStore } from '../modules/virada90/conversion-pipeline.ts';
import { virada90FeatureRequested } from '../modules/virada90/runtime.ts';

const reference = `V90-${'B'.repeat(26)}`;

function request(path: string, body: unknown, init: RequestInit = {}) {
  return new Request(`https://institutovivance.app${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://institutovivance.app', ...init.headers },
    body: JSON.stringify(body),
    ...init
  });
}

function runtime(overrides: Partial<Virada90Runtime> = {}) {
  let saved: ConsentedOpportunity | null = null;
  let revoked = false;
  const store: ConversionStore = {
    async createOpportunity(opportunity) { saved = opportunity; return true; },
    async revokeOpportunity(candidate) { revoked = candidate === reference; return revoked; },
    async claimFirstReceived() { return saved ? { ...saved, leaseId: 'synthetic-lease' } : null; },
    async markSubmitted() {}
  };
  return {
    dependencies: {
      allowedOrigin: 'https://institutovivance.app',
      store,
      async upload() { return 'synthetic-request'; },
      customerId: '4216172711',
      conversionActionId: '123456789',
      authenticatePulse: () => true,
      now: () => new Date('2026-10-05T18:00:00Z'),
      makeReference: () => reference,
      ...overrides
    } satisfies Virada90Runtime,
    get saved() { return saved; },
    get revoked() { return revoked; }
  };
}

test('stays disabled unless explicitly requested and fully composed', async () => {
  assert.equal(virada90FeatureRequested({}), false);
  assert.equal(virada90FeatureRequested({ VIRADA90_ATTRIBUTION_ENABLED: 'false' }), false);
  assert.equal(virada90FeatureRequested({ VIRADA90_ATTRIBUTION_ENABLED: 'true' }), true);
  assert.deepEqual(await (await opportunityGet(() => null)()).json(), { enabled: false });
  assert.equal((await opportunityPost(() => null)(request('/api/virada90/opportunity', {
    click: { kind: 'gclid', value: 'synthetic-click' }
  }))).status, 404);
});

test('creates only an allowlisted, server-referenced consented opportunity', async () => {
  const state = runtime();
  const response = await opportunityPost(() => state.dependencies)(request('/api/virada90/opportunity', {
    click: { kind: 'gclid', value: 'synthetic-click' }
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    reference,
    expiresAt: '2026-11-04T18:00:00.000Z'
  });
  assert.deepEqual(state.saved, {
    reference,
    click: { kind: 'gclid', value: 'synthetic-click' },
    createdAt: '2026-10-05T18:00:00.000Z',
    expiresAt: '2026-11-04T18:00:00.000Z',
    consent: 'granted'
  });
});

test('rejects foreign origins and any extra personal or clinical fields', async () => {
  const state = runtime();
  const foreign = request('/api/virada90/opportunity', {
    click: { kind: 'gclid', value: 'synthetic-click' }
  }, { headers: { 'content-type': 'application/json', origin: 'https://evil.example' } });
  assert.equal((await opportunityPost(() => state.dependencies)(foreign)).status, 403);
  for (const body of [
    { click: { kind: 'gclid', value: 'synthetic-click' }, goal: 'PRIVATE' },
    { click: { kind: 'gclid', value: 'synthetic-click', phone: 'PRIVATE' } },
    { click: { kind: 'gclid', value: 'not valid' } }
  ]) {
    assert.equal((await opportunityPost(() => state.dependencies)(
      request('/api/virada90/opportunity', body)
    )).status, 400);
  }
  assert.equal(state.saved, null);
});

test('bounds a streamed body without trusting Content-Length', async () => {
  const state = runtime();
  let cancelled = false;
  const oversized = new Request('https://institutovivance.app/api/virada90/opportunity', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://institutovivance.app' },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8_000));
        controller.enqueue(new Uint8Array(8_000));
      },
      cancel() { cancelled = true; }
    }),
    duplex: 'half'
  } as RequestInit & { duplex: 'half' });
  assert.equal((await opportunityPost(() => state.dependencies)(oversized)).status, 400);
  assert.equal(cancelled, true);
  assert.equal(state.saved, null);
});

test('hides storage failures from public responses', async () => {
  const failing = runtime({
    store: {
      async createOpportunity() { throw new Error('private storage detail'); },
      async revokeOpportunity() { throw new Error('private storage detail'); },
      async claimFirstReceived() { return null; },
      async markSubmitted() {}
    }
  });
  const create = await opportunityPost(() => failing.dependencies)(request('/api/virada90/opportunity', {
    click: { kind: 'gclid', value: 'synthetic-click' }
  }));
  assert.equal(create.status, 503);
  assert.doesNotMatch(await create.text(), /private storage detail/);
  const revoke = await opportunityDelete(() => failing.dependencies)(request(
    '/api/virada90/opportunity', { reference }, { method: 'DELETE' }
  ));
  assert.equal(revoke.status, 503);
  assert.doesNotMatch(await revoke.text(), /private storage detail/);
});

test('revokes idempotently without disclosing whether the reference exists', async () => {
  const state = runtime();
  const response = await opportunityDelete(() => state.dependencies)(request(
    '/api/virada90/opportunity', { reference }, { method: 'DELETE' }
  ));
  assert.equal(response.status, 204);
  assert.equal(state.revoked, true);
});

test('Pulse endpoint authenticates before parsing and requests retry on upload failure', async () => {
  const unauthorized = runtime({ authenticatePulse: () => false });
  assert.equal((await pulsePost(() => unauthorized.dependencies)(request('/api/virada90/pulse', {}))).status, 401);

  const failing = runtime({
    async upload() { throw new Error('synthetic provider failure'); }
  });
  await failing.dependencies.store.createOpportunity({
    reference,
    click: { kind: 'gclid', value: 'synthetic-click' },
    createdAt: '2026-10-05T17:00:00Z',
    expiresAt: '2026-10-06T17:00:00Z',
    consent: 'granted'
  });
  const event = {
    eventType: 'MESSAGE_RECEIVED',
    date: '2026-10-05T18:00:00Z',
    content: {
      id: 'e656d5d4-3159-4ea2-8132-2eae52e09c15',
      direction: 'TO_HUB',
      type: 'TEXT',
      text: `Referência ${reference}; texto privado não deve aparecer na resposta.`
    }
  };
  const response = await pulsePost(() => failing.dependencies)(request('/api/virada90/pulse', event));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'temporarily_unavailable' });
});
