import test from 'node:test';
import assert from 'node:assert/strict';
import { patientInput, tenantId, pageNumber, sameOrigin } from '../lib/validation.ts';

test('normalizes demographic input without creating placeholder values', () => {
  assert.deepEqual(patientInput({ display_name: '  Pessoa   de Teste  ', birth_date: '' }), { display_name: 'Pessoa de Teste', birth_date: null });
});
test('rejects role, clinic, identity and audit injection', () => {
  for (const key of ['tenant_id', 'created_by', 'role', 'id', 'created_at']) assert.throws(() => patientInput({ display_name: 'Teste', [key]: 'forged' }));
});
test('rejects invalid dates and malformed names', () => {
  for (const birth_date of ['2025-02-29', '2020-02-30', '3000-01-01', '1899-01-01', 15]) assert.throws(() => patientInput({ display_name: 'Teste', birth_date }));
  for (const display_name of ['', 'a', null, 'a'.repeat(161)]) assert.throws(() => patientInput({ display_name }));
  assert.equal(patientInput({ display_name: 'Teste', birth_date: '2024-02-29' }).birth_date, '2024-02-29');
});
test('validates tenant and bounds pagination', () => {
  assert.equal(tenantId('00000000-0000-4000-8000-000000000001').length, 36);
  assert.throws(() => tenantId('../other'));
  assert.equal(pageNumber(null), 1);
  for (const page of ['0', '-1', '1.5', 'Infinity', '10001', '1 OR 1=1']) assert.throws(() => pageNumber(page));
});
test('blocks cross-origin and missing-origin cookie mutations', () => {
  assert.equal(sameOrigin(new Request('https://vivance.example/api', { headers: { origin: 'https://vivance.example' } })), true);
  assert.equal(sameOrigin(new Request('https://vivance.example/api', { headers: { origin: 'https://evil.example' } })), false);
  assert.equal(sameOrigin(new Request('https://vivance.example/api')), false);
});
