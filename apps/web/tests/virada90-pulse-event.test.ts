import test from 'node:test';
import assert from 'node:assert/strict';
import { readPulseReceivedAttribution } from '../modules/virada90/pulse-event.ts';

const reference = 'V90-ABCDEFGHJKLMNPQRSTUVWXYZ23';
const synthetic = {
  eventType: 'MESSAGE_RECEIVED',
  date: '2026-10-05T18:00:00Z',
  content: {
    id: 'e656d5d4-3159-4ea2-8132-2eae52e09c15',
    direction: 'TO_HUB',
    type: 'TEXT',
    text: `DEMONSTRAÇÃO: Quero conhecer o programa. Referência: ${reference}`,
    contact: { name: 'PESSOA FICTÍCIA', phoneNumber: 'NÃO USAR' },
    fileId: 'NÃO USAR'
  }
};

test('allowlists only the reference and message identity from a synthetic inbound event', () => {
  const result = readPulseReceivedAttribution(synthetic);
  assert.deepEqual(result, {
    messageId: synthetic.content.id,
    occurredAt: '2026-10-05T18:00:00.000Z',
    reference
  });
  assert.doesNotMatch(JSON.stringify(result), /DEMONSTRAÇÃO|PESSOA FICTÍCIA|NÃO USAR/);
});

test('does not count outbound, unrelated, malformed, or reference-free messages', () => {
  for (const changed of [
    { eventType: 'MESSAGE_SENT' },
    { content: { ...synthetic.content, direction: 'FROM_HUB' } },
    { content: { ...synthetic.content, type: 'IMAGE' } },
    { content: { ...synthetic.content, text: 'Quero conhecer o programa' } },
    { content: { ...synthetic.content, id: 'invalid' } },
    { date: 'invalid' }
  ]) {
    assert.equal(readPulseReceivedAttribution({ ...synthetic, ...changed }), null);
  }
});
