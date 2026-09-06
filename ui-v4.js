// Tarjetas de compra v4: cantidad compacta + usos culinarios por producto.

(() => {
  if (typeof routes === 'undefined') return;

  const previousCompra = routes.compra;

  async function loadShoppingUses() {
    const week = activeWeek();
    const path = week?.compra?.usos;
    if (!path) return {};
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${path}`);
      return await response.json();
    } catch (error) {
      console.warn('No se pudo cargar el contexto de uso de la compra:', error);
      return {};
    }
  }

  function normalizedKey(value = '') {
    return String(value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function lookupUses(uses, name) {
    if (Array.isArray(uses[name])) return uses[name];
    const key = normalizedKey(name);
    const match = Object.keys(uses).find(candidate => normalizedKey(candidate) === key);
    return match ? uses[match] : [];
  }

  function decorateShoppingCards(uses) {
    document.querySelectorAll('.shopping-item').forEach(item => {
      const text = item.querySelector('.shopping-text');
      const nameRow = item.querySelector('.shopping-name-row');
      const name = nameRow?.querySelector('strong')?.textContent?.trim() || '';
      if (!text || !nameRow || !name) return;

      const equivalence = item.querySelector('.shopping-buy')?.textContent?.trim() || '';
      const doseNode = item.querySelector('.shopping-dose');
      const amount = (doseNode?.textContent || '').replace(/^Referencia dieta:\s*/i, '').trim();
      const days = item.querySelector('.shopping-days');

      item.querySelector('.shopping-buy')?.remove();
      doseNode?.remove();
      item.querySelector('.shopping-meta-v4')?.remove();
      item.querySelector('.shopping-uses-v4')?.remove();

      const meta = document.createElement('span');
      meta.className = 'shopping-meta-v4';
      if (equivalence && amount) meta.textContent = `${equivalence} (${amount})`;
      else meta.textContent = equivalence || amount;
      if (meta.textContent) text.appendChild(meta);

      const productUses = lookupUses(uses, name);
      if (productUses.length) {
        const useBox = document.createElement('span');
        useBox.className = 'shopping-uses-v4';
        productUses.forEach(use => {
          const line = document.createElement('span');
          line.className = 'shopping-use-line-v4';
          line.textContent = use;
          useBox.appendChild(line);
        });
        text.appendChild(useBox);
      }

      if (days) {
        days.classList.add('shopping-days-v4');
        text.appendChild(days);
      }
    });
  }

  function moveShoppingSummaryToBottom() {
    const summary = document.querySelector('.shopping-summary');
    if (!summary || !app?.contains(summary)) return;
    app.appendChild(summary);
  }

  routes.compra = async () => {
    await previousCompra();
    const uses = await loadShoppingUses();
    decorateShoppingCards(uses);
    moveShoppingSummaryToBottom();
  };
})();
// Vista por fechas: ayer, hoy y seis días siguientes.
// Solo usa dos semanas operativas (actual + siguiente) y mantiene una única lista de compra visible.
(() => {
  if (typeof routes === 'undefined') return;

  const MEALS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  const previousHome = routes.inicio;
  const previousCompra = routes.compra;
  const menuCache = new Map();
  let selectedDate = null;

  const addDays = (iso, days) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const dayName = iso => capitalize(new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', timeZone: 'UTC'
  }).format(new Date(`${iso}T12:00:00Z`)));

  const longDate = iso => capitalize(new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  }).format(new Date(`${iso}T12:00:00Z`)));

  const monthShort = iso => new Intl.DateTimeFormat('es-ES', {
    month: 'short', timeZone: 'UTC'
  }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');

  function rollingDates() {
    const today = madridNowParts().date;
    return Array.from({ length: 8 }, (_, i) => addDays(today, i - 1));
  }

  function operationalWeeks() {
    const weeks = [...(config?.semanas || [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const today = madridNowParts().date;
    const current = weeks.find(w => today >= w.inicio && today <= w.fin) || null;
    if (current) {
      const next = weeks.find(w => w.inicio > current.fin) || null;
      return [current, next].filter(Boolean);
    }
    const future = weeks.find(w => w.inicio > today) || null;
    return future ? [future] : [];
  }

  const weekForDate = iso => operationalWeeks().find(w => iso >= w.inicio && iso <= w.fin) || null;

  function shoppingWeek() {
    const weeks = operationalWeeks();
    if (!weeks.length) return null;
    const today = madridNowParts().date;
    return weeks.find(w => w.inicio > today) || weeks[0];
  }

  async function menuForWeek(week) {
    if (!week?.archivos?.cuadro02) return {};
    if (!menuCache.has(week.id)) {
      menuCache.set(week.id, fetchText(week.archivos.cuadro02).then(parseCuadro02));
    }
    return menuCache.get(week.id);
  }

  function splitMeal(value = '') {
    const parts = String(value).split(/<br\s*\/?\s*>/i).map(v => v.trim()).filter(Boolean);
    return { title: parts[0] || '', detail: parts.slice(1).join('<br>') };
  }

  const rich = value => value ? (window.marked ? marked.parseInline(value) : escapeHtml(cleanMarkdownText(value))) : '<span class="muted">—</span>';
  const details = value => value ? `<details class="cuadro-ingredients"><summary>Ver ingredientes</summary><div class="cuadro-detail">${rich(value)}</div></details>` : '';

  function mealCard(meal, entry) {
    const almu = splitMeal(entry?.almu || '');
    const fran = splitMeal(entry?.fran || '');
    return `<section class="cuadro02-meal-card">
      <h2>${meal}</h2>
      <div class="cuadro-two-cols">
        <article><span class="cuadro-person-label">ALMU</span><div class="cuadro-title">${rich(almu.title)}</div>${details(almu.detail)}</article>
        <article><span class="cuadro-person-label">FRAN</span><div class="cuadro-title">${rich(fran.title)}</div>${details(fran.detail)}</article>
      </div>
    </section>`;
  }

  function chipCaption(iso) {
    const today = madridNowParts().date;
    if (iso === addDays(today, -1)) return 'Ayer';
    if (iso === today) return 'Hoy';
    if (iso === addDays(today, 1)) return 'Mañana';
    return dayName(iso).slice(0, 3);
  }

  function dateSelector(selected) {
    const today = madridNowParts().date;
    return `<nav class="cuadro-day-selector rolling-day-selector" aria-label="Seleccionar fecha">${rollingDates().map(iso => {
      const loaded = Boolean(weekForDate(iso));
      return `<button type="button" class="cuadro-day-chip rolling-day-chip ${iso === selected ? 'active' : ''} ${iso === today ? 'today' : ''} ${loaded ? '' : 'empty'}" onclick="selectRollingDate('${iso}')">
        <span class="rolling-day-name">${escapeHtml(chipCaption(iso))}</span>
        <span class="rolling-day-date">${Number(iso.slice(8, 10))} ${escapeHtml(monthShort(iso))}</span>
      </button>`;
    }).join('')}</nav>`;
  }

  function dateNav(selected) {
    const dates = rollingDates();
    const i = dates.indexOf(selected);
    const prev = i > 0 ? dates[i - 1] : null;
    const next = i >= 0 && i < dates.length - 1 ? dates[i + 1] : null;
    return `<div class="cuadro-day-nav">
      <button type="button" ${prev ? `onclick="selectRollingDate('${prev}')"` : 'disabled'}>← ${prev ? dayName(prev) : '—'}</button>
      <button type="button" ${next ? `onclick="selectRollingDate('${next}')"` : 'disabled'}>${next ? dayName(next) : '—'} →</button>
    </div>`;
  }

  async function renderRollingMenu() {
    const dates = rollingDates();
    const today = madridNowParts().date;
    if (!selectedDate || !dates.includes(selectedDate)) selectedDate = today;
    const iso = selectedDate;
    const week = weekForDate(iso);
    app.innerHTML = '<div class="status">Cargando menú…</div>';

    let body = '';
    if (!week) {
      body = `<section class="rolling-empty card"><strong>${escapeHtml(longDate(iso))}</strong><p>Dieta aún no cargada para este día.</p></section>`;
    } else {
      try {
        const data = await menuForWeek(week);
        const entry = data[dayName(iso)];
        body = entry
          ? `<div class="cuadro02-meals">${MEALS.map(meal => mealCard(meal, entry[meal])).join('')}</div>`
          : `<section class="rolling-empty card"><strong>${escapeHtml(longDate(iso))}</strong><p>No hay datos de dieta para este día.</p></section>`;
      } catch (error) {
        console.error(error);
        body = missingFileMessage(week.archivos.cuadro02);
      }
    }

    app.innerHTML = `${pageHeader('Menú · 8 días', 'Ayer · hoy · +6 días')}<section class="cuadro-mobile-view rolling-menu-view">
      <div class="cuadro-mobile-top"><span>📋 MENÚ · 8 DÍAS</span><h1>${escapeHtml(longDate(iso))}</h1><p>Ayer, hoy y los seis días siguientes</p></div>
      ${dateSelector(iso)}${body}${dateNav(iso)}
    </section>`;
    document.querySelectorAll('.back-button').forEach(button => {
      button.textContent = '🏠';
      button.setAttribute('aria-label', 'Inicio');
      button.setAttribute('title', 'Inicio');
    });
  }

  window.selectRollingDate = iso => {
    selectedDate = iso;
    renderRollingMenu();
  };

  routes.inicio = () => {
    previousHome();
    document.querySelectorAll('.home-button').forEach(button => {
      if (!String(button.getAttribute('onclick') || '').includes('cuadro02')) return;
      const title = button.querySelector('.home-title') || button.querySelector('strong');
      if (title) title.textContent = 'Menú · 8 días';
    });
  };

  routes.cuadro02 = renderRollingMenu;

  // Una sola lista: cuando la semana siguiente ya está cargada, la compra visible es la de esa semana.
  routes.compra = async () => {
    const chosen = shoppingWeek();
    if (!chosen) return previousCompra();
    const savedWeeks = config.semanas;
    const savedCurrent = config.vigente;
    try {
      config.semanas = [chosen];
      config.vigente = chosen.id;
      await previousCompra();
    } finally {
      config.semanas = savedWeeks;
      config.vigente = savedCurrent;
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    .rolling-day-selector { gap: 8px; }
    .rolling-day-chip { min-width: 66px; border-radius: 16px; padding: 8px 9px; display: grid; gap: 2px; text-align: center; }
    .rolling-day-name { font-size: .66rem; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
    .rolling-day-date { font-size: .82rem; font-weight: 800; white-space: nowrap; }
    .rolling-day-chip.today:not(.active) { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .rolling-day-chip.empty:not(.active) { opacity: .45; }
    .rolling-empty { margin-top: 2px; text-align: center; padding: 28px 18px; }
    .rolling-empty strong { display: block; margin-bottom: 6px; }
    .rolling-empty p { margin: 0; color: var(--ink-soft); }
    @media (min-width: 700px) {
      .rolling-menu-view { display: block; }
      .rolling-menu-view .cuadro-day-selector { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 16px; }
      .rolling-menu-view .cuadro-day-chip { border: 1px solid #dfe4e0; background: #fff; color: #626963; }
      .rolling-menu-view .cuadro-day-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
      .rolling-menu-view .cuadro02-meals { display: grid; gap: 12px; }
      .rolling-menu-view .cuadro02-meal-card { padding: 16px; border-radius: 18px; background: #fff; box-shadow: 0 6px 18px rgba(31,36,33,.06); }
      .rolling-menu-view .cuadro02-meal-card > h2 { margin: 0 0 11px; }
      .rolling-menu-view .cuadro-two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .rolling-menu-view .cuadro02-meal-card article { padding: 12px; border-radius: 14px; background: #f6f7f5; }
      .rolling-menu-view .cuadro-person-label { display: block; margin-bottom: 6px; color: var(--accent); font-size: .68rem; font-weight: 900; letter-spacing: .07em; }
      .rolling-menu-view .cuadro-day-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
      .rolling-menu-view .cuadro-day-nav button { min-height: 48px; border: 0; border-radius: 14px; padding: 10px 12px; background: #ecefec; font-weight: 750; }
      .rolling-menu-view .cuadro-day-nav button:first-child { text-align: left; }
      .rolling-menu-view .cuadro-day-nav button:last-child { text-align: right; }
      .rolling-menu-view .cuadro-day-nav button:disabled { opacity: .35; }
    }
  `;
  document.head.appendChild(style);
})();
