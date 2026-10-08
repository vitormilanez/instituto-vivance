import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { campaignUrl, campaignReferrer, campaignSource, createMeasurement, GOOGLE, whatsappWithSource } from '../public/virada90/measurement-core.js';

function fixture(url = 'https://institutovivance.app/virada90') {
  const calls: unknown[][] = [];
  let loads = 0;
  const measurement = createMeasurement({ url, command: (...args) => calls.push(args), load: () => { loads++; } });
  return { measurement, calls, loads: () => loads, events: () => calls.filter(args => args[0] === 'event') };
}

test('Google stays unloaded before consent, after refusal, and on clinical or Preview URLs', () => {
  const publicPage = fixture();
  publicPage.measurement.whatsapp('presentation');
  publicPage.measurement.consent(false);
  assert.equal(publicPage.loads(), 0);
  assert.equal(publicPage.events().length, 0);
  for (const url of [
    'https://institutovivance.app/login',
    'https://institutovivance.app/clinicas/tenant/pacientes/patient',
    'https://institutovivance.app/virada90/assets/anything',
    'https://instituto-vivance-preview.vercel.app/virada90',
    'http://localhost:4182/virada90'
  ]) {
    const blocked = fixture(url);
    blocked.measurement.consent(true);
    blocked.measurement.whatsapp('presentation');
    assert.equal(blocked.loads(), 0, url);
    assert.deepEqual(blocked.calls, [], url);
  }
});

test('accepted visitors initialize both verified destinations once, without ad personalization', () => {
  const f = fixture();
  f.measurement.consent(true);
  f.measurement.consent(true);
  assert.equal(f.loads(), 1);
  const configs = f.calls.filter(args => args[0] === 'config');
  assert.deepEqual(configs.map(args => args[1]), ['G-L8QMHVRV68', 'AW-818747876']);
  for (const args of configs) {
    const data = args[2] as Record<string, unknown>;
    assert.equal(data.cookie_path, '/virada90');
    assert.equal(data.allow_google_signals, false);
    assert.equal(data.send_page_view, false);
  }
  assert.equal(f.events().filter(args => args[1] === 'page_view').length, 1);
});

test('only an explicit WhatsApp action fires the existing Ads click conversion', () => {
  const f = fixture('https://institutovivance.app/virada90/conhecer');
  f.measurement.consent(true);
  f.measurement.viewStep(5);
  f.measurement.viewStep(5);
  assert.equal(f.events().filter(args => args[1] === 'conversion').length, 0);
  f.measurement.whatsapp('unknown');
  f.measurement.whatsapp('presentation');
  assert.equal(f.events().filter(args => args[1] === 'conversion').length, 1);
  assert.deepEqual(f.events().find(args => args[1] === 'conversion')?.[2], { send_to: 'AW-818747876/zzjqCNb0r4wYEOSztIYD' });
  assert.equal(f.events().filter(args => args[1] === 'whatsapp_click').length, 1);
  assert.equal(f.events().filter(args => args[1] === 'virada90_presentation_complete').length, 1);
  assert.equal(f.events().some(args => args[1] === 'generate_lead' || args[1] === 'purchase'), false);
  f.measurement.consent(false);
  f.measurement.whatsapp('presentation');
  f.measurement.viewStep(5);
  assert.equal(f.events().filter(args => args[1] === 'conversion').length, 1);
});

test('page URLs keep campaign attribution and exclude arbitrary contact or health parameters', () => {
  const input = 'https://institutovivance.app/virada90?utm_source=google&utm_campaign=Virada90&gclid=abc_123&goal=emagrecer&email=pessoa%40example.com&patient_id=private#contato';
  assert.equal(campaignUrl(input), 'https://institutovivance.app/virada90?utm_source=google&utm_campaign=Virada90&gclid=abc_123');
  assert.equal(campaignUrl('https://institutovivance.app/virada90?utm_source=pessoa%40example.com'), 'https://institutovivance.app/virada90');
  assert.equal(campaignReferrer('https://institutovivance.app/clinicas/t/pacientes/p?segredo=valor'), '');
  assert.equal(campaignReferrer('https://google.com/search?q=informacao+de+saude'), 'https://google.com/');
  assert.equal(campaignReferrer('https://institutovivance.app/virada90?goal=private'), 'https://institutovivance.app/virada90');
});

test('presentation entry measures a fixed navigation position only after consent, without an Ads conversion', () => {
  const f = fixture();
  f.measurement.presentationEntry('hero');
  assert.equal(f.events().length, 0);
  f.measurement.consent(true);
  f.measurement.presentationEntry('hero');
  f.measurement.presentationEntry('landing_presencial');
  f.measurement.presentationEntry('private-health-answer');
  const entries = f.events().filter(args => args[1] === 'virada90_presentation_entry');
  assert.deepEqual(entries.map(args => (args[2] as Record<string, unknown>).cta_position), ['hero', 'landing_presencial']);
  assert.equal(f.events().some(args => args[1] === 'conversion' || args[1] === 'whatsapp_click'), false);
  assert.equal(JSON.stringify(f.calls).includes('private-health-answer'), false);
  f.measurement.consent(false);
  f.measurement.presentationEntry('contact');
  assert.equal(f.events().filter(args => args[1] === 'virada90_presentation_entry').length, 2);
  for (const url of ['http://localhost:4182/virada90', 'https://institutovivance.app/login', 'https://institutovivance.app/virada90/conhecer']) {
    const blocked = fixture(url);
    blocked.measurement.consent(true);
    blocked.measurement.presentationEntry('hero');
    assert.equal(blocked.events().some(args => args[1] === 'virada90_presentation_entry'), false);
  }
});

test('the WhatsApp handoff uses only recognized paid-source labels, never raw click IDs or health data', () => {
  const handoff = 'https://wa.me/5518997551234?text=' + encodeURIComponent('Olá! Quero saber mais sobre o Virada 90 online.');
  const google = 'https://institutovivance.app/virada90/conhecer?utm_source=google&utm_medium=cpc&utm_campaign=consulta&gclid=click_123&goal=private-health-answer';
  const tagged = whatsappWithSource(handoff, google);
  assert.equal(campaignSource(google), 'Google Ads');
  assert.match(new URL(tagged).searchParams.get('text') || '', /Virada 90 online\.\nOrigem do link: Google Ads\.$/);
  assert.doesNotMatch(decodeURIComponent(tagged), /click_123|private-health-answer|consulta/);
  assert.equal(whatsappWithSource(tagged, google), tagged);

  const meta = 'https://institutovivance.app/virada90?utm_source=instagram&utm_medium=paid_social&utm_content=private';
  assert.equal(campaignSource(meta), 'Anúncio nas redes sociais');
  assert.match(new URL(whatsappWithSource(handoff, meta)).searchParams.get('text') || '', /Origem do link: Anúncio nas redes sociais/);
  for (const uncertain of [
    'https://institutovivance.app/virada90',
    'https://institutovivance.app/virada90?utm_source=google&utm_medium=organic',
    'https://institutovivance.app/virada90?utm_source=instagram',
    'https://institutovivance.app/virada90?utm_source=meta&gclid=abc',
    'https://institutovivance.app/clinicas/id?gclid=abc'
  ]) {
    assert.equal(campaignSource(uncertain), '');
    assert.equal(whatsappWithSource(handoff, uncertain), handoff);
  }
  assert.equal(whatsappWithSource('https://example.com/?text=hello', google), 'https://example.com/?text=hello');
});

test('no funnel or event payload can receive a health answer or a WhatsApp URL', () => {
  const f = fixture('https://institutovivance.app/virada90/conhecer?goal=private-health-answer');
  f.measurement.viewStep(4);
  f.measurement.consent(true);
  for (const step of [0, NaN, 6, 5, 10]) f.measurement.viewStep(step);
  f.measurement.whatsapp('presentation');
  assert.doesNotMatch(JSON.stringify(f.calls), /private-health-answer|wa\.me|5518997551234|generate_lead/);
  assert.deepEqual(f.events().filter(args => args[1] === 'virada90_step_view').map(args => (args[2] as Record<string, unknown>).step_number), [4, 5]);
});

test('a blocked Google loader does not throw or produce a false conversion', () => {
  const calls: unknown[][] = [];
  const measurement = createMeasurement({ url: 'https://institutovivance.app/virada90', command: (...args) => calls.push(args), load: () => { throw new Error('blocked'); } });
  assert.doesNotThrow(() => measurement.consent(true));
  assert.doesNotThrow(() => measurement.whatsapp('presentation'));
  assert.equal(calls.some(args => args[0] === 'event'), false);
});

test('the guided handoff keeps health choices in memory and opens WhatsApp without relying on Google', () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const makeControl = (key: string) => ({
    textContent: '', href: 'https://wa.me/5518997551234?text=generic', dataset: { title: 'Topic' }, hidden: false,
    classList: { toggle() {} }, style: {}, setAttribute() {},
    addEventListener(type: string, fn: (event: unknown) => void) { listeners.set(key + ':' + type, fn); },
    querySelector() { return null; }
  });
  const controls = new Map<string, ReturnType<typeof makeControl>>();
  const steps = Array.from({ length: 5 }, (_, n) => makeControl('step' + n));
  const form = { ...makeControl('form'), querySelectorAll: () => steps };
  const opened: string[] = [];
  vm.runInNewContext(readFileSync(new URL('../public/virada90/guided.js', import.meta.url), 'utf8'), {
    document: {
      querySelector(key: string) {
        if (key === '#guided-form') return form;
        if (!controls.has(key)) controls.set(key, makeControl(key));
        return controls.get(key);
      },
      addEventListener() {}, dispatchEvent() {}
    },
    FormData: class { get(name: string) { return name === 'goal' ? 'private-health-answer' : 'Online'; } },
    CustomEvent: class {}, window: {
      requestAnimationFrame() {}, open(url: string) { opened.push(url); },
      virada90SourceHandoff(url: string) { return whatsappWithSource(url, 'https://institutovivance.app/virada90/conhecer?gclid=click_123'); }
    }
  });
  const generic = controls.get('#talk-team')?.href;
  listeners.get('#jump-values:click')?.({});
  assert.equal(controls.get('#progress-label')?.textContent, 'Etapa 5 de 5');
  assert.equal(controls.get('#next')?.hidden, true);
  assert.equal(controls.get('#jump-values')?.hidden, true);
  listeners.get('#back:click')?.({});
  assert.equal(controls.get('#progress-label')?.textContent, 'Etapa 4 de 5');
  assert.equal(controls.get('#jump-values')?.hidden, false);
  listeners.get('#topic-select:change')?.({ target: { value: '5' } });
  assert.equal(controls.get('#talk-team')?.href, generic);
  listeners.get('#talk-team:click')?.({ preventDefault() {} });
  assert.equal(opened.length, 1);
  assert.match(decodeURIComponent(opened[0]), /private-health-answer/);
  assert.match(decodeURIComponent(opened[0]), /Online/);
  assert.match(new URL(opened[0]).searchParams.get('text') || '', /Origem do link: Google Ads/);
  assert.doesNotMatch(decodeURIComponent(opened[0]), /click_123/);
});

test('tags are included only by the two public campaign documents', () => {
  for (const page of ['index.html', 'conhecer.html']) {
    const code = readFileSync(new URL('../public/virada90/' + page, import.meta.url), 'utf8');
    assert.match(code, /type="module" src="\/virada90\/measurement\.js"/);
    assert.doesNotMatch(code, /GTM-W582L6XS|h-widget|fbevents/);
  }
  const appLayout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(appLayout, /measurement|googletagmanager|gtag/);
  assert.equal(GOOGLE.whatsapp, 'AW-818747876/zzjqCNb0r4wYEOSztIYD');
});

test('five-step completion is versioned and rejects obsolete topic numbers', () => {
  const f = fixture('https://institutovivance.app/virada90/conhecer');
  f.measurement.consent(true);
  f.measurement.viewStep(4);
  assert.equal(f.events().some(args => args[1] === 'virada90_presentation_complete'), false);
  f.measurement.viewStep(10);
  f.measurement.viewStep(5);
  f.measurement.viewStep(1);
  f.measurement.viewStep(5);
  const complete = f.events().filter(args => args[1] === 'virada90_presentation_complete');
  assert.equal(complete.length, 1);
  assert.deepEqual(complete[0][2], { send_to: GOOGLE.analytics, presentation_version: 'five_steps', step_count: 5 });
  assert.equal(f.events().some(args => args[1] === 'conversion'), false);
  assert.equal(f.events().filter(args => args[1] === 'virada90_step_view').every(args => (args[2] as Record<string, unknown>).presentation_version === 'five_steps'), true);
});
