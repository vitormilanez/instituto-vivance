export const SCHEDULING_TIME_ZONE = 'America/Sao_Paulo';

export const SCHEDULING_MODALITIES = Object.freeze([
  'Presencial em Presidente Prudente',
  'Online'
]);

export const SCHEDULING_TIMES = Object.freeze([
  '08:00',
  '09:00',
  '10:00',
  '14:00',
  '15:00',
  '16:00'
]);

const DAY_WINDOW_SIZE = 4;
const INITIAL_TIME_COUNT = 4;

const saoPauloParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: SCHEDULING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

const fullDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SCHEDULING_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SCHEDULING_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short'
});

const monthYear = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SCHEDULING_TIME_ZONE,
  month: 'long',
  year: 'numeric'
});

const dayParts = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SCHEDULING_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short'
});

function capitalize(value) {
  return value ? value[0].toLocaleUpperCase('pt-BR') + value.slice(1) : value;
}

function partsFor(now) {
  return Object.fromEntries(saoPauloParts.formatToParts(now)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
}

function calendarDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.toISOString().slice(0, 10) !== dateKey) return null;
  return date;
}

function addCalendarDays(dateKey, amount) {
  const date = calendarDate(dateKey);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function isWeekday(dateKey) {
  const day = calendarDate(dateKey)?.getUTCDay();
  return day !== undefined && day !== 0 && day !== 6;
}

export function saoPauloNow(now = new Date()) {
  const parts = partsFor(now);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    second: parts.second
  };
}

export function isFutureSaoPauloSlot(slot, now = new Date()) {
  if (!slot || !calendarDate(slot.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time || '')) return false;
  const current = saoPauloNow(now);
  if (slot.date !== current.date) return slot.date > current.date;
  return slot.time > current.time;
}

export function filterFutureSlots(slots, now = new Date()) {
  if (!Array.isArray(slots)) return [];
  const seen = new Set();
  return slots.filter(slot => {
    const key = `${slot?.date || ''}T${slot?.time || ''}`;
    if (seen.has(key) || !isFutureSaoPauloSlot(slot, now)) return false;
    seen.add(key);
    return true;
  });
}

export function listFutureWeekdays(now = new Date(), horizonDays = 30) {
  const today = saoPauloNow(now).date;
  const days = [];
  const safeHorizon = Number.isInteger(horizonDays) && horizonDays > 0 ? horizonDays : 0;
  for (let offset = 0; offset < safeHorizon; offset += 1) {
    const date = addCalendarDays(today, offset);
    if (isWeekday(date)) days.push(date);
  }
  return days;
}

export function createPreferenceSlots(now = new Date(), horizonDays = 30) {
  const slots = listFutureWeekdays(now, horizonDays)
    .flatMap(date => SCHEDULING_TIMES.map(time => ({ date, time })));
  return filterFutureSlots(slots, now);
}

export function formatSaoPauloDate(dateKey, style = 'full') {
  const date = calendarDate(dateKey);
  if (!date) return '';
  return capitalize((style === 'short' ? shortDate : fullDate).format(date));
}

export function reconcilePreference(preference, slots, now = new Date()) {
  if (!preference || !SCHEDULING_MODALITIES.includes(preference.modality)) return null;
  const validSlots = filterFutureSlots(slots, now);
  const valid = validSlots.some(slot => slot.date === preference.date && slot.time === preference.time);
  if (!valid) return null;
  return {
    modality: preference.modality,
    date: preference.date,
    time: preference.time,
    formattedDate: formatSaoPauloDate(preference.date)
  };
}

/** @param {{modality: string, date: string, time: string, formattedDate?: string} | null} preference */
export function buildSchedulingMessage(preference = null) {
  if (!preference) {
    return 'Olá! Conheci o Virada 90 e gostaria de saber mais sobre a consulta inicial com o Dr. Guilherme Martins. Podem me orientar sobre as modalidades, a disponibilidade e os próximos passos?';
  }
  const formattedDate = preference.formattedDate || formatSaoPauloDate(preference.date);
  if (!SCHEDULING_MODALITIES.includes(preference.modality) || !formattedDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preference.time || '')) {
    return buildSchedulingMessage(null);
  }
  return [
    'Olá! Conheci o Virada 90 e gostaria de solicitar uma consulta inicial com o Dr. Guilherme Martins.',
    `Modalidade: ${preference.modality}.`,
    `Minha preferência é ${formattedDate}, às ${preference.time} (horário de Brasília).`,
    'Podem confirmar a disponibilidade e orientar os próximos passos?'
  ].join('\n');
}

function makeButton(documentRef, className, text) {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

function compactPart(value) {
  return value.replace(/\.$/, '');
}

function calendarDayParts(dateKey) {
  const date = calendarDate(dateKey);
  if (!date) return { weekday: '', day: '', month: '' };
  const parts = Object.fromEntries(dayParts.formatToParts(date)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, compactPart(part.value)]));
  return {
    weekday: capitalize(parts.weekday),
    day: parts.day,
    month: capitalize(parts.month)
  };
}

function formatPeriod(firstDateKey, lastDateKey) {
  const first = calendarDate(firstDateKey);
  const last = calendarDate(lastDateKey);
  if (!first || !last) return 'Horários pelo WhatsApp';
  const firstParts = Object.fromEntries(monthYear.formatToParts(first)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
  const lastParts = Object.fromEntries(monthYear.formatToParts(last)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
  if (firstParts.month === lastParts.month && firstParts.year === lastParts.year) {
    return capitalize(monthYear.format(first));
  }
  if (firstParts.year === lastParts.year) {
    return `${capitalize(firstParts.month)} – ${lastParts.month} de ${lastParts.year}`;
  }
  return `${capitalize(monthYear.format(first))} – ${monthYear.format(last)}`;
}

export function initScheduling({ onChange = () => {} } = {}) {
  const documentRef = globalThis.document;
  const root = documentRef?.querySelector('#consultation-scheduler');
  let slots = [];
  let modality = null;
  let activeDate = null;
  let selectedTime = null;
  let windowStart = 0;
  let expanded = false;

  const getPreference = () => reconcilePreference(
    modality && activeDate && selectedTime ? { modality, date: activeDate, time: selectedTime } : null,
    slots,
    new Date()
  );

  if (!root) return { getPreference, refresh() {}, clear() {}, ensureReady: () => true };

  const daysContainer = root.querySelector('#schedule-days');
  const timesContainer = root.querySelector('#schedule-times');
  const periodLabel = root.querySelector('#schedule-period');
  const previous = root.querySelector('#schedule-prev');
  const next = root.querySelector('#schedule-next');
  const more = root.querySelector('#schedule-more');
  const summary = root.querySelector('#schedule-selected');
  const withoutTime = root.querySelector('#schedule-without-time');
  const headingDate = root.querySelector('#schedule-heading-date');
  const schedulerModalities = [...root.querySelectorAll('input[name="schedule-modality"]')];
  const formModalities = [...documentRef.querySelectorAll('input[name="modality"]')];

  const availableDates = () => [...new Set(slots.map(slot => slot.date))];
  const hasValidTime = () => selectedTime && slots.some(slot =>
    slot.date === activeDate && slot.time === selectedTime && isFutureSaoPauloSlot(slot, new Date()));

  const ensureReady = () => {
    if (!selectedTime || modality) return true;
    schedulerModalities[0]?.focus();
    return false;
  };

  const captureFocus = () => {
    const active = documentRef.activeElement;
    if (!active || !root.contains(active)) return null;
    if (active.classList?.contains('schedule-day')) return { kind: 'day', value: active.dataset.date };
    if (active.classList?.contains('schedule-time')) return { kind: 'time', value: active.dataset.time };
    return active.id ? { kind: 'id', value: active.id } : null;
  };

  const restoreFocus = descriptor => {
    if (!descriptor) return;
    let target = null;
    if (descriptor.kind === 'day') {
      target = [...(daysContainer?.querySelectorAll('.schedule-day') || [])]
        .find(button => button.dataset.date === descriptor.value);
    } else if (descriptor.kind === 'time') {
      target = [...(timesContainer?.querySelectorAll('.schedule-time') || [])]
        .find(button => button.dataset.time === descriptor.value);
    } else if (descriptor.kind === 'id') {
      target = root.querySelector(`#${descriptor.value}`);
    }
    target?.focus({ preventScroll: true });
  };

  const announce = () => {
    const preference = getPreference();
    if (preference) {
      summary.textContent = `${preference.modality} · ${preference.formattedDate} · ${preference.time} (horário de Brasília). A equipe confirma pelo WhatsApp.`;
    } else if (selectedTime) {
      summary.textContent = `${formatSaoPauloDate(activeDate)} · ${selectedTime}. Para continuar, escolha Presencial ou Online acima. Seu horário será mantido.`;
    } else if (modality) {
      summary.textContent = `${modality}. Escolha um dia e um horário de preferência, ou combine com a equipe.`;
    } else {
      summary.textContent = 'Escolha um horário e a modalidade da sua consulta.';
    }
    onChange(preference);
  };

  const render = ({ preserveFocus = true, notify = true } = {}) => {
    const focusedControl = preserveFocus ? captureFocus() : null;
    const dates = availableDates();
    if (activeDate && !dates.includes(activeDate)) {
      activeDate = null;
      selectedTime = null;
    }
    if (!activeDate && dates.length) activeDate = dates[Math.min(windowStart, dates.length - 1)];
    if (selectedTime && !hasValidTime()) selectedTime = null;

    const maxStart = dates.length
      ? Math.floor((dates.length - 1) / DAY_WINDOW_SIZE) * DAY_WINDOW_SIZE
      : 0;
    windowStart = Math.min(windowStart, maxStart);
    const visibleDates = dates.slice(windowStart, windowStart + DAY_WINDOW_SIZE);

    daysContainer?.replaceChildren(...visibleDates.map(date => {
      const button = makeButton(documentRef, 'schedule-day', '');
      const active = date === activeDate;
      const parts = calendarDayParts(date);
      button.dataset.date = date;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', formatSaoPauloDate(date));
      for (const [className, text] of [
        ['schedule-day-name', parts.weekday],
        ['schedule-day-number', parts.day],
        ['schedule-day-month', parts.month]
      ]) {
        const span = documentRef.createElement('span');
        span.className = className;
        span.textContent = text;
        span.setAttribute('aria-hidden', 'true');
        button.append(span);
      }
      button.addEventListener('click', () => {
        if (date !== activeDate) selectedTime = null;
        activeDate = date;
        expanded = false;
        render();
      });
      return button;
    }));

    if (periodLabel) {
      const first = visibleDates[0];
      const last = visibleDates.at(-1);
      periodLabel.textContent = formatPeriod(first, last);
    }
    if (headingDate) headingDate.textContent = activeDate ? formatSaoPauloDate(activeDate) : 'Combine com a equipe';
    if (previous) previous.disabled = windowStart === 0 || dates.length === 0;
    if (next) next.disabled = windowStart >= maxStart || dates.length === 0;

    const dayTimes = activeDate ? slots.filter(slot => slot.date === activeDate).map(slot => slot.time) : [];
    const visibleTimes = expanded ? dayTimes : dayTimes.slice(0, INITIAL_TIME_COUNT);
    timesContainer?.replaceChildren(...(visibleTimes.length ? visibleTimes.map(time => {
      const button = makeButton(documentRef, 'schedule-time', time);
      const selected = time === selectedTime;
      button.dataset.time = time;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${time}, horário de preferência`);
      button.addEventListener('click', () => {
        const candidate = { date: activeDate, time };
        if (!slots.some(slot => slot.date === candidate.date && slot.time === candidate.time) || !isFutureSaoPauloSlot(candidate, new Date())) {
          refresh();
          return;
        }
        selectedTime = time;
        render();
        ensureReady();
      });
      return button;
    }) : [Object.assign(documentRef.createElement('p'), {
      className: 'schedule-empty',
      textContent: 'Consulte a equipe pelo WhatsApp para combinar dia e horário.'
    })]));

    if (more) {
      more.hidden = dayTimes.length <= INITIAL_TIME_COUNT;
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? 'Mostrar menos horários' : 'Mais horários';
    }
    restoreFocus(focusedControl);
    if (notify) announce();
  };

  const setModality = value => {
    const nextModality = SCHEDULING_MODALITIES.includes(value) ? value : null;
    if (modality && nextModality !== modality) selectedTime = null;
    modality = nextModality;
    for (const radio of schedulerModalities) radio.checked = radio.value === modality;
    render();
  };

  const refresh = ({ preserveFocus = true, notify = true, onlyIfChanged = false } = {}) => {
    const nextSlots = createPreferenceSlots(new Date(), 30);
    const before = slots.map(slot => `${slot.date}T${slot.time}`).join('|');
    const after = nextSlots.map(slot => `${slot.date}T${slot.time}`).join('|');
    slots = nextSlots;
    if (!onlyIfChanged || before !== after || (selectedTime && !hasValidTime())) {
      render({ preserveFocus, notify });
    }
  };

  const clear = () => {
    selectedTime = null;
    expanded = false;
    render();
  };

  for (const radio of schedulerModalities) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const formRadio = formModalities.find(candidate => candidate.value === radio.value);
      if (formRadio && !formRadio.checked) {
        formRadio.checked = true;
        formRadio.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        setModality(radio.value);
      }
    });
  }

  for (const radio of formModalities) {
    radio.addEventListener('change', () => {
      if (radio.checked) setModality(radio.value);
    });
  }

  previous?.addEventListener('click', () => {
    windowStart = Math.max(0, windowStart - DAY_WINDOW_SIZE);
    activeDate = availableDates()[windowStart] || null;
    selectedTime = null;
    expanded = false;
    render();
  });
  next?.addEventListener('click', () => {
    const dates = availableDates();
    const lastWindowStart = dates.length
      ? Math.floor((dates.length - 1) / DAY_WINDOW_SIZE) * DAY_WINDOW_SIZE
      : 0;
    windowStart = Math.min(lastWindowStart, windowStart + DAY_WINDOW_SIZE);
    activeDate = dates[windowStart] || null;
    selectedTime = null;
    expanded = false;
    render();
  });
  more?.addEventListener('click', () => {
    expanded = !expanded;
    render();
  });
  withoutTime?.addEventListener('click', clear);

  const initiallySelected = formModalities.find(radio => radio.checked)?.value;
  modality = SCHEDULING_MODALITIES.includes(initiallySelected) ? initiallySelected : null;
  for (const radio of schedulerModalities) radio.checked = radio.value === modality;
  refresh({ notify: false });

  const refreshFromClock = () => refresh({ preserveFocus: true, onlyIfChanged: true });
  documentRef.addEventListener('visibilitychange', () => {
    if (!documentRef.hidden) refreshFromClock();
  });
  globalThis.addEventListener?.('focus', refreshFromClock);
  globalThis.setInterval?.(refreshFromClock, 60_000);

  // Permite ao chamador atribuir o retorno de initScheduling antes do primeiro callback.
  globalThis.queueMicrotask?.(() => onChange(getPreference()));

  return { getPreference, refresh, clear, ensureReady };
}
