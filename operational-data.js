// Fuente operativa única: data/menu_14_dias.json
(() => {
  if (typeof init !== 'function' || typeof route !== 'function') return;

  window.removeEventListener('DOMContentLoaded', init);

  const MEALS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  const menuCache = new Map();
  let selectedDate = null;

  const dataUrl = (mime, text = '') => `data:${mime};charset=utf-8,${encodeURIComponent(String(text))}`;

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

  // Acepta tanto "Lunes Almu" como "Lunes · Almu".
  parseCuadro02 = function(md) {
    const data = {};
    let headers = null;
    for (const rawLine of md.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('|')) continue;
      const cells = splitMarkdownRow(line);
      const cleaned = cells.slice(1).map(cleanMarkdownText);
      const hasAlmu = cleaned.some(c => /\bAlmu$/i.test(c));
      const hasFran = cleaned.some(c => /\bFran$/i.test(c));
      if (hasAlmu && hasFran && cleaned.some(c => /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/i.test(c))) {
        headers = cleaned;
        continue;
      }
      if (!headers || cells.length < 3) continue;
      const meal = cleanMarkdownText(cells[0]);
      if (!MEALS.includes(meal)) continue;
      for (let i = 0; i < headers.length && i + 1 < cells.length; i++) {
        const match = headers[i].match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\s*(?:·\s*)?(Almu|Fran)$/i);
        if (!match) continue;
        const day = capitalize(match[1]);
        const person = match[2].toLowerCase();
        data[day] ||= {};
        data[day][meal] ||= {};
        data[day][meal][person] = cells[i + 1].trim();
      }
    }
    return data;
  };

  function loadedWeeks() {
    return [...(config?.semanas || [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
  }

  function weekForDate(iso) {
    return loadedWeeks().find(week => iso >= week.inicio && iso <= week.fin) || null;
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

  const rich = value => value
    ? (window.marked ? marked.parseInline(value) : escapeHtml(cleanMarkdownText(value)))
    : '<span class="muted">—</span>';

  const details = value => value
    ? `<details class="cuadro-ingredients"><summary>Ver ingredientes</summary><div class="cuadro-detail">${rich(value)}</div></details>`
    : '';

  function mealCard(meal, entry) {
    const almu = splitMeal(entry?.almu || '');
    const fran = splitMeal(entry?.fran || '');
    return `<section class="cuadro02-meal-card"><h2>${meal}</h2><div class="cuadro-two-cols">
      <article><span class="cuadro-person-label">ALMU</span><div class="cuadro-title">${rich(almu.title)}</div>${details(almu.detail)}</article>
      <article><span class="cuadro-person-label">FRAN</span><div class="cuadro-title">${rich(fran.title)}</div>${details(fran.detail)}</article>
    </div></section>`;
  }

  function rollingDates() {
    const today = madridNowParts().date;
    return Array.from({ length: 8 }, (_, i) => addDays(today, i - 1));
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
      return `<button type="button" class="cuadro-day-chip rolling-day-chip ${iso === selected ? 'active' : ''} ${iso === today ? 'today' : ''} ${loaded ? '' : 'empty'}" onclick="selectRollingDate('${iso}')"><span class="rolling-day-name">${escapeHtml(chipCaption(iso))}</span><span class="rolling-day-date">${Number(iso.slice(8, 10))} ${escapeHtml(monthShort(iso))}</span></button>`;
    }).join('')}</nav>`;
  }

  function dateNav(selected) {
    const dates = rollingDates();
    const i = dates.indexOf(selected);
    const prev = i > 0 ? dates[i - 1] : null;
    const next = i >= 0 && i < dates.length - 1 ? dates[i + 1] : null;
    return `<div class="cuadro-day-nav"><button type="button" ${prev ? `onclick="selectRollingDate('${prev}')"` : 'disabled'}>← ${prev ? dayName(prev) : '—'}</button><button type="button" ${next ? `onclick="selectRollingDate('${next}')"` : 'disabled'}>${next ? dayName(next) : '—'} →</button></div>`;
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
        body = entry ? `<div class="cuadro02-meals">${MEALS.map(meal => mealCard(meal, entry[meal])).join('')}</div>` : `<section class="rolling-empty card"><strong>${escapeHtml(longDate(iso))}</strong><p>No hay datos de dieta para este día.</p></section>`;
      } catch (error) {
        console.error(error);
        body = '<div class="status">No se pudo leer el menú de este día.</div>';
      }
    }
    app.innerHTML = `${pageHeader('Menú · 8 días', 'Ayer · hoy · +6 días')}<section class="cuadro-mobile-view rolling-menu-view"><div class="cuadro-mobile-top"><span>📋 MENÚ · 8 DÍAS</span><h1>${escapeHtml(longDate(iso))}</h1><p>Ayer, hoy y los seis días siguientes</p></div>${dateSelector(iso)}${body}${dateNav(iso)}</section>`;
  }

  window.selectRollingDate = iso => { selectedDate = iso; renderRollingMenu(); };

  async function operationalMealSequence() {
    const result = [];
    for (const week of loadedWeeks()) {
      const data = await menuForWeek(week);
      for (let iso = week.inicio; iso <= week.fin; iso = addDays(iso, 1)) {
        const day = dayName(iso);
        for (const meal of MEALS) {
          const entry = data[day]?.[meal];
          if (entry) result.push({ date: iso, day, meal, almu: entry.almu || '', fran: entry.fran || '' });
        }
      }
    }
    return result;
  }

  function baseMealTarget(now, schedule) {
    if (now.time < (schedule['Media mañana'] || '08:00')) return { date: now.date, meal: 'Desayuno' };
    if (now.time < (schedule['Comida'] || '11:00')) return { date: now.date, meal: 'Media mañana' };
    if (now.time < (schedule['Merienda'] || '16:00')) return { date: now.date, meal: 'Comida' };
    if (now.time < (schedule['Cena'] || '18:00')) return { date: now.date, meal: 'Merienda' };
    if (now.time < (schedule['Fin cena'] || '21:30')) return { date: now.date, meal: 'Cena' };
    return { date: addDays(now.date, 1), meal: 'Desayuno' };
  }

  async function renderNextMealOperational() {
    const now = madridNowParts();
    app.innerHTML = pageHeader('Próxima comida', `${now.weekday} · ${now.time}`) + '<div class="status">Calculando…</div>';
    try {
      const sequence = await operationalMealSequence();
      if (!sequence.length) throw new Error('No hay comidas operativas cargadas');
      const target = baseMealTarget(now, config.horarios || {});
      let baseIndex = sequence.findIndex(item => item.date === target.date && item.meal === target.meal);
      if (baseIndex < 0) baseIndex = sequence.findIndex(item => item.date >= target.date);
      if (baseIndex < 0) baseIndex = sequence.length - 1;
      const displayIndex = Math.max(0, Math.min(sequence.length - 1, baseIndex + mealOffset));
      mealOffset = displayIndex - baseIndex;
      const current = sequence[displayIndex];
      const previous = sequence[displayIndex - 1] || null;
      const next = sequence[displayIndex + 1] || null;
      app.innerHTML = pageHeader('Próxima comida', `${longDate(current.date)} · ${now.time}`) + `<section class="card next-card"><p class="meal-kicker">${mealOffset === 0 ? 'Según la hora actual' : 'Vista manual'}</p><p class="meal-name">${escapeHtml(current.meal)}</p><div class="people-grid"><article class="person"><h3>ALMU</h3><p>${formatMealCell(current.almu)}</p></article><article class="person"><h3>FRAN</h3><p>${formatMealCell(current.fran)}</p></article></div><div class="meal-nav"><button class="meal-nav-button" type="button" ${previous ? '' : 'disabled'} onclick="shiftMeal(-1)"><span>← Anterior</span><strong>${previous ? escapeHtml(previous.meal) : '—'}</strong></button><button class="meal-nav-button" type="button" ${next ? '' : 'disabled'} onclick="shiftMeal(1)"><span>Posterior →</span><strong>${next ? escapeHtml(next.meal) : '—'}</strong></button></div></section>`;
    } catch (error) {
      console.error(error);
      app.innerHTML = pageHeader('Próxima comida') + '<div class="status">No hay una próxima comida disponible en la ventana cargada.</div>';
    }
  }

  window.shiftMeal = delta => { mealOffset += delta; renderNextMealOperational(); };

  async function initOperationalData() {
    try {
      const response = await fetch('data/menu_14_dias.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} data/menu_14_dias.json`);
      const envelope = await response.json();
      let data = envelope;
      if (envelope?.encoding === 'gzip+base64' && envelope.payload) {
        const binary = Uint8Array.from(atob(envelope.payload), char => char.charCodeAt(0));
        const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        data = JSON.parse(text);
      }
      if (!Array.isArray(data.weeks) || !data.documents || !data.shopping) throw new Error('Estructura operativa inválida');

      window.DIET_OPERATIONAL = data;
      window.DIET_RECIPES = data.recipes || {};

      config = {
        timezone: data.timezone || 'Europe/Madrid',
        horarios: data.horarios || {},
        vigente: null,
        semanas: data.weeks.map(week => {
          const document = data.documents[week.document] || {};
          return {
            id: week.id,
            inicio: week.inicio,
            fin: week.fin,
            archivos: {
              historico: week.historico || '',
              cuadro01: dataUrl('text/markdown', document.main_markdown || ''),
              cuadro02: dataUrl('text/markdown', document.menu_markdown || ''),
              compra: 'data/20260907_SEMANA01_COMPRA_LMX.csv'
            },
            compra: {
              dias: data.shopping?.dias || ['L','M','X'],
              titulo: data.shopping?.titulo || 'Lunes · Martes · Miércoles',
              usos: dataUrl('application/json', JSON.stringify(data.shopping?.uses || {}))
            }
          };
        })
      };

      const now = madridNowParts();
      const current = config.semanas.find(week => now.date >= week.inicio && now.date <= week.fin);
      config.vigente = current?.id || config.semanas[config.semanas.length - 1]?.id || null;

      routes.cuadro02 = renderRollingMenu;
      routes.proxima = renderNextMealOperational;
      routes.compra = renderShopping;
      route();
    } catch (error) {
      console.error(error);
      app.innerHTML = '<div class="status">No se pudo cargar <strong>data/menu_14_dias.json</strong>.</div>';
    }
  }

  window.addEventListener('DOMContentLoaded', initOperationalData);
})();