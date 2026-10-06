import test from 'node:test';
import assert from 'node:assert/strict';
import { clickFromCampaignUrl, whatsappWithReference } from '../public/virada90/handoff-core.js';

const reference = `V90-${'B'.repeat(26)}`;

test('selects a single ad click without forwarding other campaign data', () => {
  assert.deepEqual(clickFromCampaignUrl('https://institutovivance.app/virada90?utm_campaign=saude&gclid=synthetic-click&wbraid=other'), {
    kind: 'gclid', value: 'synthetic-click'
  });
  assert.equal(clickFromCampaignUrl('https://institutovivance.app/virada90?gclid=not%20safe'), null);
});

test('adds an opaque reference to the editable WhatsApp message only', () => {
  const source = 'https://wa.me/5518997551234?text=Ol%C3%A1%2C%20quero%20saber%20mais.';
  const result = new URL(whatsappWithReference(source, reference));
  assert.equal(result.searchParams.get('text'), `Olá, quero saber mais.\nCódigo de referência: ${reference}`);
  assert.equal(result.searchParams.has('gclid'), false);
  assert.throws(() => whatsappWithReference('https://evil.example/?text=Oi', reference));
});
