document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('[data-card-id]');
  if (!cards.length) return;

  const updateCard = (card, nextIndex) => {
    const slides = card.querySelectorAll('[data-slide-index]');
    const indicator = card.querySelector('[data-indicator]');
    if (!slides.length || !indicator) return;

    const total = slides.length;
    const index = ((nextIndex % total) + total) % total;
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
    });
    indicator.textContent = `${index + 1} / ${total}`;
    card.dataset.slideIndex = String(index);
  };

  cards.forEach((card) => {
    updateCard(card, 0);

    card.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl) return;
      const currentIndex = Number(card.dataset.slideIndex || '0');
      if (actionEl.dataset.action === 'prev') {
        updateCard(card, currentIndex - 1);
      }
      if (actionEl.dataset.action === 'next') {
        updateCard(card, currentIndex + 1);
      }
    });
  });
});
