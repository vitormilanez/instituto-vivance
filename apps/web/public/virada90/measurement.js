import { campaignUrl, createMeasurement, GOOGLE, isPublicCampaign, whatsappWithSource } from './measurement-core.js';

const preferenceCookie = 'virada90_measurement_v1';
const saved = document.cookie.split('; ').find(value => value.startsWith(preferenceCookie + '='))?.split('=')[1];
let sdkLoaded = false;
let consentGranted = saved === 'granted';

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
  Suas escolhas sobre saúde não são enviadas ao Google. Ao aceitar, a mensagem ao WhatsApp pode indicar se você veio de um anúncio. Você pode mudar sua opção abaixo.</p></div>
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

banner.addEventListener('click', event => {
  const button = event.target.closest('button[data-consent]');
  if (!button) return;
  const choice = button.dataset.consent;
  consentGranted = choice === 'granted';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${preferenceCookie}=${choice}; Path=/virada90; Max-Age=15552000; SameSite=Lax${secure}`;
  banner.hidden = true;
  const withdrawing = choice === 'denied' && sdkLoaded;
  window[`ga-disable-${GOOGLE.analytics}`] = choice === 'denied';
  measurement.consent(choice === 'granted');
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
window.virada90SourceHandoff = handoff =>
  consentGranted && isPublicCampaign(window.location.href)
    ? whatsappWithSource(handoff, window.location.href) : handoff;
const initialStep = Number(document.querySelector('.step.active[data-step]')?.dataset.step || 1);
measurement.viewStep(initialStep);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href], #talk-team');
  if (!link || !event.isTrusted) return;
  if (link.id === 'talk-team') { measurement.whatsapp('presentation'); return; }
  if (new URL(link.href).hostname !== 'wa.me') return;
  const position = link.classList.contains('main') ? 'landing_presencial' : 'landing_online';
  measurement.whatsapp(position);
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const handoff = window.virada90SourceHandoff(link.href);
  if (handoff === link.href) return;
  event.preventDefault();
  window.open(handoff, '_blank', 'noopener,noreferrer');
});
if (saved === 'granted' && isPublicCampaign(window.location.href)) measurement.consent(true);
