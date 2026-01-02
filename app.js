// app.js - interactividad completa (abrir detalle, tabs, filtros exactos, selector de canal, galería)
document.addEventListener('DOMContentLoaded', function () {

  /* Abrir / cerrar detalle */
  const openButtons = document.querySelectorAll('[data-open]');
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open');
      const el = document.getElementById(id);
      if (!el) return;
      const hidden = el.hasAttribute('hidden');
      if (hidden) {
        el.removeAttribute('hidden');
        btn.textContent = 'Cerrar detalle';
      } else {
        el.setAttribute('hidden', '');
        btn.textContent = 'Abrir detalle';
      }
    });
  });

  /* Tabs internas por ticket */
  document.querySelectorAll('.ticket-detail').forEach(detail => {
    const tabs = detail.querySelectorAll('.tab');
    const panels = detail.querySelectorAll('.tabpanel');
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.hidden = true);
        tab.classList.add('active');
        const id = tab.getAttribute('aria-controls');
        const panel = detail.querySelector('#' + id);
        if (panel) panel.hidden = false;
      });
    });
  });

  /* Selector de canal dentro de la celda "Fuente del ticket" */
  document.querySelectorAll('.ticket-fuente').forEach(group => {
    const ticket = group.getAttribute('data-ticket');
    const buttons = Array.from(group.querySelectorAll('.view-btn'));

    // Inicial: asegurar que solo uno tenga aria-pressed true
    let anyPressed = buttons.some(b => b.getAttribute('aria-pressed') === 'true');
    if (!anyPressed && buttons[0]) {
      buttons[0].setAttribute('aria-pressed', 'true');
      buttons[0].classList.add('active');
    } else {
      buttons.forEach(b => {
        if (b.getAttribute('aria-pressed') === 'true') b.classList.add('active');
      });
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // radio behavior: desactivar todos en el mismo grupo
        buttons.forEach(b => {
          b.setAttribute('aria-pressed', 'false');
          b.classList.remove('active');
        });
        // activar el seleccionado
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('active');

        // Actualizar la vista de transcripción correspondiente
        const view = btn.getAttribute('data-view');
        const container = document.getElementById('view-' + ticket);
        if (!container) return;
        container.querySelectorAll('.channel').forEach(c => c.hidden = true);
        const target = container.querySelector('.channel.' + view);
        if (target) target.hidden = false;

        // Opcional: abrir la pestaña "Canal" automáticamente si existe
        const detail = document.getElementById('detail-' + ticket);
        if (detail) {
          const tabs = detail.querySelectorAll('.tab');
          const panels = detail.querySelectorAll('.tabpanel');
          tabs.forEach(t => t.classList.remove('active'));
          panels.forEach(p => p.hidden = true);
          const canalTab = Array.from(tabs).find(t => t.getAttribute('aria-controls') && t.getAttribute('aria-controls').toLowerCase().includes('canal'));
          if (canalTab) {
            canalTab.classList.add('active');
            const id = canalTab.getAttribute('aria-controls');
            const panel = detail.querySelector('#' + id);
            if (panel) panel.hidden = false;
          }
        }
      });

      // keyboard support: activate with Enter/Space
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  });

  /* Filtros y búsqueda (exacta) */
  const filterEstado = document.getElementById('filterEstado');
  const filterPrioridad = document.getElementById('filterPrioridad');
  const filterTipo = document.getElementById('filterTipo');
  const searchInput = document.getElementById('searchInput');
  const tickets = Array.from(document.querySelectorAll('.ticket-card'));

  function applyFilters() {
    const estado = filterEstado.value;
    const prioridad = filterPrioridad.value;
    const tipo = filterTipo.value;
    const query = searchInput.value.trim();
    tickets.forEach(t => {
      let visible = true;
      if (estado && t.dataset.estado !== estado) visible = false;
      if (prioridad && t.dataset.prioridad !== prioridad) visible = false;
      if (tipo && t.dataset.tipo !== tipo) visible = false;
      if (query) {
        const ticketCode = t.dataset.ticket || '';
        const name = t.querySelector('.meta') ? t.querySelector('.meta').textContent : '';
        if (!(query === ticketCode || name.includes(query))) visible = false;
      }
      t.style.display = visible ? '' : 'none';
    });
  }

  [filterEstado, filterPrioridad, filterTipo].forEach(el => el.addEventListener('change', applyFilters));
  searchInput.addEventListener('input', applyFilters);

  /* Galería / modal de evidencias */
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModal = document.getElementById('closeModal');
  document.querySelectorAll('.evidence-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-src');
      let content = '';
      if (src.includes('photo')) content = '<svg width="800" height="450"><rect width="100%" height="100%" fill="#e6eefc"></rect><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#0b3d91" font-size="24">Foto (placeholder)</text></svg>';
      else if (src.includes('screenshot')) content = '<svg width="800" height="450"><rect width="100%" height="100%" fill="#fff"></rect><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#333" font-size="20">Captura (placeholder)</text></svg>';
      else content = '<svg width="800" height="450"><rect width="100%" height="100%" fill="#fff7e6"></rect><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ff7a00" font-size="20">Log (placeholder)</text></svg>';
      modalBody.innerHTML = content;
      modal.setAttribute('aria-hidden', 'false');
    });
  });

  closeModal.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.setAttribute('aria-hidden', 'true'); });

  /* Cerrar modal con Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.getAttribute('aria-hidden') === 'false') modal.setAttribute('aria-hidden', 'true');
    }
  });

});
