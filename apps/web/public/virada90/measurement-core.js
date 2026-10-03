// Destinos públicos conferidos no container publicado do Instituto Guilherme Martins.
export const GOOGLE = Object.freeze({
  analytics: 'G-L8QMHVRV68',
  ads: 'AW-818747876',
  whatsapp: 'AW-818747876/zzjqCNb0r4wYEOSztIYD'
});

const campaignPath = /^\/virada90(?:\/conhecer)?\/?$/;
const attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
const consentDenied = {
  analytics_storage: 'denied', ad_storage: 'denied',
  ad_user_data: 'denied', ad_personalization: 'denied'
};

/** @param {string} input */
export function isPublicCampaign(input) {
  const url = new URL(input);
  return url.origin === 'https://institutovivance.app' && campaignPath.test(url.pathname);
}

/** Somente atribuição de campanha; nenhuma resposta, texto de WhatsApp ou identificador do app.
 * @param {string} input */
export function campaignUrl(input) {
  const source = new URL(input);
  const clean = new URL(source.origin + source.pathname);
  for (const key of attributionKeys) {
    const value = source.searchParams.get(key);
    if (value && value.length <= 200 && /^[\p{L}\p{N} ._+\-[\]()|/]+$/u.test(value)) {
      clean.searchParams.set(key, value);
    }
  }
  return clean.href;
}

/** Não enviar uma URL de prontuário nem parâmetros do site de origem.
 * @param {string} input */
export function campaignReferrer(input) {
  if (!input) return '';
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (url.hostname === 'institutovivance.app') {
      return campaignPath.test(url.pathname) ? url.origin + url.pathname : '';
    }
    return url.origin + '/';
  } catch { return ''; }
}

/** @param {{url: string, referrer?: string, command: (...args: unknown[]) => void, load: () => void}} options */
export function createMeasurement({ url, referrer = '', command, load }) {
  const allowed = isPublicCampaign(url);
  const guided = new URL(url).pathname.replace(/\/$/, '').endsWith('/conhecer');
  let enabled = false;
  let configured = false;
  let step = 1;
  let lastStep = 0;
  let completed = false;

  // Esta fila é local. Nenhum SDK ou pedido ao Google antes do aceite.
  if (allowed) command('consent', 'default', consentDenied);

  const event = (/** @type {string} */ name, /** @type {Record<string, unknown>} */ data = {}) => {
    if (allowed && enabled) command('event', name, { send_to: GOOGLE.analytics, ...data });
  };

  const reportStep = () => {
    if (!enabled || !guided || step === lastStep) return;
    lastStep = step;
    event('virada90_step_view', { step_number: step });
    if (step === 10 && !completed) {
      completed = true;
      event('virada90_presentation_complete');
    }
  };

  return {
    /** @param {boolean} granted */
    consent(granted) {
      if (!allowed || enabled === granted) return;
      enabled = granted;
      command('consent', 'update', granted ? {
        analytics_storage: 'granted', ad_storage: 'granted',
        ad_user_data: 'granted', ad_personalization: 'denied'
      } : consentDenied);
      if (!granted || configured) return;
      try { load(); } catch { enabled = false; return; }
      configured = true;
      command('js', new Date());
      const page = {
        page_location: campaignUrl(url), page_referrer: campaignReferrer(referrer),
        page_title: guided ? 'Conheça o Virada 90' : 'Virada 90',
        cookie_path: '/virada90', allow_google_signals: false,
        allow_ad_personalization_signals: false, send_page_view: false
      };
      command('config', GOOGLE.analytics, page);
      command('config', GOOGLE.ads, page);
      event('page_view', page);
      if (guided) event('virada90_presentation_start');
      reportStep();
    },
    /** @param {number} number */
    viewStep(number) {
      if (!Number.isInteger(number) || number < 1 || number > 10) return;
      step = number;
      reportStep();
    },
    /** Um clique abre o WhatsApp; não comprova mensagem recebida.
     * @param {string} position */
    whatsapp(position) {
      if (!allowed || !enabled || !['landing_presencial', 'landing_online', 'presentation'].includes(position)) return;
      event('whatsapp_click', { cta_position: position });
      command('event', 'conversion', { send_to: GOOGLE.whatsapp });
    }
  };
}
