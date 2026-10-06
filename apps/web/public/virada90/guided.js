(() => {
  const form = document.querySelector('#guided-form');
  const steps = [...form.querySelectorAll('.step')];
  const back = document.querySelector('#back');
  const next = document.querySelector('#next');
  const topicSelect = document.querySelector('#topic-select');
  const progressLabel = document.querySelector('#progress-label');
  const progressTitle = document.querySelector('#progress-title');
  const progressTrack = document.querySelector('#progress-track');
  const progressBar = document.querySelector('#progress-bar');
  const talkTeam = document.querySelector('#talk-team');
  const interestSummary = document.querySelector('#interest-summary');
  const presentation = document.querySelector('#presentation');
  const total = steps.length;
  let current = 1;
  let handoffUrl = 'https://wa.me/5518997551234?text=Ol%C3%A1%21%20Quero%20saber%20mais%20sobre%20o%20Virada%2090%20do%20Dr.%20Guilherme%20Martins.';

  const selectedValue = name => new FormData(form).get(name)?.trim() || '';

  const updateHandoff = () => {
    const goal = selectedValue('goal');
    const modality = selectedValue('modality');
    const preferences = [
      goal ? `Objetivo: ${goal}` : '',
      modality ? `Formato de interesse: ${modality}` : ''
    ].filter(Boolean);

    interestSummary.textContent = preferences.length
      ? `Sua conversa pode começar por: ${preferences.join(' · ')}.`
      : 'Você pode conversar com a equipe sem definir objetivo ou formato agora.';

    const message = [
      'Olá! Quero saber mais sobre o Virada 90 do Dr. Guilherme Martins.',
      goal ? `Meu objetivo: ${goal}.` : '',
      modality ? `Meu formato de interesse: ${modality}.` : ''
    ].filter(Boolean).join('\n');

    // A mensagem fica fora do DOM: a medição automática não recebe o objetivo.
    // O botão só abre a mensagem na ação explícita da pessoa.
    handoffUrl = `https://wa.me/5518997551234?text=${encodeURIComponent(message)}`;
  };

  const keepToolsVisible = () => {
    const bounds = presentation.getBoundingClientRect();
    if (bounds.top < 0 || bounds.top > window.innerHeight * 0.55) {
      presentation.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  const render = ({ moveFocus = true } = {}) => {
    const activeStep = steps[current - 1];
    const title = activeStep.dataset.title;

    steps.forEach((step, index) => {
      const active = index === current - 1;
      step.hidden = !active;
      step.classList.toggle('active', active);
    });

    progressLabel.textContent = `Etapa ${current} de ${total}`;
    progressTitle.textContent = title;
    progressBar.style.transform = `scaleX(${current / total})`;
    progressTrack.setAttribute('aria-valuenow', String(current));
    progressTrack.setAttribute('aria-valuetext', `Etapa ${current} de ${total}: ${title}`);
    topicSelect.value = String(current);
    back.disabled = current === 1;
    next.hidden = current === total;
    next.textContent = current === total - 1 ? 'Ver valores e conversar' : 'Continuar';

    if (current === total) updateHandoff();
    document.dispatchEvent(new CustomEvent('virada90:step', { detail: { step: current } }));

    if (moveFocus) {
      window.requestAnimationFrame(() => {
        activeStep.querySelector('h1')?.focus({ preventScroll: true });
        keepToolsVisible();
      });
    }
  };

  const goTo = step => {
    const destination = Math.min(total, Math.max(1, Number(step)));
    if (!Number.isFinite(destination) || destination === current) return;
    current = destination;
    render();
  };

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', () => {
    if (current === total) updateHandoff();
  });
  next.addEventListener('click', () => goTo(current + 1));
  back.addEventListener('click', () => goTo(current - 1));
  topicSelect.addEventListener('change', event => goTo(event.target.value));
  talkTeam.addEventListener('click', event => {
    event.preventDefault();
    const handoff = new CustomEvent('virada90:handoff', {
      cancelable: true,
      detail: { url: handoffUrl }
    });
    document.dispatchEvent(handoff);
    if (handoff.defaultPrevented) return;
    window.open(handoffUrl, '_blank', 'noopener,noreferrer');
  });

  document.addEventListener('keydown', event => {
    const target = event.target;
    const editingControl = target.matches('input, select, summary, a, button');
    if (editingControl || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' && current < total) {
      event.preventDefault();
      goTo(current + 1);
    }
    if (event.key === 'ArrowLeft' && current > 1) {
      event.preventDefault();
      goTo(current - 1);
    }
  });

  render({ moveFocus: false });
})();
