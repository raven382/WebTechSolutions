// app.js - renderizado dinamico y eventos delegados para tickets
document.addEventListener('DOMContentLoaded', () => {
  const ticketsList = document.getElementById('ticketsList');
  if (!ticketsList) return;
  const filterEstado = document.getElementById('filterEstado');
  const filterPrioridad = document.getElementById('filterPrioridad');
  const filterTipo = document.getElementById('filterTipo');
  const searchInput = document.getElementById('searchInput');
  const layout = document.querySelector('.content-grid');
  const rightPane = document.getElementById('rightPane');
  const ticketSheet = document.getElementById('ticketSheet');
  const ticketTabs = document.getElementById('ticketTabs');
  const tabsPlaceholder = document.getElementById('tabsPlaceholder');
  const backToList = document.getElementById('backToList');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModal = document.getElementById('closeModal');
  if (!layout || !rightPane || !ticketSheet || !ticketTabs || !tabsPlaceholder || !backToList || !modal || !modalBody || !closeModal) return;
  let ticketsData = [];
  let selectedTicketId = null;

  const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const renderSegments = (segments) => {
    if (!segments || !segments.length) return '';
    return segments.map((seg) => {
      if (typeof seg === 'string') return escapeHtml(seg);
      if (seg.br) return '<br>';
      const text = escapeHtml(seg.text || '');
      if (seg.strong) return `<strong>${text}</strong>`;
      if (seg.code) return `<code>${text}</code>`;
      if (seg.em) return `<em>${text}</em>`;
      return text;
    }).join('');
  };

  const renderListItem = (item) => {
    if (typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
    if (!item) return '<li></li>';
    const content = item.segments ? renderSegments(item.segments) : escapeHtml(item.text || '');
    const subitems = item.subitems ? renderList(item.subitems, false) : '';
    return `<li>${content}${subitems}</li>`;
  };

  const renderList = (items, ordered) => {
    if (!items || !items.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    const body = items.map((item) => renderListItem(item)).join('');
    return `<${tag}>${body}</${tag}>`;
  };

  const renderBlocks = (blocks) => {
    if (!blocks || !blocks.length) return '';
    return blocks.map((block) => {
      if (block.type === 'title') {
        return `<p><strong>${escapeHtml(block.text || '')}</strong></p>`;
      }
      if (block.type === 'paragraph') {
        return `<p>${block.segments ? renderSegments(block.segments) : escapeHtml(block.text || '')}</p>`;
      }
      if (block.type === 'list') {
        return renderList(block.items || [], false);
      }
      if (block.type === 'ordered') {
        return renderList(block.items || [], true);
      }
      return '';
    }).join('');
  };

  const renderEmailBody = (paragraphs) => {
    if (!paragraphs || !paragraphs.length) return '';
    return paragraphs.map((p) => {
      if (typeof p === 'string') return `<p>${escapeHtml(p)}</p>`;
      if (p && p.segments) return `<p>${renderSegments(p.segments)}</p>`;
      return `<p>${escapeHtml(p && p.text ? p.text : '')}</p>`;
    }).join('');
  };

  const renderEmail = (email) => {
    return `
      <div class="ticket-email">
        <div class="email-header">
          <p><strong>De:</strong> ${escapeHtml(email.de)}</p>
          <p><strong>Para:</strong> ${escapeHtml(email.para)}</p>
          <p><strong>Asunto:</strong> ${escapeHtml(email.asunto)}</p>
        </div>
        <div class="email-body">
          ${renderEmailBody(email.cuerpo)}
        </div>
      </div>
    `;
  };

  const renderFuente = (ticket) => {
    const canales = ticket.canales;
    if (!canales) return '';
    const defaultView = canales.default || 'correo';
    const buttons = (canales.botones || []).map((btn) => {
      const pressed = btn.view === defaultView ? 'true' : 'false';
      return `<button class="view-btn" data-action="switch-channel" data-view="${escapeHtml(btn.view)}" data-ticket="${escapeHtml(ticket.id)}" aria-pressed="${pressed}" role="radio">${escapeHtml(btn.label)}</button>`;
    }).join('');
    const content = `<strong>Fuente del ticket:</strong><div class="ticket-fuente" data-ticket="${escapeHtml(ticket.id)}" role="radiogroup" aria-label="Seleccionar canal de ingreso">${buttons}</div>`;
    if (canales.fuentePlacement === 'before' || canales.fuentePlacement === 'inside') {
      return `<tr><td colspan="${canales.fuenteColspan || 3}">${content}</td></tr>`;
    }
    return content;
  };

  const renderCorreo = (ticket) => {
    const correo = ticket.canales.correo;
    if (!correo) return '';
    const hilos = correo.hilos || [];
    const defaultView = ticket.canales.default || 'correo';
    return `
      <div class="channel correo"${defaultView === 'correo' ? '' : ' hidden'}>
        ${correo.titulo ? `<h5>${escapeHtml(correo.titulo)}</h5>` : ''}
        ${hilos.map((email, index) => `${renderEmail(email)}${index < hilos.length - 1 ? '<hr>' : ''}`).join('')}
      </div>
    `;
  };

  const buildDatetime = (ticket, entry) => {
    if (entry.datetime) return entry.datetime;
    if (!ticket.fechaISO || !entry.t) return '';
    const date = ticket.fechaISO.split('T')[0];
    const time = entry.t.length === 5 ? `${entry.t}:00` : entry.t;
    return `${date}T${time}`;
  };

  const renderLogTime = (ticket, entry) => {
    if (!entry.t) return '';
    const timeLabel = escapeHtml(entry.t);
    const datetime = buildDatetime(ticket, entry);
    if (!datetime) return `<time class="log-time">${timeLabel}</time>`;
    return `<time class="log-time" datetime="${escapeHtml(datetime)}">${timeLabel}</time>`;
  };

  const renderLogText = (text) => {
    if (Array.isArray(text)) {
      return text.map((line) => escapeHtml(line)).join('<br>');
    }
    return escapeHtml(text || '');
  };

  const renderChat = (ticket) => {
    const chat = ticket.canales.chat;
    if (!chat) return '';
    const log = chat.log || [];
    const defaultView = ticket.canales.default || 'correo';
    return `
      <div class="channel chat"${defaultView === 'chat' ? '' : ' hidden'}>
        ${chat.titulo ? `<h5>${escapeHtml(chat.titulo)}</h5>` : ''}
        ${log.map((entry) => {
          const timeEl = renderLogTime(ticket, entry);
          const body = renderLogText(entry.text);
          return `<div class="chat-msg">${timeEl}<strong>${escapeHtml(entry.who)}:</strong> ${body}</div>`;
        }).join('')}
      </div>
    `;
  };

  const renderCallEntry = (ticket, entry) => {
    const timeEl = renderLogTime(ticket, entry);
    const body = renderLogText(entry.text);
    return `<p class="call-line">${timeEl}<strong>${escapeHtml(entry.who || '')}:</strong><br>${body}</p>`;
  };

  const renderLlamada = (ticket) => {
    const llamada = ticket.canales.llamada;
    if (!llamada) return '';
    const log = llamada.log || [];
    const defaultView = ticket.canales.default || 'correo';
    return `
      <div class="channel llamada"${defaultView === 'llamada' ? '' : ' hidden'}>
        ${llamada.titulo ? `<h5>${escapeHtml(llamada.titulo)}</h5>` : ''}
        <div class="call-log">
          ${log.map((entry) => renderCallEntry(ticket, entry)).join('')}
        </div>
      </div>
    `;
  };

  const renderChannels = (ticket) => {
    const canales = ticket.canales;
    if (!canales) return '';
    const fuente = renderFuente(ticket);
    const channelView = `
      <div class="channel-view" id="view-${escapeHtml(ticket.id)}">
        ${canales.fuentePlacement === 'inside' ? fuente : ''}
        ${renderCorreo(ticket)}
        ${renderChat(ticket)}
        ${renderLlamada(ticket)}
      </div>
    `;
    return `
      <h4>Canal de ingreso</h4>
      <p>${escapeHtml(canales.ayuda || '')}</p>
      ${canales.fuentePlacement === 'before' ? fuente : ''}
      ${channelView}
    `;
  };

  const renderEvidencias = (ticket) => {
    const evidencias = ticket.evidencias || [];
    const galleryAttrs = ticket.evidenciasAriaLabel ? ` aria-label="${escapeHtml(ticket.evidenciasAriaLabel)}"` : '';
    const items = evidencias.map((item, index) => {
      const thumb = item.thumb || {};
      const viewBox = thumb.viewBox ? ` viewBox="${escapeHtml(thumb.viewBox)}"` : '';
      const role = thumb.role ? ` role="${escapeHtml(thumb.role)}"` : '';
      const ariaHidden = thumb.ariaHidden ? ' aria-hidden="true"' : '';
      const fontSize = thumb.fontSize ? ` font-size="${thumb.fontSize}"` : '';
      return `
        <button class="evidence-thumb" data-action="open-evidence" data-src="${escapeHtml(item.src)}" aria-label="${escapeHtml(item.titulo || `Evidencia ${index + 1}`)}">
          <svg width="${thumb.width || 320}" height="${thumb.height || 180}"${viewBox}${role}${ariaHidden}>
            <rect width="100%" height="100%" fill="${escapeHtml(thumb.fill || '#fff')}"></rect>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${escapeHtml(thumb.textColor || '#333')}"${fontSize}>${escapeHtml(thumb.text || '')}</text>
          </svg>
        </button>
      `;
    }).join('');
    const logSample = ticket.logSample
      ? `<div class="log-sample">${ticket.logSample.titulo ? `<h5>${escapeHtml(ticket.logSample.titulo)}</h5>` : ''}<pre><code>${escapeHtml(ticket.logSample.contenido || '')}</code></pre></div>`
      : '';
    return `<h4>Evidencias</h4><div class="gallery"${galleryAttrs}>${items}</div>${logSample}`;
  };

  const renderPanel = (ticket, tab) => {
    const panelId = `panel-${ticket.id}-${tab.key}`;
    const isResumen = tab.key === 'resumen';
    let content = '';
    let empty = false;

    switch (tab.key) {
      case 'resumen':
        content = `<h4>Resumen</h4><p>${escapeHtml(ticket.resumen || '')}</p>`;
        break;
      case 'canal':
        content = renderChannels(ticket);
        break;
      case 'registro':
        if (ticket.registro && ticket.registro.length) {
          content = `<h4>Registro de atención</h4>${renderList(ticket.registro, true)}`;
        } else {
          empty = true;
        }
        break;
      case 'comunicacion':
        if (ticket.comunicacion) {
          content = `<h4>Gestión de la comunicación</h4><p>${escapeHtml(ticket.comunicacion)}</p>`;
        } else {
          empty = true;
        }
        break;
      case 'diagnostico':
        if (ticket.diagnostico) {
          content = `<h4>Diagnóstico</h4><p>${escapeHtml(ticket.diagnostico)}</p>`;
        } else {
          empty = true;
        }
        break;
      case 'acciones':
        if (ticket.acciones && ticket.acciones.length) {
          content = `<h4>Acciones realizadas</h4>${renderList(ticket.acciones, false)}`;
        } else {
          empty = true;
        }
        break;
      case 'evidencias':
        content = renderEvidencias(ticket);
        break;
      case 'tiempo':
        if (ticket.tiempoTitulo || ticket.tiempoTexto) {
          content = `<h4>${escapeHtml(ticket.tiempoTitulo || 'Tiempo')}</h4><p>${escapeHtml(ticket.tiempoTexto || '')}</p>`;
        } else {
          empty = true;
        }
        break;
      default:
        empty = true;
        break;
    }

    const hiddenAttr = isResumen ? '' : ' hidden';
    const emptyAttr = empty ? ' data-empty="true"' : '';
    return `<section id="${escapeHtml(panelId)}" class="tabpanel" role="tabpanel"${hiddenAttr}${emptyAttr}>${content}</section>`;
  };

  const renderTicketCard = (ticket) => {
    const dataTipo = ticket.tipoFiltro || ticket.tipo;
    return `
      <article class="ticket-card" data-ticket="${escapeHtml(ticket.id)}" data-estado="${escapeHtml(ticket.estado)}" data-prioridad="${escapeHtml(ticket.prioridad)}" data-tipo="${escapeHtml(dataTipo)}" data-title="${escapeHtml(ticket.titulo)}" data-cliente="${escapeHtml(ticket.cliente && ticket.cliente.nombre ? ticket.cliente.nombre : '')}">
        <header class="ticket-header">
          <div>
            <h3>${escapeHtml(ticket.id)} — ${escapeHtml(ticket.titulo)}</h3>
            <p class="meta">${escapeHtml(ticket.meta || '')}</p>
          </div>
          <div class="ticket-actions">
            <button class="btn small" type="button" data-action="select-ticket" data-ticket="${escapeHtml(ticket.id)}">Ver detalle</button>
          </div>
        </header>
      </article>
    `;
  };

  const renderTicketSheet = (ticket) => {
    return `
      <article class="ticket-card ticket-sheet-card" data-ticket="${escapeHtml(ticket.id)}">
        <header class="ticket-header">
          <div>
            <h3>${escapeHtml(ticket.id)} - ${escapeHtml(ticket.titulo)}</h3>
            <p class="meta">${escapeHtml(ticket.meta || '')}</p>
          </div>
        </header>

        <section class="ticket-preview" aria-label="Previsualizaci¢n del ticket">
          <table class="preview-table" role="table" aria-describedby="nota-${escapeHtml(ticket.id)}">
            <thead>
              <tr>
                <th colspan="4">Ticket: <span class="ticket-code">${escapeHtml(ticket.id)}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Fecha:</strong> <span class="ticket-fecha">${escapeHtml(ticket.fechaDisplay || '')}</span></td>
                <td><strong>Hora:</strong> <span class="ticket-hora">${escapeHtml(ticket.horaDisplay || '')}</span></td>
                <td><strong>Estado:</strong> <span class="ticket-estado">${escapeHtml(ticket.estadoDisplay || '')}</span></td>
                <td><strong>Nivel de prioridad:</strong> <span class="ticket-prioridad">${escapeHtml(ticket.prioridad || '')}</span></td>
              </tr>
              <tr>
                <td><strong>Nombre del cliente:</strong> <span class="ticket-nombre">${escapeHtml(ticket.cliente && ticket.cliente.nombre ? ticket.cliente.nombre : '')}</span></td>
                <td colspan="2"><strong>Tel‚fono del cliente:</strong> <span class="ticket-telefono">${escapeHtml(ticket.cliente && ticket.cliente.telefono ? ticket.cliente.telefono : '')}</span></td>
                <td><strong>Correo electr¢nico:</strong> <span class="ticket-correo">${escapeHtml(ticket.cliente && ticket.cliente.correo ? ticket.cliente.correo : '')}</span></td>
              </tr>
              <tr>
                <td><strong>Tipo de emisi¢n:</strong> <span class="ticket-tipo">${escapeHtml(ticket.tipo || '')}</span></td>
              </tr>
              <tr>
                <td colspan="4" id="nota-${escapeHtml(ticket.id)}"><strong>Notas:</strong>
                  <div class="ticket-notas">
                    ${renderBlocks(ticket.notasDetalle || [])}
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="4"><strong>Especialista de Soporte en TI:</strong> ${escapeHtml(ticket.especialistas || '')}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </article>
    `;
  };

  const renderTicketTabs = (ticket) => {
    const tabList = ticket.tabs || [];
    const tabs = tabList.map((tab) => {
      const activeClass = tab.key === 'resumen' ? ' active' : '';
      return `<button role="tab" aria-controls="panel-${escapeHtml(ticket.id)}-${escapeHtml(tab.key)}" class="tab${activeClass}" data-action="switch-tab" data-ticket="${escapeHtml(ticket.id)}" data-tab="${escapeHtml(tab.key)}">${escapeHtml(tab.label)}</button>`;
    }).join('');
    const panels = tabList.map((tab) => renderPanel(ticket, tab)).join('');
    return `
      <article class="ticket-card ticket-tabs-card" data-ticket="${escapeHtml(ticket.id)}">
        <div id="detail-${escapeHtml(ticket.id)}" class="ticket-detail">
          <nav class="tabs" role="tablist" aria-label="Secciones del ticket">
            ${tabs}
          </nav>

          ${panels}
        </div>
      </article>
    `;
  };

  const getFilteredTickets = () => {
    const estado = filterEstado ? filterEstado.value : '';
    const prioridad = filterPrioridad ? filterPrioridad.value : '';
    const tipo = filterTipo ? filterTipo.value : '';
    const query = searchInput ? searchInput.value.trim() : '';
    return ticketsData.filter((ticket) => {
      if (estado && ticket.estado !== estado) return false;
      if (prioridad && ticket.prioridad !== prioridad) return false;
      if (tipo && (ticket.tipoFiltro || ticket.tipo) !== tipo) return false;
      if (query) {
        const ticketCode = ticket.id || '';
        const title = ticket.titulo || '';
        const cliente = ticket.cliente && ticket.cliente.nombre ? ticket.cliente.nombre : '';
        if (!(query === ticketCode || title.includes(query) || cliente.includes(query))) return false;
      }
      return true;
    });
  };

  const renderTickets = (filteredTickets) => {
    const listTickets = selectedTicketId
      ? filteredTickets.filter((ticket) => ticket.id === selectedTicketId)
      : filteredTickets;
    ticketsList.innerHTML = listTickets.map((ticket) => renderTicketCard(ticket)).join('');
    backToList.hidden = !selectedTicketId;
  };

  const setLayoutState = (hasDetail) => {
    if (!layout) return;
    layout.classList.toggle('has-detail', hasDetail);
  };

  const renderSelection = () => {
    if (!selectedTicketId) {
      setLayoutState(false);
      ticketSheet.innerHTML = '';
      ticketTabs.innerHTML = '';
      tabsPlaceholder.hidden = false;
      rightPane.hidden = true;
      rightPane.setAttribute('aria-hidden', 'true');
      return;
    }
    const ticket = ticketsData.find((item) => item.id === selectedTicketId);
    if (!ticket) {
      selectedTicketId = null;
      setLayoutState(false);
      ticketSheet.innerHTML = '';
      ticketTabs.innerHTML = '';
      tabsPlaceholder.hidden = false;
      rightPane.hidden = true;
      rightPane.setAttribute('aria-hidden', 'true');
      return;
    }
    setLayoutState(true);
    ticketSheet.innerHTML = renderTicketSheet(ticket);
    ticketTabs.innerHTML = renderTicketTabs(ticket);
    tabsPlaceholder.hidden = true;
    rightPane.hidden = false;
    rightPane.setAttribute('aria-hidden', 'false');
  };

  const updateView = () => {
    const filteredTickets = getFilteredTickets();
    if (selectedTicketId && !filteredTickets.some((ticket) => ticket.id === selectedTicketId)) {
      selectedTicketId = null;
    }
    renderTickets(filteredTickets);
    renderSelection();
  };

  const activateTab = (detail, ticketId, tabKey, tabButton) => {
    const tabs = detail.querySelectorAll('.tab');
    const panels = detail.querySelectorAll('.tabpanel');
    tabs.forEach((tab) => tab.classList.remove('active'));
    panels.forEach((panel) => { panel.hidden = true; });
    if (tabButton) tabButton.classList.add('active');
    const panel = detail.querySelector(`#panel-${CSS.escape(ticketId)}-${CSS.escape(tabKey)}`);
    if (panel && panel.dataset.empty !== 'true') {
      panel.hidden = false;
    }
  };

  layout.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    const isInList = ticketsList.contains(event.target);

    if (!actionEl && isInList) {
      const card = event.target.closest('.ticket-card');
      const ticketId = card ? card.dataset.ticket : '';
      if (ticketId) {
        selectedTicketId = ticketId;
        updateView();
      }
      return;
    }

    if (!actionEl || !layout.contains(actionEl)) return;
    const action = actionEl.dataset.action;
    const ticketId = actionEl.dataset.ticket;

    if (action === 'select-ticket') {
      if (ticketId) {
        selectedTicketId = ticketId;
        updateView();
      }
      return;
    }

    if (action === 'back-to-list') {
      selectedTicketId = null;
      updateView();
      return;
    }

    if (action === 'switch-tab') {
      const detail = document.getElementById(`detail-${ticketId}`);
      if (!detail) return;
      activateTab(detail, ticketId, actionEl.dataset.tab, actionEl);
      return;
    }

    if (action === 'switch-channel') {
      const view = actionEl.dataset.view;
      const buttons = ticketTabs.querySelectorAll(`.ticket-fuente[data-ticket="${CSS.escape(ticketId)}"] .view-btn`);
      buttons.forEach((btn) => {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('active');
      });
      actionEl.setAttribute('aria-pressed', 'true');
      actionEl.classList.add('active');

      const container = ticketTabs.querySelector(`#view-${CSS.escape(ticketId)}`);
      if (!container) return;
      container.querySelectorAll('.channel').forEach((channel) => { channel.hidden = true; });
      const target = container.querySelector(`.channel.${CSS.escape(view)}`);
      if (target) target.hidden = false;

      const detail = document.getElementById(`detail-${ticketId}`);
      if (detail) {
        const canalTab = detail.querySelector('.tab[data-tab="canal"]');
        if (canalTab) {
          activateTab(detail, ticketId, 'canal', canalTab);
        }
      }
      return;
    }

    if (action === 'open-evidence') {
      const src = actionEl.dataset.src || '';
      let content = '';
      if (src.includes('photo')) {
        content = '<svg width="800" height="450"><rect width="100%" height="100%" fill="#e6eefc"></rect><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#0b3d91" font-size="24">Foto (placeholder)</text></svg>';
      } else if (src.includes('screenshot')) {
        content = '<svg width="800" height="450"><rect width="100%" height="100%" fill="#fff"></rect><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#333" font-size="20">Captura (placeholder)</text></svg>';
      } else {
        content = '<svg width="800" height="450"><rect width="100%" height="100%" fill="#fff7e6"></rect><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ff7a00" font-size="20">Log (placeholder)</text></svg>';
      }
      modalBody.innerHTML = content;
      modal.setAttribute('aria-hidden', 'false');
    }
  });

  layout.addEventListener('keydown', (event) => {
    const actionEl = event.target.closest('[data-action="switch-channel"]');
    if (!actionEl) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      actionEl.click();
    }
  });

  if (filterEstado) filterEstado.addEventListener('change', updateView);
  if (filterPrioridad) filterPrioridad.addEventListener('change', updateView);
  if (filterTipo) filterTipo.addEventListener('change', updateView);
  if (searchInput) searchInput.addEventListener('input', updateView);

  closeModal.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  // Cache-buster to avoid HTTP 304 when tickets.json changes.
  fetch(`../data/tickets.json?v=${Date.now()}`)
    .then((response) => response.json())
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('tickets.json debe contener un arreglo');
      ticketsData = data;
      updateView();
    })
    .catch((error) => {
      console.error('Error al cargar tickets.json:', error);
    });
});



