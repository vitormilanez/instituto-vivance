import { campaignUrl, createMeasurement, GOOGLE, isPublicCampaign } from './measurement-core.js';
import { clickFromCampaignUrl, whatsappWithReference } from './handoff-core.js';

const preferenceCookie = 'virada90_measurement_v1';
const referenceStorageKey = 'virada90_conversion_references_v1';
const saved = document.cookie.split('; ').find(value => value.startsWith(preferenceCookie + '='))?.split('=')[1];
let sdkLoaded = false;
let receivedMeasurementEnabled = false;

if (isPublicCampaign(window.location.href)) {
  fetch('/api/virada90/opportunity', { cache: 'no-store', credentials: 'same-origin' })
    .then(response => response.ok ? response.json() : null)
    .then(status => { receivedMeasurementEnabled = status?.enabled === true; })
    .catch(() => {});
}

const hasConsent = () => document.cookie.split('; ').some(value => value === `${preferenceCookie}=granted`);

const storedReferences = () => {
  try {
    const values = JSON.parse(window.localStorage.getItem(referenceStorageKey) || '[]');
    return Array.isArray(values) ? values.filter(value =>
      value && typeof value === 'object' &&
      typeof value.reference === 'string' && /^V90-[A-HJ-NP-Z2-9]{26}$/.test(value.reference) &&
      typeof value.expiresAt === 'string' && Date.parse(value.expiresAt) > Date.now()
    ) : [];
  } catch { return []; }
};

const rememberReference = (reference, expiresAt) => {
  try {
    if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) return false;
    const values = [...storedReferences().filter(value => value.reference !== reference), { reference, expiresAt }];
    window.localStorage.setItem(referenceStorageKey, JSON.stringify(values));
    return true;
  } catch { return false; }
};

const canKeepRevocationReference = () => {
  try {
    window.localStorage.setItem('virada90_storage_check', '1');
    window.localStorage.removeItem('virada90_storage_check');
    return true;
  } catch { return false; }
};

const revokeReferences = async () => {
  const references = storedReferences();
  if (!references.length) return;
  const results = await Promise.allSettled(references.map(({ reference }) => fetch('/api/virada90/opportunity', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }), credentials: 'same-origin',
    keepalive: true, signal: AbortSignal.timeout(2500)
  })));
  const remaining = references.filter((_, index) => results[index].status !== 'fulfilled' || !results[index].value.ok);
  try { window.localStorage.setItem(referenceStorageKey, JSON.stringify(remaining)); } catch {}
};

const adClick = () => clickFromCampaignUrl(window.location.href);
const canMeasureReceipt = () => receivedMeasurementEnabled && hasConsent() && canKeepRevocationReference() && Boolean(adClick());

const openTrackedHandoff = sourceUrl => {
  const popup = window.open('about:blank', '_blank');
  if (popup) {
    popup.opener = null;
    popup.document.title = 'Abrindo WhatsApp';
    popup.document.body.textContent = 'Abrindo WhatsApp…';
  }
  void (async () => {
    let destination = sourceUrl;
    try {
      const response = await fetch('/api/virada90/opportunity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ click: adClick() }), credentials: 'same-origin',
        cache: 'no-store', signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const result = await response.json();
        const candidate = whatsappWithReference(sourceUrl, result.reference);
        if (rememberReference(result.reference, result.expiresAt)) destination = candidate;
        else {
          void fetch('/api/virada90/opportunity', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: result.reference }), credentials: 'same-origin', keepalive: true
          }).catch(() => {});
        }
      }
    } catch { /* Attribution cannot block the conversation. */ }
    if (popup && !popup.closed) popup.location.replace(destination);
    else window.location.assign(destination);
  })();
};

const command = (...args) => {
  window.dataLayer = window.dataLayer || [];
  // gtag consome um objeto Arguments, inclusive antes do carregamento do SDK.
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag(...args);
};

const measurement = createMeasurement({
  url: window.location.href,
  referrer: document.referrer,
  command,
  load() {
    const safe = new URL(campaignUrl(window.location.href));
    safe.hash = window.location.hash;
    window.history.replaceState(null, '', safe.href);
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE.analytics}`;
    document.head.append(script);
    sdkLoaded = true;
  }
});

const banner = document.createElement('section');
banner.className = 'measurement-banner';
banner.setAttribute('aria-label', 'Preferências de cookies de medição');
banner.innerHTML = `<div><strong>Podemos medir as visitas?</strong>
  <p>Usamos Google Analytics e Google Ads para medir visitas e cliques no WhatsApp.
  Quando a medição de conversas estiver ativa, um código curto na mensagem poderá relacionar
  seu clique no anúncio à primeira mensagem recebida pela equipe. Não enviamos seu texto,
  telefone ou respostas sobre saúde ao Google. Você pode mudar sua opção abaixo.</p></div>
  <div class="measurement-actions"><button type="button" data-consent="denied">Continuar sem medição</button>
  <button type="button" data-consent="granted">Aceitar medição</button></div>`;
banner.hidden = saved === 'granted' || saved === 'denied';

const preferences = document.createElement('div');
preferences.className = 'measurement-preferences';
const reopen = document.createElement('button');
reopen.type = 'button';
reopen.textContent = 'Preferências de cookies';
reopen.addEventListener('click', () => {
  banner.hidden = false;
  banner.querySelector('button').focus();
});
preferences.append(reopen);
document.body.append(preferences, banner);

banner.addEventListener('click', async event => {
  const button = event.target.closest('button[data-consent]');
  if (!button) return;
  const choice = button.dataset.consent;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${preferenceCookie}=${choice}; Path=/virada90; Max-Age=15552000; SameSite=Lax${secure}`;
  banner.hidden = true;
  const withdrawing = choice === 'denied' && sdkLoaded;
  window[`ga-disable-${GOOGLE.analytics}`] = choice === 'denied';
  measurement.consent(choice === 'granted');
  if (choice === 'denied') await revokeReferences();
  if (withdrawing) {
    // Recarregar remove os listeners do fornecedor, inclusive medição automática.
    // Somente cookies da campanha; não tocar em cookies de autenticação.
    for (const entry of document.cookie.split('; ')) {
      const name = entry.split('=')[0];
      if (!/^_ga(?:_|$)|^_gcl_/.test(name)) continue;
      for (const domain of ['', `; Domain=${window.location.hostname}`]) {
        document.cookie = `${name}=; Path=/virada90; Max-Age=0${domain}${secure}`;
      }
    }
    window.location.reload();
  }
});

// Preservar somente a atribuição aprovada ao seguir da landing para a apresentação.
for (const link of document.querySelectorAll('a[href]')) {
  const target = new URL(link.href, window.location.href);
  if (target.origin !== window.location.origin || !/^\/virada90(?:\/conhecer)?\/?$/.test(target.pathname)) continue;
  const attribution = new URL(campaignUrl(window.location.href)).search;
  if (attribution) { target.search = attribution; link.href = target.href; }
}

document.addEventListener('virada90:step', event => measurement.viewStep(event.detail.step));
const initialStep = Number(document.querySelector('.step.active[data-step]')?.dataset.step || 1);
measurement.viewStep(initialStep);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || !event.isTrusted) return;
  if (new URL(link.href).hostname !== 'wa.me') return;
  const position = link.classList.contains('main') ? 'landing_presencial' : 'landing_online';
  measurement.whatsapp(position);
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (canMeasureReceipt()) {
    event.preventDefault();
    openTrackedHandoff(link.href);
  }
});
document.addEventListener('virada90:handoff', event => {
  measurement.whatsapp('presentation');
  if (!canMeasureReceipt()) return;
  event.preventDefault();
  openTrackedHandoff(event.detail.url);
});
if (saved === 'granted' && isPublicCampaign(window.location.href)) measurement.consent(true);
if (saved === 'denied') void revokeReferences();
