import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchedulingMessage,
  createPreferenceSlots,
  filterFutureSlots,
  formatSaoPauloDate,
  isFutureSaoPauloSlot,
  listFutureWeekdays,
  reconcilePreference,
  saoPauloNow
} from '../public/virada90/scheduling.js';

test('Sao Paulo dates roll over independently from UTC', () => {
  assert.deepEqual(saoPauloNow(new Date('2026-10-16T02:30:00.000Z')), {
    date: '2026-10-15', time: '23:30', second: '00'
  });
  assert.deepEqual(saoPauloNow(new Date('2026-10-16T03:00:00.000Z')), {
    date: '2026-10-16', time: '00:00', second: '00'
  });
  assert.match(formatSaoPauloDate('2026-10-16'), /sexta-feira, 16 de outubro de 2026/i);
});

test('future filtering rejects past, current-minute, malformed and duplicate slots', () => {
  const now = new Date('2026-10-15T12:30:45.000Z'); // 09:30:45 in Sao Paulo
  const slots = [
    { date: '2026-10-14', time: '16:00' },
    { date: '2026-10-15', time: '09:30' },
    { date: '2026-10-15', time: '10:00' },
    { date: '2026-10-15', time: '10:00' },
    { date: '2026-10-16', time: '08:00' },
    { date: 'not-a-date', time: '99:00' }
  ];
  assert.equal(isFutureSaoPauloSlot(slots[1], now), false);
  assert.deepEqual(filterFutureSlots(slots, now), [slots[2], slots[4]]);
});

test('approved preferences use weekdays and six times within the next 30 calendar days', () => {
  const now = new Date('2026-10-16T15:00:00.000Z'); // Friday, 12:00 in Sao Paulo
  const dates = listFutureWeekdays(now, 30);
  const slots = createPreferenceSlots(now, 30);
  assert.equal(dates[0], '2026-10-16');
  assert.equal(dates.at(-1), '2026-11-13');
  assert.equal(slots.some(slot => slot.date === '2026-10-17' || slot.date === '2026-10-18'), false);
  assert.deepEqual(slots.filter(slot => slot.date === '2026-10-16').map(slot => slot.time), ['14:00', '15:00', '16:00']);
  assert.deepEqual(slots.filter(slot => slot.date === '2026-10-19').map(slot => slot.time), ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00']);
  assert.equal(slots.some(slot => slot.date > '2026-11-14'), false);
});

test('a preference is invalidated when its slot passes, disappears, or modality is unsupported', () => {
  const slots = [
    { date: '2026-10-16', time: '08:00' },
    { date: '2026-10-16', time: '09:00' }
  ];
  const preference = { modality: 'Online', date: '2026-10-16', time: '09:00' };
  assert.deepEqual(reconcilePreference(preference, slots, new Date('2026-10-16T11:30:00.000Z')), {
    ...preference,
    formattedDate: 'Sexta-feira, 16 de outubro de 2026'
  });
  assert.equal(reconcilePreference(preference, slots, new Date('2026-10-16T12:01:00.000Z')), null);
  assert.equal(reconcilePreference(preference, [slots[0]], new Date('2026-10-16T11:30:00.000Z')), null);
  assert.equal(reconcilePreference({ ...preference, modality: 'Ainda estou decidindo' }, slots, new Date('2026-10-16T11:30:00.000Z')), null);
});

test('WhatsApp copy distinguishes a general inquiry from a requested consultation without health goals', () => {
  const inquiry = buildSchedulingMessage();
  assert.match(inquiry, /gostaria de saber mais/i);
  assert.doesNotMatch(inquiry, /objetivo|emagrecer|saúde/i);

  const requested = buildSchedulingMessage({
    modality: 'Presencial em Presidente Prudente',
    date: '2026-10-16',
    time: '14:00',
    formattedDate: 'Sexta-feira, 16 de outubro de 2026'
  });
  assert.match(requested, /solicitar uma consulta inicial/i);
  assert.match(requested, /Modalidade: Presencial em Presidente Prudente\./);
  assert.match(requested, /sexta-feira, 16 de outubro de 2026, às 14:00 \(horário de Brasília\)/i);
  assert.match(requested, /confirmar a disponibilidade/i);
  assert.doesNotMatch(requested, /objetivo|emagrecer|diagnóstico/i);
});
