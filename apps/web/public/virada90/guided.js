(() => {
  const form = document.querySelector('#guided-form');
  const steps = [...form.querySelectorAll('.step')];
  const back = document.querySelector('#back');
  const next = document.querySelector('#next');
  const error = document.querySelector('#form-error');
  const contact = document.querySelector('#contact');
  const contactLabel = document.querySelector('#contact-label');
  const paymentStatus = document.querySelector('#payment-status');
  const teamLink = document.querySelector('#talk-team');
  const offers = {
    presencial: { label: 'Presencial em Presidente Prudente', includes: '3 meses · Aplicações e medições', price: '12× de R$ 1.000 · Total: R$ 12.000', url: null },
    online: { label: 'Online', includes: 'Acompanhamento por 3 meses + plano alimentar', price: 'R$ 6.500 no total, em até 12×', url: null }
  };
  let current = 1;
  const value = name => new FormData(form).get(name)?.trim() || '';
  const selectedOffer = () => value('modality') === offers.presencial.label ? offers.presencial : value('modality') === 'Online' ? offers.online : null;
  const setError = message => { error.textContent = message; error.hidden = !message; };
  const clearInvalid = () => form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  const updateContact = () => {
    const email = value('channel') === 'E-mail';
    contact.type = email ? 'email' : 'tel';
    contact.autocomplete = email ? 'email' : 'tel';
    contactLabel.firstChild.textContent = email ? 'E-mail' : 'WhatsApp';
    contact.placeholder = email ? 'voce@exemplo.com' : '(00) 00000-0000';
  };
  form.addEventListener('change', event => { if (event.target.name === 'channel') updateContact(); clearInvalid(); setError(''); });
  form.addEventListener('input', () => { clearInvalid(); setError(''); });
  // No form navigation: answers stay in memory until the person chooses an external handoff.
  form.addEventListener('submit', event => event.preventDefault());
  const loadCheckout = async () => {
    try {
      const response = await fetch('/virada90/checkout.json', { cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      for (const key of Object.keys(offers)) {
        const configured = config.offers?.[key]?.url;
        if (typeof configured !== 'string') continue;
        const url = new URL(configured);
        if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) offers[key].url = url.href;
      }
    } catch { /* An absent checkout keeps the no-charge preview available. */ }
  };
  loadCheckout();
  const validate = () => {
    clearInvalid(); setError('');
    let field, message;
    if (current === 1 && !value('goal')) { field = form.querySelector('[name="goal"]'); message = 'Escolha seu objetivo para continuar.'; }
    if (current === 3 && !value('modality')) { field = form.querySelector('[name="modality"]'); message = 'Escolha um formato para continuar.'; }
    if (current === 5) {
      if (!value('name')) { field = form.elements.namedItem('name'); message = 'Informe seu nome para continuar.'; }
      else if (!value('channel')) { field = form.querySelector('[name="channel"]'); message = 'Escolha como prefere receber uma resposta.'; }
      else if (value('channel') === 'E-mail' && (!value('contact') || !contact.checkValidity())) { field = contact; message = 'Informe um e-mail válido.'; }
      else if (value('channel') === 'WhatsApp' && !/^(?:55)?[1-9]{2}[0-9]{8,9}$/.test(value('contact').replace(/[\s()+.-]/g, ''))) { field = contact; message = 'Informe um WhatsApp válido com DDD.'; }
    }
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); setError(message); return false; }
    return true;
  };
  const whatsappMessage = () => ['Olá! Conheci o Virada 90 do Dr. Guilherme Martins.', `Nome: ${value('name')}`, `Objetivo: ${value('goal')}`, `Formato: ${value('modality')}`, selectedOffer() ? `Programa: ${selectedOffer().price}` : '', `Preferência de resposta: ${value('channel')} (${value('contact')})`, value('question') ? `Pergunta geral: ${value('question')}` : ''].filter(Boolean).join('\n');
  const summary = () => {
    const items = [['Objetivo', value('goal')], ['Formato', value('modality')], ['Nome', value('name')], [value('channel') || 'Contato', value('contact')], ['Pergunta', value('question') || 'Nenhuma pergunta adicionada']];
    document.querySelector('#summary').replaceChildren(...items.map(([label, item]) => {
      const row = document.createElement('div'); const term = document.createElement('dt'); const description = document.createElement('dd');
      term.textContent = label; description.textContent = item; row.append(term, description); return row;
    }));
    const offer = selectedOffer();
    const container = document.querySelector('#selected-offer');
    container.replaceChildren();
    if (offer) {
      const heading = document.createElement('strong'); heading.textContent = offer.label;
      const includes = document.createElement('p'); includes.textContent = offer.includes;
      const price = document.createElement('b'); price.textContent = offer.price;
      container.append(heading, includes, price);
    } else container.textContent = 'Ainda em dúvida sobre o formato? A equipe ajuda você a escolher.';
    teamLink.href = `https://wa.me/5518997551234?text=${encodeURIComponent(whatsappMessage())}`;
  };
  const render = () => {
    steps.forEach(step => { const active = Number(step.dataset.step) === current; step.hidden = !active; step.classList.toggle('active', active); });
    document.querySelector('#progress-label').textContent = `Etapa ${current} de 6`;
    document.querySelector('#progress-bar').style.width = `${(current / 6) * 100}%`;
    back.disabled = current === 1;
    next.textContent = current === 6 ? 'Pagar agora' : 'Continuar';
    next.hidden = current === 6 && !selectedOffer();
    paymentStatus.hidden = true;
    if (current === 6) summary();
    setError('');
    window.requestAnimationFrame(() => steps[current - 1].querySelector('h1')?.focus());
  };
  next.addEventListener('click', () => {
    if (current < 6) { if (!validate()) return; current += 1; render(); return; }
    const offer = selectedOffer();
    if (offer?.url) { window.location.assign(offer.url); return; }
    paymentStatus.hidden = false;
    paymentStatus.textContent = 'O checkout deste formato ainda será conectado. Nenhuma cobrança é feita aqui. Você pode falar com a equipe para combinar os próximos passos.';
    paymentStatus.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });
  back.addEventListener('click', () => { if (current > 1) { current -= 1; render(); } });
  render();
})();
