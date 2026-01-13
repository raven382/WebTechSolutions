// app.js - renderizado dinamico y eventos delegados para tickets
document.addEventListener('DOMContentLoaded', () => {
  const LINKED_TICKET_ID = 'TS-NET-0631';
  const isLinkingTicket = (ticketId) => ticketId === LINKED_TICKET_ID;
  const initMobileNav = () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    const overlay = document.querySelector('.nav-overlay');
    if (!toggle || !nav || !overlay) return;

    const setOpen = (isOpen) => {
      document.body.classList.toggle('nav-open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      nav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    };

    toggle.addEventListener('click', () => {
      const isOpen = document.body.classList.contains('nav-open');
      setOpen(!isOpen);
    });

    overlay.addEventListener('click', () => setOpen(false));

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    setOpen(false);
  };

  initMobileNav();
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
  const leftPane = document.getElementById('leftPane');
  const rightPane = document.getElementById('rightPane');
  const ticketSheet = document.getElementById('ticketSheet');
  const ticketTabs = document.getElementById('ticketTabs');
  const tabsPlaceholder = document.getElementById('tabsPlaceholder');
  const backToList = document.getElementById('backToList');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModal = document.getElementById('closeModal');
  if (!layout || !leftPane || !rightPane || !ticketSheet || !ticketTabs || !tabsPlaceholder || !backToList || !modal || !modalBody || !closeModal) return;
  let ticketsData = [];
  let selectedTicketId = null;
  let lastSelectedTicketId = null;
  let lockedMacroId = null;
  let hoveredMicroId = null;
  let selectedFineId = null;
  let canalDock = {
    panel: null,
    sentinel: null,
    onScroll: null
  };
  let dockResizeBound = false;
  let detailDock = {
    panel: null,
    sentinel: null,
    onScroll: null,
    startY: 0,
    offsetLeft: 0,
    width: 0
  };
  let detailDockResizeBound = false;

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

  const renderListItem = (item, linkResolver, meta) => {
    if (typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
    if (!item) return '<li></li>';
    const fineLinkId = item.linkId || null;
    const resolvedLink = linkResolver ? linkResolver(meta) : null;
    const linkAttr = fineLinkId
      ? ` data-link="${escapeHtml(fineLinkId)}" tabindex="0"`
      : (resolvedLink
        ? ` data-link="${escapeHtml(resolvedLink)}" tabindex="0"`
        : (!linkResolver && item.link ? ` data-link="${escapeHtml(item.link)}" tabindex="0"` : ''));
    const content = item.segments ? renderSegments(item.segments) : escapeHtml(item.text || '');
    const subitems = item.subitems
      ? renderList(item.subitems, false, linkResolver, {
        ...(meta || {}),
        isSubitem: true,
        parentIndex: meta ? meta.itemIndex : null
      })
      : '';
    return `<li${linkAttr}>${content}${subitems}</li>`;
  };

  const renderList = (items, ordered, linkResolver, metaBase) => {
    if (!items || !items.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    const body = items.map((item, index) => {
      const meta = metaBase
        ? {
          ...metaBase,
          itemIndex: index,
          subIndex: metaBase.isSubitem ? index : null
        }
        : null;
      return renderListItem(item, linkResolver, meta);
    }).join('');
    return `<${tag}>${body}</${tag}>`;
  };

  const renderBlocks = (blocks, linkResolver, metaBase) => {
    if (!blocks || !blocks.length) return '';
    return blocks.map((block) => {
      if (block.type === 'title') {
        return `<p><strong>${escapeHtml(block.text || '')}</strong></p>`;
      }
      if (block.type === 'paragraph') {
        const fineLinkId = block.linkId || null;
        const linkAttr = fineLinkId
          ? ` data-link="${escapeHtml(fineLinkId)}" tabindex="0"`
          : (!linkResolver && block.link ? ` data-link="${escapeHtml(block.link)}" tabindex="0"` : '');
        return `<p${linkAttr}>${block.segments ? renderSegments(block.segments) : escapeHtml(block.text || '')}</p>`;
      }
      if (block.type === 'list') {
        return renderList(block.items || [], false, linkResolver, metaBase);
      }
      if (block.type === 'ordered') {
        return renderList(block.items || [], true, linkResolver, metaBase);
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

  const resolveNotesLink = (sectionKey, meta) => {
    if (!meta || !sectionKey) return null;
    const map = {
      descripcion: {
        items: {
          1: 'cliente.nombre',
          2: 'cliente.cargo',
          4: 'contacto.correo'
        },
        subitems: {
          3: {
            0: 'contacto.telefono'
          },
          5: {
            0: 'incidente.sintoma',
            1: 'incidente.sintoma'
          },
          6: {
            0: 'incidente.intermitencia'
          },
          7: {
            0: 'incidente.impacto',
            1: 'incidente.impacto'
          },
          8: {
            1: 'incidente.prioridad'
          }
        }
      },
      medidas: {
        subitems: {
          1: {
            0: 'incidente.inicio',
            1: 'incidente.intermitencia',
            2: 'incidente.alcance'
          },
          2: {
            0: 'incidente.conexion'
          },
          3: {
            0: 'diagnostico.prueba',
            1: 'diagnostico.observacion'
          },
          6: {
            0: 'diagnostico.descarto',
            1: 'diagnostico.decision'
          },
          7: {
            0: 'diagnostico.decision',
            1: 'diagnostico.decision',
            2: 'diagnostico.decision'
          }
        }
      },
      resolucion: {
        items: {
          3: 'resolucion.cierre'
        },
        subitems: {
          0: {
            0: 'ubicacion.sitio',
            1: 'resolucion.causa',
            2: 'resolucion.accion'
          },
          1: {
            0: 'resolucion.validacion',
            1: 'resolucion.validacion'
          },
          2: {
            0: 'resolucion.confirmacion',
            1: 'resolucion.confirmacion'
          }
        }
      }
    };
    const sectionMap = map[sectionKey];
    if (!sectionMap) return null;
    if (meta.isSubitem) {
      const parentMap = sectionMap.subitems && sectionMap.subitems[meta.parentIndex];
      return parentMap ? parentMap[meta.subIndex] || null : null;
    }
    return sectionMap.items ? sectionMap.items[meta.itemIndex] || null : null;
  };

  const renderNotesDetails = (ticket, blocks) => {
    if (!blocks || !blocks.length) return '';
    const sections = [
      { key: 'descripcion', defaultTitle: 'Descripción del problema', open: false, titleHtml: '', blocks: [] },
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
      const macroTag = isLinkingTicket(ticket.id) ? `macro.${section.key}` : '';
      const macroAttr = macroTag ? ` data-link="${escapeHtml(macroTag)}" tabindex="0"` : '';
      const linkResolver = isLinkingTicket(ticket.id)
        ? (meta) => resolveNotesLink(section.key, meta)
        : () => null;
      return `
        <details class="notes-spoiler"${openAttr}${macroAttr}>
          <summary class="notes-summary">${titleHtml}</summary>
          <div class="notes-body">
            ${renderBlocks(section.blocks, linkResolver, { sectionKey: section.key })}
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

  const renderFuente = (ticket, options = {}) => {
    const canales = ticket.canales;
    if (!canales) return '';
    const defaultView = canales.default || 'correo';
    const buttons = (canales.botones || []).map((btn) => {
      const pressed = btn.view === defaultView ? 'true' : 'false';
      return `<button class="view-btn" data-action="switch-channel" data-view="${escapeHtml(btn.view)}" data-ticket="${escapeHtml(ticket.id)}" aria-pressed="${pressed}" role="radio">${escapeHtml(btn.label)}</button>`;
    }).join('');
    const content = `<strong>Fuente del ticket:</strong><div class="ticket-fuente" data-ticket="${escapeHtml(ticket.id)}" role="radiogroup" aria-label="Seleccionar canal de ingreso">${buttons}</div>`;
    if (options.asBlock) {
      return `<div class="channel-fuente">${content}</div>`;
    }
    if (canales.fuentePlacement === 'before' || canales.fuentePlacement === 'inside') {
      return `<tr><td colspan="${canales.fuenteColspan || 3}">${content}</td></tr>`;
    }
    return content;
  };

  const renderCorreo = (ticket, fuenteHtml = '') => {
    const correo = ticket.canales.correo;
    if (!correo) return '';
    const hilos = correo.hilos || [];
    const defaultView = ticket.canales.default || 'correo';
    const titleAttr = correo.titleLinkId ? ` data-link="${escapeHtml(correo.titleLinkId)}" tabindex="0"` : '';
    return `
      <div class="channel correo"${defaultView === 'correo' ? '' : ' hidden'}>
        ${fuenteHtml}
        <div class="roleplay-dock">
          ${correo.titulo ? `<div class="roleplay-titlebar"><h5 class="roleplay-title"${titleAttr}>${escapeHtml(correo.titulo)}</h5><span class="focus-pill">MODO FOCO</span></div>` : ''}
          <div class="channel-body">
            ${hilos.map((email, index) => `${renderEmail(email)}${index < hilos.length - 1 ? '<hr>' : ''}`).join('')}
          </div>
        </div>
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

  const renderLogText = (text, lineLinks) => {
    const wrapLine = (line, index) => {
      const tag = lineLinks && lineLinks[index] ? lineLinks[index] : null;
      const safeLine = escapeHtml(line);
      return tag ? `<span class="linkable" data-link="${escapeHtml(tag)}" tabindex="0">${safeLine}</span>` : safeLine;
    };
    if (Array.isArray(text)) {
      return text.map((line, index) => wrapLine(line, index)).join('<br>');
    }
    return wrapLine(text || '', 0);
  };

  const getSpeakerClass = (whoRaw = '') => {
    const who = String(whoRaw).trim().toLowerCase();
    if (who.includes('sistema')) return 'is-sistema';
    if (who.includes('soporte') || who.includes('agente') || who.includes('técnico') || who.includes('tecnico')) return 'is-soporte';
    if (who.includes('usuario') || who.includes('cliente')) return 'is-usuario';
    return 'is-usuario';
  };

  const getMacroLinkTag = (entryIndex) => {
    if (entryIndex <= 18) return 'macro.descripcion';
    if (entryIndex <= 44) return 'macro.medidas';
    return 'macro.resolucion';
  };

  const getEntryMacroLink = (entry, entryIndex) => {
    if (entry && entry.macroLink) return entry.macroLink;
    return getMacroLinkTag(entryIndex);
  };

  const getConversationLineLinks = (ticketId, entryIndex) => {
    if (!isLinkingTicket(ticketId)) return null;
    const map = {
      35: { 0: 'diagnostico.descarto', 1: 'diagnostico.decision' },
      45: {
        1: 'ubicacion.sitio',
        2: 'resolucion.causa',
        3: 'resolucion.accion',
        4: 'resolucion.validacion'
      }
    };
    return map[entryIndex] || null;
  };

  const getConversationBubbleLinkTag = (ticketId, entryIndex) => {
    if (!isLinkingTicket(ticketId)) return null;
    const map = {
      1: 'cliente.nombre',
      3: 'cliente.cargo',
      5: 'contacto.telefono',
      6: 'contacto.correo',
      9: 'incidente.sintoma',
      10: 'incidente.intermitencia',
      13: 'incidente.inicio',
      17: 'incidente.impacto',
      18: 'incidente.prioridad',
      20: 'incidente.conexion',
      22: 'incidente.alcance',
      30: 'diagnostico.prueba',
      31: 'diagnostico.observacion',
      36: 'diagnostico.decision',
      39: 'ubicacion.sitio',
      40: 'diagnostico.decision',
      41: 'diagnostico.decision',
      42: 'diagnostico.decision',
      49: 'resolucion.confirmacion',
      51: 'resolucion.validacion',
      52: 'resolucion.cierre'
    };
    return map[entryIndex] || null;
  };

  const renderConversationEntry = (ticket, entry, entryIndex) => {
    const roleClass = getSpeakerClass(entry.who);
    const time = renderLogTime(ticket, entry);
    const whoSafe = escapeHtml(entry.who ?? '');
    const lineLinks = getConversationLineLinks(ticket.id, entryIndex);
    const bodyHtml = renderLogText(entry.text, lineLinks);
    const timeHtml = time ? `<span class="conv-time">${time}</span>` : '';
    const bodyBlock = bodyHtml.includes('<p') ? bodyHtml : `<p class="conv-body">${bodyHtml}</p>`;
    const macroTag = isLinkingTicket(ticket.id) ? getEntryMacroLink(entry, entryIndex) : null;
    const linkAttr = macroTag ? ` data-link="${escapeHtml(macroTag)}" tabindex="0"` : '';
    const bubbleTag = getConversationBubbleLinkTag(ticket.id, entryIndex);
    const fineLinkId = entry.linkId || null;
    const bubbleLink = fineLinkId || bubbleTag;
    const bubbleAttr = bubbleLink ? ` data-link="${escapeHtml(bubbleLink)}" tabindex="0"` : '';
    return `
      <div class="conv-msg ${roleClass}"${linkAttr}>
        <div class="conv-bubble"${bubbleAttr}>
          <div class="conv-meta">
            ${timeHtml}
            <span class="conv-who">${whoSafe}</span>
          </div>
          ${bodyBlock}
        </div>
      </div>
    `;
  };

  const renderConversationLog = (ticket, log, options = {}) => {
    if (!log || !log.length) return '';
    const groupByMacro = options.groupByMacro && isLinkingTicket(ticket.id);
    if (groupByMacro) {
      let html = '';
      let i = 0;
      while (i < log.length) {
        const macroTag = getEntryMacroLink(log[i], i);
        const blockItems = [];
        while (i < log.length && getEntryMacroLink(log[i], i) === macroTag) {
          blockItems.push(renderConversationEntry(ticket, log[i], i));
          i += 1;
        }
        const linkAttr = macroTag ? ` data-link="${escapeHtml(macroTag)}" tabindex="0"` : '';
        html += `<div class="conv-block"${linkAttr}>${blockItems.join('')}</div>`;
      }
      return html;
    }
    let html = '';
    let i = 0;
    while (i < log.length) {
      const entry = log[i];
      if (entry && entry.block) {
        const blockId = entry.block;
        const blockItems = [];
        let blockLink = '';
        while (i < log.length && log[i] && log[i].block === blockId) {
          const blockEntry = log[i];
          if (!blockLink && blockEntry.link) blockLink = blockEntry.link;
          blockItems.push(renderConversationEntry(ticket, blockEntry, i));
          i += 1;
        }
        const linkAttr = blockLink && isLinkingTicket(ticket.id) ? ` data-link="${escapeHtml(blockLink)}" tabindex="0"` : '';
        html += `<div class="conv-block" data-block="${escapeHtml(blockId)}"${linkAttr}>${blockItems.join('')}</div>`;
        continue;
      }
      html += renderConversationEntry(ticket, entry, i);
      i += 1;
    }
    return html;
  };

  const renderChat = (ticket, fuenteHtml = '') => {
    const chat = ticket.canales.chat;
    if (!chat) return '';
    const log = chat.log || [];
    const defaultView = ticket.canales.default || 'correo';
    const titleAttr = chat.titleLinkId ? ` data-link="${escapeHtml(chat.titleLinkId)}" tabindex="0"` : '';
    return `
      <div class="channel chat"${defaultView === 'chat' ? '' : ' hidden'}>
        ${fuenteHtml}
        <div class="roleplay-dock">
          ${chat.titulo ? `<div class="roleplay-titlebar"><h5 class="roleplay-title"${titleAttr}>${escapeHtml(chat.titulo)}</h5><span class="focus-pill">MODO FOCO</span></div>` : ''}
          <div class="channel-body">
            <div class="chat-log">
              ${renderConversationLog(ticket, log)}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderLlamada = (ticket, fuenteHtml = '') => {
    const llamada = ticket.canales.llamada;
    if (!llamada) return '';
    const log = llamada.log || [];
    const defaultView = ticket.canales.default || 'correo';
    const titleAttr = llamada.titleLinkId ? ` data-link="${escapeHtml(llamada.titleLinkId)}" tabindex="0"` : '';
    return `
      <div class="channel llamada"${defaultView === 'llamada' ? '' : ' hidden'}>
        ${fuenteHtml}
        <div class="roleplay-dock">
          ${llamada.titulo ? `<div class="roleplay-titlebar"><h5 class="roleplay-title"${titleAttr}>${escapeHtml(llamada.titulo)}</h5><span class="focus-pill">MODO FOCO</span></div>` : ''}
          <div class="channel-body">
            <div class="call-log">
              ${renderConversationLog(ticket, log, { groupByMacro: true })}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderChannels = (ticket) => {
    const canales = ticket.canales;
    if (!canales) return '';
    const fuente = renderFuente(ticket);
    const fuenteBlock = renderFuente(ticket, { asBlock: true });
    const fuenteInside = canales.fuentePlacement === 'inside' ? fuenteBlock : '';
    const channelView = `
      <div class="channel-view" id="view-${escapeHtml(ticket.id)}">
        ${renderCorreo(ticket, fuenteInside)}
        ${renderChat(ticket, fuenteInside)}
        ${renderLlamada(ticket, fuenteInside)}
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
    const notasHtml = renderNotesDetails(ticket, ticket.notasDetalle || []);
    const notasContent = notasHtml || renderBlocks(ticket.notasDetalle || []);
    const nombreLink = isLinkingTicket(ticket.id) ? 'cliente.nombre' : '';
    const telefonoLink = isLinkingTicket(ticket.id) ? 'contacto.telefono' : '';
    const correoLink = isLinkingTicket(ticket.id) ? 'contacto.correo' : '';
    const prioridadLink = isLinkingTicket(ticket.id) ? 'incidente.prioridad' : '';
    const tipoLink = ticket.tipoLinkId || '';
    const nombreAttr = nombreLink ? ` data-link="${escapeHtml(nombreLink)}" tabindex="0"` : '';
    const telefonoAttr = telefonoLink ? ` data-link="${escapeHtml(telefonoLink)}" tabindex="0"` : '';
    const correoAttr = correoLink ? ` data-link="${escapeHtml(correoLink)}" tabindex="0"` : '';
    const prioridadAttr = prioridadLink ? ` data-link="${escapeHtml(prioridadLink)}" tabindex="0"` : '';
    const tipoAttr = tipoLink ? ` data-link="${escapeHtml(tipoLink)}" tabindex="0"` : '';
    return `
      <article class="ticket-card ticket-sheet-card" data-ticket="${escapeHtml(ticket.id)}">
        <section class="ticket-preview" aria-label="Previsualizaci½n del ticket">
          <div class="ticket-detail-block">
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
              <span class="meta-value ticket-prioridad"${prioridadAttr}>${escapeHtml(ticket.prioridad || '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Nombre del cliente:</span>
              <span class="meta-value ticket-nombre"${nombreAttr}>${escapeHtml(ticket.cliente && ticket.cliente.nombre ? ticket.cliente.nombre : '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Teléfono del cliente:</span>
              <span class="meta-value ticket-telefono"${telefonoAttr}>${escapeHtml(ticket.cliente && ticket.cliente.telefono ? ticket.cliente.telefono : '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Correo electrónico:</span>
              <span class="meta-value ticket-correo"${correoAttr}>${escapeHtml(ticket.cliente && ticket.cliente.correo ? ticket.cliente.correo : '')}</span>
            </div>
            <div class="meta-item" role="listitem">
              <span class="meta-label">Tipo de emisión:</span>
              <span class="meta-value ticket-tipo"${tipoAttr}>${escapeHtml(ticket.tipo || '')}</span>
            </div>
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

  const setFocusIndicator = (active) => {
    if (!ticketTabs) return;
    ticketTabs.querySelectorAll('.focus-pill').forEach((el) => {
      el.classList.toggle('is-active', active);
    });
  };

  const clearHover = () => {
    hoveredMicroId = null;
    [ticketSheet, ticketTabs].forEach((container) => {
      if (!container) return;
      container.querySelectorAll('[data-link].is-hover').forEach((el) => {
        el.classList.remove('is-hover');
      });
    });
  };

  const clearLock = () => {
    [ticketSheet, ticketTabs].forEach((container) => {
      if (!container) return;
      container.querySelectorAll('.conv-block.block-active, .conv-block.block-dim').forEach((el) => {
        el.classList.remove('block-active', 'block-dim');
      });
      container.querySelectorAll('.notes-spoiler.block-active, .notes-spoiler.block-dim').forEach((el) => {
        el.classList.remove('block-active', 'block-dim');
      });
    });
    setFocusIndicator(false);
  };

  const applyHover = (linkId) => {
    if (!linkId) return;
    clearHover();
    hoveredMicroId = linkId;
    [ticketSheet, ticketTabs].forEach((container) => {
      if (!container) return;
      container.querySelectorAll(`[data-link="${CSS.escape(linkId)}"]`).forEach((el) => {
        el.classList.add('is-hover');
      });
    });
  };

  const clearSelected = () => {
    selectedFineId = null;
    [ticketSheet, ticketTabs].forEach((container) => {
      if (!container) return;
      container.querySelectorAll('[data-link].is-selected').forEach((el) => {
        el.classList.remove('is-selected');
      });
    });
  };

  const applyFineSelect = (linkId) => {
    if (!linkId) return;
    clearSelected();
    selectedFineId = linkId;
    [ticketSheet, ticketTabs].forEach((container) => {
      if (!container) return;
      container.querySelectorAll(`[data-link="${CSS.escape(linkId)}"]`).forEach((el) => {
        el.classList.add('is-selected');
      });
    });
  };

  const scrollRoleplayToLink = (linkId) => {
    if (!linkId || !ticketTabs) return;
    const activeChannel = ticketTabs.querySelector('.channel:not([hidden])');
    if (!activeChannel) return;
    const body = activeChannel.querySelector('.channel-body');
    if (!body) return;
    const target = activeChannel.querySelector(`[data-link="${CSS.escape(linkId)}"]`);
    if (!target) return;
    if (body.contains(target)) {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      body.scrollTop = 0;
    }
  };

  const applyLock = (macroId) => {
    if (!macroId) return;
    clearLock();
    [ticketSheet, ticketTabs].forEach((container) => {
      if (!container) return;
      container.querySelectorAll('.conv-block[data-link^="macro."]').forEach((block) => {
        if (block.dataset.link === macroId) {
          block.classList.add('block-active');
        } else {
          block.classList.add('block-dim');
        }
      });
      container.querySelectorAll('.notes-spoiler[data-link^="macro."]').forEach((block) => {
        if (block.dataset.link === macroId) {
          block.classList.add('block-active');
        } else {
          block.classList.add('block-dim');
        }
      });
    });
    setFocusIndicator(true);
  };

  const resetLinkState = () => {
    lockedMacroId = null;
    clearHover();
    clearLock();
    clearSelected();
  };

  const getMacroFromTarget = (target) => {
    if (!target) return null;
    const macroEl = target.closest('[data-link^="macro."]');
    if (!macroEl) return null;
    if (ticketSheet.contains(macroEl) || ticketTabs.contains(macroEl)) return macroEl.dataset.link;
    return null;
  };

  const getLinkTarget = (target) => {
    if (!target) return null;
    const linkEl = target.closest('[data-link]');
    if (!linkEl) return null;
    if (ticketSheet.contains(linkEl) || ticketTabs.contains(linkEl)) return linkEl;
    return null;
  };

  const getBlockTarget = (target) => {
    if (!target) return null;
    const blockEl = target.closest('.conv-block');
    if (!blockEl) return null;
    if (ticketSheet.contains(blockEl) || ticketTabs.contains(blockEl)) return blockEl;
    return null;
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
      enableCanalDock();
      enableDetailDock();
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
      enableCanalDock();
      enableDetailDock();
      return;
    }
    setLayoutState(true);
    ticketSheet.innerHTML = renderTicketSheet(ticket);
    ticketTabs.innerHTML = renderTicketTabs(ticket);
    tabsPlaceholder.hidden = true;
    rightPane.hidden = false;
    rightPane.setAttribute('aria-hidden', 'false');
    enableCanalDock();
    enableDetailDock();
  };

  const updateView = () => {
    const filteredTickets = getFilteredTickets();
    if (selectedTicketId && !filteredTickets.some((ticket) => ticket.id === selectedTicketId)) {
      selectedTicketId = null;
    }
    if (selectedTicketId !== lastSelectedTicketId) {
      resetLinkState();
      lastSelectedTicketId = selectedTicketId;
    }
    renderTickets(filteredTickets);
    renderSelection();
  };

  const activateTab = (detail, ticketId, tabKey, tabButton) => {
    resetLinkState();
    const tabs = detail.querySelectorAll('.tab');
    const panels = detail.querySelectorAll('.tabpanel');
    tabs.forEach((tab) => tab.classList.remove('active'));
    panels.forEach((panel) => { panel.hidden = true; });
    if (tabButton) tabButton.classList.add('active');
    const panel = detail.querySelector(`#panel-${CSS.escape(ticketId)}-${CSS.escape(tabKey)}`);
    if (panel && panel.dataset.empty !== 'true') {
      panel.hidden = false;
    }
    enableCanalDock();
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
      resetLinkState();
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
      enableCanalDock();

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

  layout.addEventListener('mouseover', (event) => {
    if (!isLinkingTicket(selectedTicketId)) return;
    const linkEl = getLinkTarget(event.target);
    if (!linkEl) return;
    const linkId = linkEl.dataset.link;
    if (!linkId || linkId.startsWith('macro.')) return;
    if (lockedMacroId) {
      const macroId = getMacroFromTarget(event.target);
      if (macroId && macroId !== lockedMacroId) return;
    }
    applyHover(linkId);
  });

  layout.addEventListener('mouseout', (event) => {
    if (!isLinkingTicket(selectedTicketId)) return;
    const linkEl = getLinkTarget(event.target);
    if (!linkEl) return;
    if (event.relatedTarget && linkEl.contains(event.relatedTarget)) return;
    clearHover();
  });

  layout.addEventListener('click', (event) => {
    if (!isLinkingTicket(selectedTicketId)) return;
    const linkEl = getLinkTarget(event.target);
    if (!linkEl) return;
    const linkId = linkEl.dataset.link;
    if (!linkId) return;
    const isNotesLink = ticketSheet.contains(linkEl) && linkEl.closest('.ticket-notes');
    const macroId = linkId.startsWith('macro.') ? linkId : getMacroFromTarget(linkEl);
    if (!macroId) return;
    if (!linkId.startsWith('macro.') && isNotesLink) {
      if (selectedFineId !== linkId) {
        applyFineSelect(linkId);
      }
      lockedMacroId = macroId;
      applyLock(macroId);
      scrollRoleplayToLink(linkId);
      return;
    }
    if (lockedMacroId === macroId) {
      return;
    }
    lockedMacroId = macroId;
    applyLock(macroId);
  });

  document.addEventListener('click', (event) => {
    if (!lockedMacroId || !isLinkingTicket(selectedTicketId)) return;
    if (layout.contains(event.target)) {
      const inNotes = ticketSheet.contains(event.target) && event.target.closest('.ticket-notes');
      const inRoleplay = ticketTabs.contains(event.target) && event.target.closest('.channel');
      const inLinked = event.target.closest('[data-link]');
      if (inNotes || inRoleplay || inLinked) return;
    }
    resetLinkState();
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
    if (event.key === 'Escape' && lockedMacroId) {
      resetLinkState();
    }
  });

  const teardownCanalDock = () => {
    if (canalDock.onScroll) {
      window.removeEventListener('scroll', canalDock.onScroll);
      canalDock.onScroll = null;
    }
    if (canalDock.panel) {
      canalDock.panel.classList.remove('is-docked');
      canalDock.panel.style.left = '';
      canalDock.panel.style.width = '';
      canalDock.panel.style.maxHeight = '';
      canalDock.panel.style.transform = '';
      const head = canalDock.panel.querySelector('.roleplay-title');
      const body = canalDock.panel.querySelector('.channel-body');
      if (head) head.style.maxHeight = '';
      if (body) {
        body.style.maxHeight = '';
        body.style.overflowY = '';
        body.style.paddingBottom = '';
        body.style.scrollPaddingBottom = '';
      }
    }
    if (canalDock.sentinel && canalDock.sentinel.parentNode) {
      canalDock.sentinel.parentNode.removeChild(canalDock.sentinel);
    }
    canalDock.panel = null;
    canalDock.sentinel = null;
  };

  const syncCanalDock = () => {
    if (!canalDock.panel || !canalDock.sentinel) return;
    const rect = canalDock.sentinel.getBoundingClientRect();
    const shouldDock = rect.top <= 16;
    canalDock.panel.classList.toggle('is-docked', shouldDock);
    if (shouldDock) {
      const rightRect = rightPane.getBoundingClientRect();
      canalDock.panel.style.left = `${rightRect.left}px`;
      canalDock.panel.style.width = `${rightRect.width}px`;
      const available = window.innerHeight - 32;
      canalDock.panel.style.maxHeight = `${available}px`;
      const head = canalDock.panel.querySelector('.roleplay-title');
      const body = canalDock.panel.querySelector('.channel-body');
      const headHeight = head ? head.offsetHeight : 0;
      if (body) {
        body.style.maxHeight = `${Math.max(0, available - headHeight)}px`;
        body.style.overflowY = 'auto';
        body.style.paddingBottom = '24px';
        body.style.scrollPaddingBottom = '24px';
      }
      const footer = document.querySelector('footer');
      if (footer) {
        const dockRect = canalDock.panel.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        if (dockRect.bottom > footerRect.top - 16) {
          const overlap = dockRect.bottom - (footerRect.top - 16);
          canalDock.panel.style.transform = `translateY(-${overlap}px)`;
        } else {
          canalDock.panel.style.transform = '';
        }
      } else {
        canalDock.panel.style.transform = '';
      }
      canalDock.sentinel.style.height = `${canalDock.panel.offsetHeight}px`;
    } else {
      canalDock.panel.style.left = '';
      canalDock.panel.style.width = '';
      canalDock.panel.style.maxHeight = '';
      canalDock.panel.style.transform = '';
      const head = canalDock.panel.querySelector('.roleplay-title');
      const body = canalDock.panel.querySelector('.channel-body');
      if (head) head.style.maxHeight = '';
      if (body) {
        body.style.maxHeight = '';
        body.style.overflowY = '';
        body.style.paddingBottom = '';
        body.style.scrollPaddingBottom = '';
      }
      canalDock.sentinel.style.height = '0px';
    }
  };

  const enableCanalDock = () => {
    if (!window.matchMedia('(min-width: 900px)').matches) {
      teardownCanalDock();
      return;
    }
    if (!ticketTabs || !rightPane || rightPane.hidden) {
      teardownCanalDock();
      return;
    }
    const canalPanel = ticketTabs.querySelector('.tabpanel[id$="-canal"]');
    if (!canalPanel || canalPanel.hidden) {
      teardownCanalDock();
      return;
    }
    const visibleChannel = canalPanel.querySelector('.channel:not([hidden])');
    if (!visibleChannel) {
      teardownCanalDock();
      return;
    }
    const roleplayDock = visibleChannel.querySelector('.roleplay-dock');
    if (!roleplayDock) {
      teardownCanalDock();
      return;
    }
    if (canalDock.panel !== roleplayDock) {
      teardownCanalDock();
      canalDock.panel = roleplayDock;
      canalDock.sentinel = document.createElement('div');
      canalDock.sentinel.className = 'canal-dock-sentinel';
      canalDock.sentinel.style.height = '0px';
      roleplayDock.parentNode.insertBefore(canalDock.sentinel, roleplayDock);
      canalDock.onScroll = () => syncCanalDock();
      window.addEventListener('scroll', canalDock.onScroll, { passive: true });
    }
    syncCanalDock();
    if (!dockResizeBound) {
      dockResizeBound = true;
      window.addEventListener('resize', () => enableCanalDock(), { passive: true });
    }
  };

  const resetDetailDockStyles = (panel) => {
    panel.classList.remove('is-docked');
    panel.style.position = '';
    panel.style.top = '';
    panel.style.left = '';
    panel.style.width = '';
    panel.style.zIndex = '';
    panel.style.transform = '';
  };

  const teardownDetailDock = () => {
    if (detailDock.onScroll) {
      window.removeEventListener('scroll', detailDock.onScroll);
      detailDock.onScroll = null;
    }
    if (detailDock.panel) {
      resetDetailDockStyles(detailDock.panel);
    }
    if (detailDock.sentinel && detailDock.sentinel.parentNode) {
      detailDock.sentinel.parentNode.removeChild(detailDock.sentinel);
    }
    detailDock.panel = null;
    detailDock.sentinel = null;
    detailDock.startY = 0;
    detailDock.offsetLeft = 0;
    detailDock.width = 0;
  };

  const syncDetailDock = () => {
    if (!detailDock.panel) return;
    const shouldDock = window.scrollY + 16 >= detailDock.startY;
    if (shouldDock) {
      detailDock.panel.classList.add('is-docked');
      const rect = leftPane.getBoundingClientRect();
      const left = rect.left + detailDock.offsetLeft;
      const width = detailDock.width || rect.width;
      detailDock.panel.style.position = 'fixed';
      detailDock.panel.style.top = '0px';
      detailDock.panel.style.left = `${left}px`;
      detailDock.panel.style.width = `${width}px`;
      detailDock.panel.style.zIndex = '15';
      if (detailDock.sentinel) {
        detailDock.sentinel.style.height = `${detailDock.panel.offsetHeight}px`;
      }
      const footer = document.querySelector('footer');
      if (footer) {
        const dockRect = detailDock.panel.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        if (dockRect.bottom > footerRect.top - 16) {
          const overlap = dockRect.bottom - (footerRect.top - 16);
          detailDock.panel.style.transform = `translateY(-${overlap}px)`;
        } else {
          detailDock.panel.style.transform = '';
        }
      } else {
        detailDock.panel.style.transform = '';
      }
    } else {
      resetDetailDockStyles(detailDock.panel);
      if (detailDock.sentinel) {
        detailDock.sentinel.style.height = '0px';
      }
    }
  };

  const enableDetailDock = () => {
    if (!window.matchMedia('(min-width: 900px)').matches) {
      teardownDetailDock();
      return;
    }
    if (!ticketSheet || !leftPane) {
      teardownDetailDock();
      return;
    }
    const detailBlock = ticketSheet.querySelector('.ticket-detail-block');
    if (!detailBlock) {
      teardownDetailDock();
      return;
    }
    if (detailDock.panel !== detailBlock) {
      teardownDetailDock();
      detailDock.panel = detailBlock;
      detailDock.sentinel = document.createElement('div');
      detailDock.sentinel.className = 'detail-dock-sentinel';
      detailDock.sentinel.style.height = '0px';
      detailBlock.parentNode.insertBefore(detailDock.sentinel, detailBlock);
      detailDock.onScroll = () => syncDetailDock();
      window.addEventListener('scroll', detailDock.onScroll, { passive: true });
    }
    if (detailBlock.classList.contains('is-docked')) {
      resetDetailDockStyles(detailBlock);
      if (detailDock.sentinel) detailDock.sentinel.style.height = '0px';
    }
    detailDock.startY = detailBlock.getBoundingClientRect().top + window.scrollY;
    const leftRect = leftPane.getBoundingClientRect();
    const detailRect = detailBlock.getBoundingClientRect();
    detailDock.offsetLeft = detailRect.left - leftRect.left;
    detailDock.width = detailRect.width;
    syncDetailDock();
    if (!detailDockResizeBound) {
      detailDockResizeBound = true;
      window.addEventListener('resize', () => enableDetailDock(), { passive: true });
    }
  };

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
