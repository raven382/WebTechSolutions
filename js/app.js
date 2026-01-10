// app.js - renderizado dinamico y eventos delegados para tickets
document.addEventListener('DOMContentLoaded', () => {
  const initInicio = () => {
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
  };

  initInicio();

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

  const getNotesSectionKey = (titleText) => {
    const normalized = String(titleText || '').trim().toLowerCase();
    if (normalized.includes('descripci')) return 'descripcion';
    if (normalized.includes('medidas')) return 'medidas';
    if (normalized.includes('resoluci')) return 'resolucion';
    return '';
  };

  const renderNotesDetails = (blocks) => {
    if (!blocks || !blocks.length) return '';
    const sections = [
      { key: 'descripcion', defaultTitle: 'Descripción del problema', open: true, titleHtml: '', blocks: [] },
      { key: 'medidas', defaultTitle: 'Medidas adoptadas', open: false, titleHtml: '', blocks: [] },
      { key: 'resolucion', defaultTitle: 'Resolución', open: false, titleHtml: '', blocks: [] }
    ];
    const sectionByKey = sections.reduce((acc, section) => {
      acc[section.key] = section;
      return acc;
    }, {});
    let currentKey = 'descripcion';

    blocks.forEach((block) => {
      let titleText = '';
      if (block && block.type === 'paragraph' && Array.isArray(block.segments) && block.segments.length === 1) {
        const seg = block.segments[0];
        if (seg && seg.strong && seg.text) {
          titleText = seg.text;
        }
      }
      if (titleText) {
        const sectionKey = getNotesSectionKey(titleText);
        if (sectionKey && sectionByKey[sectionKey]) {
          sectionByKey[sectionKey].titleHtml = renderSegments(block.segments);
          currentKey = sectionKey;
          return;
        }
      }
      sectionByKey[currentKey].blocks.push(block);
    });

    return sections.map((section) => {
      if (!section.blocks.length) return '';
      const titleHtml = section.titleHtml || escapeHtml(section.defaultTitle);
      const openAttr = section.open ? ' open' : '';
      return `
        <details class="notes-spoiler"${openAttr}>
          <summary class="notes-summary">${titleHtml}</summary>
          <div class="notes-body">
            ${renderBlocks(section.blocks)}
          </div>
        </details>
      `;
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

  const getSpeakerClass = (whoRaw = '') => {
    const who = String(whoRaw).trim().toLowerCase();
    if (who.includes('sistema')) return 'is-sistema';
    if (who.includes('soporte') || who.includes('agente') || who.includes('técnico') || who.includes('tecnico')) return 'is-soporte';
    if (who.includes('usuario') || who.includes('cliente')) return 'is-usuario';
    return 'is-usuario';
  };

  const renderConversationEntry = (ticket, entry) => {
    const roleClass = getSpeakerClass(entry.who);
    const time = renderLogTime(ticket, entry);
    const whoSafe = escapeHtml(entry.who ?? '');
    const bodyHtml = renderLogText(entry.text);
    const timeHtml = time ? `<span class="conv-time">${time}</span>` : '';
    const bodyBlock = bodyHtml.includes('<p') ? bodyHtml : `<p class="conv-body">${bodyHtml}</p>`;
    return `
      <div class="conv-msg ${roleClass}">
        <div class="conv-bubble">
          <div class="conv-meta">
            ${timeHtml}
            <span class="conv-who">${whoSafe}</span>
          </div>
          ${bodyBlock}
        </div>
      </div>
    `;
  };

  const renderChat = (ticket) => {
    const chat = ticket.canales.chat;
    if (!chat) return '';
    const log = chat.log || [];
    const defaultView = ticket.canales.default || 'correo';
    return `
      <div class="channel chat"${defaultView === 'chat' ? '' : ' hidden'}>
        ${chat.titulo ? `<h5>${escapeHtml(chat.titulo)}</h5>` : ''}
        <div class="chat-log">
          ${log.map((entry) => renderConversationEntry(ticket, entry)).join('')}
        </div>
      </div>
    `;
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
          ${log.map((entry) => renderConversationEntry(ticket, entry)).join('')}
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
    const notasHtml = renderNotesDetails(ticket.notasDetalle || []);
    const notasContent = notasHtml || renderBlocks(ticket.notasDetalle || []);
    return `
      <article class="ticket-card ticket-sheet-card" data-ticket="${escapeHtml(ticket.id)}">
        <section class="ticket-preview" aria-label="Previsualizaci½n del ticket">
          <div class="ticket-detail-label">Detalle</div>
          <div class="ticket-meta-grid" role="list">
            <div class="meta-item" role="listitem">
              <span class="meta-label">Fecha:</span>
              <span class="meta-value ticket-fecha">${escapeHtml(ticket.fechaDisplay || '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Hora:</span>
              <span class="meta-value ticket-hora">${escapeHtml(ticket.horaDisplay || '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Estado:</span>
              <span class="meta-value ticket-estado">${escapeHtml(ticket.estadoDisplay || '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Nivel de prioridad:</span>
              <span class="meta-value ticket-prioridad">${escapeHtml(ticket.prioridad || '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Nombre del cliente:</span>
              <span class="meta-value ticket-nombre">${escapeHtml(ticket.cliente && ticket.cliente.nombre ? ticket.cliente.nombre : '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Tel'fono del cliente:</span>
              <span class="meta-value ticket-telefono">${escapeHtml(ticket.cliente && ticket.cliente.telefono ? ticket.cliente.telefono : '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Correo electr½nico:</span>
              <span class="meta-value ticket-correo">${escapeHtml(ticket.cliente && ticket.cliente.correo ? ticket.cliente.correo : '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Tipo de emisi½n:</span>
              <span class="meta-value ticket-tipo">${escapeHtml(ticket.tipo || '')}</span>
            </div>
          </div>
          <div class="ticket-notes" id="nota-${escapeHtml(ticket.id)}">
            <div class="notes-title">Notas:</div>
            <div class="ticket-notas">
              ${notasContent}
            </div>
          </div>
          <div class="ticket-especialistas">
            <span class="meta-label">Especialista de Soporte en TI:</span>
            <span class="meta-value">${escapeHtml(ticket.especialistas || '')}</span>
          </div>
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



