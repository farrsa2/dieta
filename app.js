const app = document.querySelector('#app');
let config = null;
let lastRoute = null;
let mealOffset = 0;
let shoppingDayFilter = 'TODOS';
let shoppingHideBought = false;

const routes = {
  inicio: renderHome,
  cuadro01: () => renderMarkdownPage('Cuadro 01', 'cuadro01'),
  cuadro02: () => renderMarkdownPage('Cuadro 02', 'cuadro02'),
  proxima: renderNextMeal,
  compra: renderShopping
};

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const response = await fetch('semanas.json', { cache: 'no-store' });
    config = await response.json();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="status">No se pudo cargar la configuración de semanas.</div>';
    return;
  }
  route();
}

function route() {
  const key = location.hash.replace('#', '') || 'inicio';
  if (key === 'proxima' && lastRoute !== 'proxima') mealOffset = 0;
  if (key === 'compra' && lastRoute !== 'compra') {
    shoppingDayFilter = 'TODOS';
    shoppingHideBought = false;
  }
  lastRoute = key;
  (routes[key] || routes.inicio)();
}

function pageHeader(title, subtitle = '') {
  return `
    <header class="page-header">
      <button class="back-button" type="button" onclick="location.hash='inicio'">← Inicio</button>
      <div>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
    </header>`;
}

function renderHome() {
  app.innerHTML = `
    <section class="home" aria-label="Inicio">
      <div class="home-grid">
        <button class="home-button" onclick="location.hash='cuadro01'">🍽️ Cuadro 01<span>Comidas, cenas y totales</span></button>
        <button class="home-button" onclick="location.hash='cuadro02'">📋 Cuadro 02<span>Semana completa por ingestas</span></button>
        <button class="home-button" onclick="location.hash='proxima'">⏱️ Próxima comida<span>Según día y hora</span></button>
        <button class="home-button" onclick="location.hash='compra'">🛒 Lista de la compra<span>Con checks persistentes</span></button>
      </div>
    </section>`;
}

function madridNowParts() {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: config?.timezone || 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: capitalize(p.weekday),
    time: `${p.hour}:${p.minute}`
  };
}

function activeWeek() {
  if (!config?.semanas?.length) return null;
  const now = madridNowParts();
  const byDate = config.semanas.find(w => now.date >= w.inicio && now.date <= w.fin);
  return byDate || config.semanas.find(w => w.id === config.vigente) || config.semanas[0];
}

async function renderMarkdownPage(title, fileKey) {
  const week = activeWeek();
  if (!week) {
    app.innerHTML = pageHeader(title) + '<div class="status">No hay una semana configurada.</div>';
    return;
  }
  app.innerHTML = pageHeader(title, week.id) + '<div class="status">Cargando…</div>';
  try {
    const md = await fetchText(week.archivos[fileKey]);
    if (!window.marked) throw new Error('No se ha cargado el renderizador Markdown');
    const html = marked.parse(md);
    app.innerHTML = pageHeader(title, week.id) + `<section class="card md-view"><div class="table-scroll">${html}</div></section>`;
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader(title, week.id) + missingFileMessage(week.archivos[fileKey]);
  }
}

async function renderNextMeal() {
  const week = activeWeek();
  const now = madridNowParts();
  app.innerHTML = pageHeader('Próxima comida', `${now.weekday} · ${now.time}`) + '<div class="status">Calculando…</div>';

  if (!week) {
    app.innerHTML = pageHeader('Próxima comida') + '<div class="status">No hay una semana configurada.</div>';
    return;
  }

  try {
    const md = await fetchText(week.archivos.cuadro02);
    const data = parseCuadro02(md);
    const sequence = buildMealSequence(data);
    const baseIndex = computeCurrentMealIndex(sequence, now, config.horarios || {});

    if (baseIndex < 0) throw new Error('No se pudo determinar la ingesta actual');

    const displayIndex = Math.max(0, Math.min(sequence.length - 1, baseIndex + mealOffset));
    mealOffset = displayIndex - baseIndex;
    const current = sequence[displayIndex];
    const previous = sequence[displayIndex - 1] || null;
    const next = sequence[displayIndex + 1] || null;

    app.innerHTML = pageHeader('Próxima comida', `${current.day} · ${now.time}`) + `
      <section class="card next-card">
        <p class="meal-kicker">${mealOffset === 0 ? 'Según la hora actual' : 'Vista manual'}</p>
        <p class="meal-name">${escapeHtml(current.meal)}</p>
        <div class="people-grid">
          <article class="person"><h3>ALMU</h3><p>${formatMealCell(current.almu)}</p></article>
          <article class="person"><h3>FRAN</h3><p>${formatMealCell(current.fran)}</p></article>
        </div>
        <div class="meal-nav">
          <button class="meal-nav-button" type="button" ${previous ? '' : 'disabled'} onclick="shiftMeal(-1)">
            <span>← Anterior</span>
            <strong>${previous ? escapeHtml(previous.meal) : '—'}</strong>
          </button>
          <button class="meal-nav-button" type="button" ${next ? '' : 'disabled'} onclick="shiftMeal(1)">
            <span>Posterior →</span>
            <strong>${next ? escapeHtml(next.meal) : '—'}</strong>
          </button>
        </div>
      </section>`;
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader('Próxima comida') + missingFileMessage(week.archivos.cuadro02);
  }
}

window.shiftMeal = function(delta) {
  mealOffset += delta;
  renderNextMeal();
};

function buildMealSequence(data) {
  const weekOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const meals = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  const result = [];
  for (const day of weekOrder) {
    for (const meal of meals) {
      const entry = data[day]?.[meal];
      if (!entry) continue;
      result.push({ day, meal, almu: entry.almu || '', fran: entry.fran || '' });
    }
  }
  return result;
}

function computeCurrentMealIndex(sequence, now, schedule) {
  const weekOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const dayPos = weekOrder.indexOf(now.weekday);
  if (dayPos < 0) return -1;

  let meal;
  let targetDay = now.weekday;

  if (now.time < (schedule['Media mañana'] || '08:00')) {
    meal = 'Desayuno';
  } else if (now.time < (schedule['Comida'] || '11:00')) {
    meal = 'Media mañana';
  } else if (now.time < (schedule['Merienda'] || '16:00')) {
    meal = 'Comida';
  } else if (now.time < (schedule['Cena'] || '18:00')) {
    meal = 'Merienda';
  } else if (now.time < (schedule['Fin cena'] || '21:30')) {
    meal = 'Cena';
  } else {
    meal = 'Desayuno';
    targetDay = weekOrder[dayPos + 1] || null;
  }

  if (!targetDay) return sequence.length - 1;
  return sequence.findIndex(item => item.day === targetDay && item.meal === meal);
}

async function renderShopping() {
  const week = activeWeek();
  if (!week) {
    app.innerHTML = pageHeader('Lista de la compra') + '<div class="status">No hay una semana configurada.</div>';
    return;
  }

  const periodTitle = week.compra?.titulo || week.id;
  app.innerHTML = pageHeader('Lista de la compra', periodTitle) + '<div class="status">Preparando la lista…</div>';

  try {
    const source = await fetchText(week.archivos.compra);
    const items = week.archivos.compra.toLowerCase().endsWith('.csv')
      ? parseShoppingCsv(source)
      : parseShoppingMarkdown(source);

    if (!items.length) throw new Error('No se encontraron productos');

    const storageKey = `compra_${week.id}_${(week.compra?.dias || []).join('') || 'todo'}`;
    const checked = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const availableDays = week.compra?.dias?.length ? week.compra.dias : collectShoppingDays(items);
    const grouped = groupShoppingItems(items);
    const totalProducts = items.length;

    const chips = ['TODOS', ...availableDays].map(day => `
      <button class="day-chip ${shoppingDayFilter === day ? 'active' : ''}" type="button" data-shopping-day="${day}">
        ${day === 'TODOS' ? 'Todos' : escapeHtml(day)}
      </button>`).join('');

    const groupHtml = grouped.map(group => `
      <section class="shopping-group" data-shopping-group>
        <div class="shopping-category-head">
          <span class="shopping-category-icon">${group.icon}</span>
          <h2>${escapeHtml(group.label)}</h2>
          <span class="shopping-category-count">${group.items.length}</span>
        </div>
        <div class="shopping-list">
          ${group.items.map(item => shoppingItemHtml(item, checked)).join('')}
        </div>
      </section>`).join('');

    app.innerHTML = pageHeader('Lista de la compra', periodTitle) + `
      <section class="shopping-summary card">
        <div class="shopping-summary-top">
          <div>
            <p class="shopping-eyebrow">🛒 COMPRA ${availableDays.join(' · ')}</p>
            <h2><span id="shopping-count-done">0</span> de ${totalProducts} listos</h2>
          </div>
          <div class="shopping-percent" id="shopping-percent">0%</div>
        </div>
        <div class="shopping-progress" aria-hidden="true"><span id="shopping-progress-bar"></span></div>
        <div class="shopping-actions">
          <button class="soft-button" id="toggle-bought" type="button">Ocultar comprados</button>
          <button class="soft-button danger-soft" id="reset-shopping" type="button">Desmarcar todo</button>
        </div>
      </section>

      <nav class="shopping-day-filter" aria-label="Filtrar por día">${chips}</nav>

      <div class="shopping-groups">${groupHtml}</div>
      <div class="shopping-empty" id="shopping-empty" hidden>No hay productos para este filtro.</div>`;

    const save = () => localStorage.setItem(storageKey, JSON.stringify(checked));

    app.querySelectorAll('.shopping-item input').forEach(input => {
      input.addEventListener('change', event => {
        const label = event.target.closest('.shopping-item');
        checked[label.dataset.id] = event.target.checked;
        label.classList.toggle('checked', event.target.checked);
        save();
        refreshShoppingSummary();
        applyShoppingFilters();
      });
    });

    app.querySelectorAll('[data-shopping-day]').forEach(button => {
      button.addEventListener('click', () => {
        shoppingDayFilter = button.dataset.shoppingDay;
        app.querySelectorAll('[data-shopping-day]').forEach(b => b.classList.toggle('active', b === button));
        applyShoppingFilters();
      });
    });

    app.querySelector('#toggle-bought').addEventListener('click', event => {
      shoppingHideBought = !shoppingHideBought;
      event.currentTarget.textContent = shoppingHideBought ? 'Mostrar comprados' : 'Ocultar comprados';
      event.currentTarget.classList.toggle('active-soft', shoppingHideBought);
      applyShoppingFilters();
    });

    app.querySelector('#reset-shopping').addEventListener('click', () => {
      localStorage.removeItem(storageKey);
      Object.keys(checked).forEach(key => delete checked[key]);
      app.querySelectorAll('.shopping-item input').forEach(input => { input.checked = false; });
      app.querySelectorAll('.shopping-item').forEach(item => item.classList.remove('checked'));
      refreshShoppingSummary();
      applyShoppingFilters();
    });

    function refreshShoppingSummary() {
      const boxes = [...app.querySelectorAll('.shopping-item input')];
      const done = boxes.filter(box => box.checked).length;
      const percent = totalProducts ? Math.round((done / totalProducts) * 100) : 0;
      app.querySelector('#shopping-count-done').textContent = done;
      app.querySelector('#shopping-percent').textContent = `${percent}%`;
      app.querySelector('#shopping-progress-bar').style.width = `${percent}%`;
    }

    function applyShoppingFilters() {
      let visibleCount = 0;
      app.querySelectorAll('.shopping-item').forEach(item => {
        const itemDays = (item.dataset.days || '').split(' ').filter(Boolean);
        const matchesDay = shoppingDayFilter === 'TODOS' || itemDays.includes(shoppingDayFilter);
        const isBought = item.querySelector('input').checked;
        const visible = matchesDay && !(shoppingHideBought && isBought);
        item.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      app.querySelectorAll('[data-shopping-group]').forEach(group => {
        const hasVisible = [...group.querySelectorAll('.shopping-item')].some(item => !item.hidden);
        group.hidden = !hasVisible;
      });

      app.querySelector('#shopping-empty').hidden = visibleCount !== 0;
    }

    refreshShoppingSummary();
    applyShoppingFilters();
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader('Lista de la compra', periodTitle) + missingFileMessage(week.archivos.compra);
  }
}

function shoppingItemHtml(item, checked) {
  const id = shoppingItemId(item.name);
  const isChecked = Boolean(checked[id]);
  const badges = item.days.map(day => `<span class="day-badge">${escapeHtml(day)}</span>`).join('');
  return `
    <label class="shopping-item ${isChecked ? 'checked' : ''}" data-id="${id}" data-days="${escapeHtml(item.days.join(' '))}">
      <input type="checkbox" ${isChecked ? 'checked' : ''} aria-label="Marcar ${escapeHtml(item.name)} como comprado" />
      <span class="shopping-text">
        <span class="shopping-name-row">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="shopping-days">${badges}</span>
        </span>
        ${item.equivalence ? `<span class="shopping-buy">${escapeHtml(item.equivalence)}</span>` : ''}
        ${item.amount ? `<span class="shopping-dose">Referencia dieta: ${escapeHtml(item.amount)}</span>` : ''}
      </span>
    </label>`;
}

function parseShoppingCsv(text) {
  const rows = [];
  const clean = text.replace(/^\uFEFF/, '');
  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(';');
    if (separator < 0) continue;
    const left = line.slice(0, separator).trim();
    const dayText = line.slice(separator + 1).trim();
    const parts = left.split(' | ').map(value => value.trim()).filter(Boolean);
    if (!parts.length) continue;

    const name = parts[0];
    let equivalence = '';
    let amount = '';
    if (parts.length >= 3) {
      equivalence = parts.slice(1, -1).join(' | ');
      amount = parts[parts.length - 1];
    } else if (parts.length === 2) {
      amount = parts[1];
    }

    rows.push({
      name,
      equivalence,
      amount,
      days: dayText.split(/\s+/).filter(Boolean)
    });
  }
  return rows;
}

function parseShoppingMarkdown(md) {
  const rows = [];
  let currentCategory = '';
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) continue;
    const cells = splitMarkdownRow(line).map(cleanMarkdownText);
    if (cells.length < 4) continue;
    if (/^Alimento$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;
    const [name, amount, equivalence, days] = cells;
    if (!name) continue;
    if (name === name.toUpperCase() && !amount && !equivalence && !days) {
      currentCategory = name;
      continue;
    }
    rows.push({
      name,
      amount,
      equivalence,
      days: String(days || '').split(/\s+/).filter(Boolean),
      category: currentCategory
    });
  }
  return rows;
}

function groupShoppingItems(items) {
  const definitions = [
    { key: 'FRUTA Y VERDURA', label: 'Fruta y verdura', icon: '🥬' },
    { key: 'CARNE', label: 'Carne y fiambre', icon: '🥩' },
    { key: 'PESCADO', label: 'Pescado', icon: '🐟' },
    { key: 'HUEVOS', label: 'Huevos', icon: '🥚' },
    { key: 'LACTEOS', label: 'Lácteos', icon: '🧀' },
    { key: 'PAN CEREALES', label: 'Pan, pasta y cereales', icon: '🍞' },
    { key: 'CONSERVAS', label: 'Conservas y similares', icon: '🥫' },
    { key: 'OTROS', label: 'Otros', icon: '🧺' }
  ];

  const buckets = Object.fromEntries(definitions.map(def => [def.key, []]));
  items.forEach(item => {
    const key = item.category ? categoryKeyFromLabel(item.category) : categoryForItem(item.name);
    (buckets[key] || buckets.OTROS).push(item);
  });

  return definitions
    .map(def => ({ ...def, items: buckets[def.key] }))
    .filter(group => group.items.length);
}

function categoryForItem(name) {
  const n = normalizeKey(name);
  if (n.includes('salsa de tomate') || n.includes('atun en lata') || n.includes('aceituna')) return 'CONSERVAS';
  if (/(jamon|fiambre|lomo fresco|pechuga de pollo|pechuga de pavo)/.test(n)) return 'CARNE';
  if (/(salmon|merluza|rape|sepia|bacalao|almeja|mejillon)/.test(n)) return 'PESCADO';
  if (n === 'huevo' || n.includes('huevos')) return 'HUEVOS';
  if (/(queso|yogur)/.test(n)) return 'LACTEOS';
  if (/(pan integral|tortitas|macarrones|corn flakes|copos de avena|quinoa|arroz|pasta|cereal)/.test(n)) return 'PAN CEREALES';
  if (/(fruta|tomate fresco|patata|guisante|zanahoria|cebolla|pimiento|cebolleta|lechuga|rabano|calabaza|apio|puerro|pepino|calabacin)/.test(n)) return 'FRUTA Y VERDURA';
  return 'OTROS';
}

function categoryKeyFromLabel(label) {
  const n = normalizeKey(label);
  if (n.includes('fruta') || n.includes('verdura')) return 'FRUTA Y VERDURA';
  if (n.includes('carne')) return 'CARNE';
  if (n.includes('pescado')) return 'PESCADO';
  if (n.includes('huevo')) return 'HUEVOS';
  if (n.includes('lacteo')) return 'LACTEOS';
  if (n.includes('pan') || n.includes('cereal') || n.includes('pasta')) return 'PAN CEREALES';
  if (n.includes('legumbre') || n.includes('conserva')) return 'CONSERVAS';
  return 'OTROS';
}

function collectShoppingDays(items) {
  const order = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const found = new Set(items.flatMap(item => item.days));
  return order.filter(day => found.has(day));
}

function shoppingItemId(name) {
  return `item-${normalizeKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function parseCuadro02(md) {
  const data = {};
  let headers = null;
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) continue;
    const cells = splitMarkdownRow(line);
    if (cells.some(c => /·\s*Almu/i.test(c)) && cells.some(c => /·\s*Fran/i.test(c))) {
      headers = cells.slice(1).map(cleanMarkdownText);
      continue;
    }
    if (!headers || cells.length < 3) continue;
    const meal = cleanMarkdownText(cells[0]);
    if (!['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'].includes(meal)) continue;
    for (let i = 0; i < headers.length && i + 1 < cells.length; i++) {
      const match = headers[i].match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\s*·\s*(Almu|Fran)$/i);
      if (!match) continue;
      const day = capitalize(match[1]);
      const person = match[2].toLowerCase();
      data[day] ||= {};
      data[day][meal] ||= {};
      data[day][meal][person] = cells[i + 1].trim();
    }
  }
  return data;
}

function splitMarkdownRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function cleanMarkdownText(value) {
  return value
    .replace(/\*\*/g, '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/`/g, '')
    .trim();
}

function formatMealCell(value) {
  if (!value) return '—';
  const safe = value.replace(/<script[\s\S]*?<\/script>/gi, '');
  return window.marked ? marked.parseInline(safe) : escapeHtml(cleanMarkdownText(safe));
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return response.text();
}

function missingFileMessage(path) {
  return `<div class="status">Todavía no está publicado <strong>${escapeHtml(path)}</strong> en el repositorio.</div>`;
}

function normalizeKey(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function capitalize(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}
