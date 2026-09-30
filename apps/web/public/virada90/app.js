(() => {
  const button = document.getElementById('copy');
  const phone = document.getElementById('phone');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(phone.textContent);
      button.textContent = 'Número copiado';
      window.setTimeout(() => { button.textContent = 'Copiar número'; }, 2400);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(phone);
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      button.textContent = 'Número selecionado para copiar';
    }
  });
  button.setAttribute('aria-live', 'polite');
})();
