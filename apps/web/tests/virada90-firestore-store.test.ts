import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreConversionStore } from '../modules/virada90/firestore-store.ts';

type Document = { fields: Record<string, { stringValue?: string; timestampValue?: string }>; updateTime: string };
const reference = `V90-${'B'.repeat(26)}`;
const otherReference = `V90-${'C'.repeat(26)}`;
const opportunity = {
  reference,
  click: { kind: 'gclid' as const, value: 'synthetic-click' },
  createdAt: '2026-10-05T17:00:00Z',
  expiresAt: '2026-11-04T17:00:00Z',
  consent: 'granted' as const
};

function fixture() {
  let clock = Date.parse('2026-10-05T18:00:00Z');
  let version = 0;
  const documents = new Map<string, Document>();
  const calls: string[] = [];
  const store = createFirestoreConversionStore({
    projectId: 'virada-90-attribution',
    accessToken: async () => 'synthetic-token',
    now: () => new Date(clock),
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const auth = new Headers(init?.headers).get('authorization');
      assert.equal(auth, 'Bearer synthetic-token');
      assert.equal(url.host, 'southamerica-east1-firestore.googleapis.com');
      assert.match(url.pathname, /^\/v1\/projects\/virada-90-attribution\/databases\/\(default\)\/documents\/virada90_opportunities/);
      const key = method === 'POST' ? url.searchParams.get('documentId')! : url.pathname.split('/').at(-1)!;
      calls.push(`${method} ${key}`);
      if (method === 'POST') {
        if (documents.has(key)) return Response.json({}, { status: 409 });
        const body = JSON.parse(String(init?.body)) as { fields: Document['fields'] };
        documents.set(key, { fields: body.fields, updateTime: `2026-10-05T18:00:${String(++version).padStart(2, '0')}Z` });
        return Response.json(documents.get(key));
      }
      const current = documents.get(key);
      if (!current) return Response.json({}, { status: 404 });
      if (method === 'GET') return Response.json(current);
      assert.equal(method, 'PATCH');
      if (url.searchParams.get('currentDocument.updateTime') !== current.updateTime) {
        return Response.json({}, { status: 409 });
      }
      const body = JSON.parse(String(init?.body)) as { fields: Document['fields'] };
      const fields = { ...current.fields };
      for (const field of url.searchParams.getAll('updateMask.fieldPaths')) {
        if (field in body.fields) fields[field] = body.fields[field];
        else delete fields[field];
      }
      const next = { fields, updateTime: `2026-10-05T18:00:${String(++version).padStart(2, '0')}Z` };
      documents.set(key, next);
      return Response.json(next);
    }
  });
  return { store, documents, calls, advance(ms: number) { clock += ms; } };
}

test('Firestore store creates once and retains only the first inbound message', async () => {
  const f = fixture();
  assert.equal(await f.store.createOpportunity(opportunity), true);
  assert.equal(await f.store.createOpportunity(opportunity), false);
  const first = await f.store.claimFirstReceived({
    reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z'
  });
  assert.equal(first?.click.value, 'synthetic-click');
  await assert.rejects(f.store.claimFirstReceived({
    reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z'
  }), /busy/);
  assert.equal(await f.store.claimFirstReceived({
    reference, messageId: 'second', receivedAt: '2026-10-05T18:01:00Z'
  }), null);
  f.advance(5 * 60 * 1_000 + 1);
  const retry = await f.store.claimFirstReceived({
    reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z'
  });
  assert.notEqual(retry?.leaseId, first?.leaseId);
  await assert.rejects(f.store.markSubmitted(reference, first!.leaseId, 'stale'), /lease lost/);
  await f.store.markSubmitted(reference, retry!.leaseId, 'synthetic-request');
  assert.equal(f.documents.get(reference)?.fields.clickValue, undefined);
  assert.equal(f.documents.get(reference)?.fields.state?.stringValue, 'submitted');
  assert.equal(f.documents.get(reference)?.fields.requestId?.stringValue, 'synthetic-request');
  assert.equal(await f.store.claimFirstReceived({
    reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z'
  }), null);
});

test('revocation removes the click and prevents submission; expired references are ignored', async () => {
  const f = fixture();
  assert.equal(await f.store.createOpportunity(opportunity), true);
  assert.equal(await f.store.revokeOpportunity(reference), true);
  assert.equal(await f.store.revokeOpportunity(reference), false);
  assert.equal(f.documents.get(reference)?.fields.clickValue, undefined);
  assert.equal(await f.store.claimFirstReceived({
    reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z'
  }), null);
  await f.store.createOpportunity({ ...opportunity, reference: otherReference });
  f.advance(31 * 24 * 60 * 60 * 1_000);
  assert.equal(await f.store.claimFirstReceived({
    reference: otherReference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z'
  }), null);
});

test('concurrent claims use a compare-and-swap lease, so only one receives a claim', async () => {
  const f = fixture();
  await f.store.createOpportunity(opportunity);
  const results = await Promise.allSettled([
    f.store.claimFirstReceived({ reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z' }),
    f.store.claimFirstReceived({ reference, messageId: 'first', receivedAt: '2026-10-05T18:00:00Z' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled' && result.value).length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal(f.documents.get(reference)?.fields.messageId?.stringValue, 'first');
});
