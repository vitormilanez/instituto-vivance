const referencePattern = /^V90-[A-HJ-NP-Z2-9]{26}$/;
const clickPattern = /^[A-Za-z0-9_+./=~-]{1,200}$/;

/** Only a Google ad-click identifier is needed for an offline conversion. */
export function clickFromCampaignUrl(input) {
  const url = new URL(input);
  for (const kind of ['gclid', 'gbraid', 'wbraid']) {
    const value = url.searchParams.get(kind);
    if (value && clickPattern.test(value)) return { kind, value };
  }
  return null;
}

/** Keep the patient's editable text intact and append only an opaque reference. */
export function whatsappWithReference(input, reference) {
  if (!referencePattern.test(reference)) throw new Error('Invalid conversation reference');
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.hostname !== 'wa.me' || url.pathname !== '/5518997551234') {
    throw new Error('Unexpected WhatsApp destination');
  }
  const message = url.searchParams.get('text');
  if (!message || message.length > 2000) throw new Error('Invalid WhatsApp message');
  url.searchParams.set('text', `${message}\nCódigo de referência: ${reference}`);
  return url.href;
}
