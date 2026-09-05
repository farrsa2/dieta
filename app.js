const app = document.querySelector('#app');
let config = null;
let lastRoute = null;
let mealOffset = 0;
let shoppingDayFilter = 'TODOS';
let shoppingHideBought = true;
let shoppingChannel = null;

const SUPABASE_URL = 'https://bfprtpaccxequkhmbugh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GDsKQmBp75EAWR99qw3KDA_mkq-SfP7';
const shoppingDb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  if (key !== 'compra') stopShoppingRealtime();
  if (key === 'proxima' && lastRoute !== 'proxima') mealOffset = 0;
  if (key === 'compra' && lastRoute !== 'compra') {
    shoppingDayFilter = 'TODOS';
    shoppingHideBought = true;
  }
  lastRoute = key;
  (routes[key] || routes.inicio)();
}

function pageHeader(title, subtitle = '') {
  return `<header class="page-header">
    <button class="back-button" type="button" onclick="location.hash='inicio'">← Inicio</button>
    <div><h1 class="page-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''}</div>
  </header>`;
}

function renderHome() {
  app.innerHTML = `<section class="home" aria-label="Inicio"><div class="home-grid">
    <button class="home-button" onclick="location.hash='cuadro01'">🍽️ Cuadro 01<span>Comidas, cenas y totales</span></button>
    <button class="home-button" onclick="location.hash='cuadro02'">📋 Cuadro 02<span>Semana completa por ingestas</span></button>
    <button class="home-button" onclick="location.hash='proxima'">⏱️ Próxima comida<span>Según día y hora</span></button>
    <button class="home-button" onclick="location.hash='compra'">🛒 Lista de la compra<span>Sincronizada entre móviles</span></button>
  </div></section>`;
}

function madridNowParts() {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: config?.timezone || 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: capitalize(p.weekday), time: `${p.hour}:${p.minute}` };
}

function activeWeek() {
  if (!config?.semanas?.length) return null;
  const now = madridNowParts();
  return config.semanas.find(w => now.date >= w.inicio && now.date <= w.fin)
    || config.semanas.find(w => w.id === config.vigente)
    || config.semanas[0];
}

async function renderMarkdownPage(title, fileKey) {
  const week = activeWeek();
  if (!week) return void (app.innerHTML = pageHeader(title) + '<div class="status">No hay una semana configurada.</div>');
  app.innerHTML = pageHeader(title, week.id) + '<div class="status">Cargando…</div>';
  try {
    const md = await fetchText(week.archivos[fileKey]);
    if (!window.marked) throw new Error('No se ha cargado el renderizador Markdown');
    app.innerHTML = pageHeader(title, week.id) + `<section class="card md-view"><div class="table-scroll">${marked.parse(md)}</div></section>`;
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader(title, week.id) + missingFileMessage(week.archivos[fileKey]);
  }
}

async function renderNextMeal() {
  const week = activeWeek();
  const now = madridNowParts();
  if (!week) return void (app.innerHTML = pageHeader('Próxima comida') + '<div class="status">No hay una semana configurada.</div>');
  app.innerHTML = pageHeader('Próxima comida', `${now.weekday} · ${now.time}`) + '<div class="status">Calculando…</div>';
  try {
    const data = parseCuadro02(await fetchText(week.archivos.cuadro02));
    const sequence = buildMealSequence(data);
    const baseIndex = computeCurrentMealIndex(sequence, now, config.horarios || {});
    if (baseIndex < 0) throw new Error('No se pudo determinar la ingesta actual');
    const displayIndex = Math.max(0, Math.min(sequence.length - 1, baseIndex + mealOffset));
    mealOffset = displayIndex - baseIndex;
    const current = sequence[displayIndex];
    const previous = sequence[displayIndex - 1] || null;
    const next = sequence[displayIndex + 1] || null;
    app.innerHTML = pageHeader('Próxima comida', `${current.day} · ${now.time}`) + `<section class="card next-card">
      <p class="meal-kicker">${mealOffset === 0 ? 'Según la hora actual' : 'Vista manual'}</p>
      <p class="meal-name">${escapeHtml(current.meal)}</p>
      <div class="people-grid">
        <article class="person"><h3>ALMU</h3><p>${formatMealCell(current.almu)}</p></article>
        <article class="person"><h3>FRAN</h3><p>${formatMealCell(current.fran)}</p></article>
      </div>
      <div class="meal-nav">
        <button class="meal-nav-button" type="button" ${previous ? '' : 'disabled'} onclick="shiftMeal(-1)"><span>← Anterior</span><strong>${previous ? escapeHtml(previous.meal) : '—'}</strong></button>
        <button class="meal-nav-button" type="button" ${next ? '' : 'disabled'} onclick="shiftMeal(1)"><span>Posterior →</span><strong>${next ? escapeHtml(next.meal) : '—'}</strong></button>
      </div>
    </section>`;
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader('Próxima comida') + missingFileMessage(week.archivos.cuadro02);
  }
}

window.shiftMeal = delta => { mealOffset += delta; renderNextMeal(); };

function buildMealSequence(data) {
  const result = [];
  for (const day of ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']) {
    for (const meal of ['Desayuno','Media mañana','Comida','Merienda','Cena']) {
      const entry = data[day]?.[meal];
      if (entry) result.push({ day, meal, almu: entry.almu || '', fran: entry.fran || '' });
    }
  }
  return result;
}

function computeCurrentMealIndex(sequence, now, schedule) {
  const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const dayPos = days.indexOf(now.weekday);
  if (dayPos < 0) return -1;
  let meal, targetDay = now.weekday;
  if (now.time < (schedule['Media mañana'] || '08:00')) meal = 'Desayuno';
  else if (now.time < (schedule['Comida'] || '11:00')) meal = 'Media mañana';
  else if (now.time < (schedule['Merienda'] || '16:00')) meal = 'Comida';
  else if (now.time < (schedule['Cena'] || '18:00')) meal = 'Merienda';
  else if (now.time < (schedule['Fin cena'] || '21:30')) meal = 'Cena';
  else { meal = 'Desayuno'; targetDay = days[dayPos + 1] || null; }
  if (!targetDay) return sequence.length - 1;
  return sequence.findIndex(item => item.day === targetDay && item.meal === meal);
}

async function renderShopping() {
  const week = activeWeek();
  if (!week) return void (app.innerHTML = pageHeader('Lista de la compra') + '<div class="status">No hay una semana configurada.</div>');
  const periodTitle = week.compra?.titulo || week.id;
  const listId = `${week.id}_${(week.compra?.dias || []).join('') || 'todo'}`;
  const storageKey = `compra_${listId}`;
  app.innerHTML = pageHeader('Lista de la compra', periodTitle) + '<div class="status">Preparando la lista…</div>';

  try {
    const source = await fetchText(week.archivos.compra);
    const items = week.archivos.compra.toLowerCase().endsWith('.csv') ? parseShoppingCsv(source) : parseShoppingMarkdown(source);
    if (!items.length) throw new Error('No se encontraron productos');

    const localChecked = JSON.parse(localStorage.getItem(storageKey) || '{}');
    let checked = { ...localChecked };
    let online = false;
    if (shoppingDb) {
      try {
        const { data, error } = await shoppingDb.from('shopping_checks').select('item_id,checked').eq('list_id', listId);
        if (error) throw error;
        checked = Object.fromEntries((data || []).map(row => [row.item_id, row.checked]));
        localStorage.setItem(storageKey, JSON.stringify(checked));
        online = true;
      } catch (error) {
        console.warn('Usando memoria local:', error);
      }
    }

    const availableDays = week.compra?.dias?.length ? week.compra.dias : collectShoppingDays(items);
    const grouped = groupShoppingItems(items);
    const totalProducts = items.length;
    const chips = ['TODOS', ...availableDays].map(day => `<button class="day-chip ${shoppingDayFilter === day ? 'active' : ''}" type="button" data-shopping-day="${day}">${day === 'TODOS' ? 'Todos' : escapeHtml(day)}</button>`).join('');
    const groupHtml = grouped.map(group => `<section class="shopping-group" data-shopping-group>
      <div class="shopping-category-head"><span class="shopping-category-icon">${group.icon}</span><h2>${escapeHtml(group.label)}</h2><span class="shopping-category-count">${group.items.length}</span></div>
      <div class="shopping-list">${group.items.map(item => shoppingItemHtml(item, checked)).join('')}</div>
    </section>`).join('');

    app.innerHTML = pageHeader('Lista de la compra', periodTitle) + `
      <section class="shopping-summary card">
        <div class="shopping-summary-top"><div><p class="shopping-eyebrow">🛒 COMPRA ${availableDays.join(' · ')}</p><h2><span id="shopping-count-done">0</span> de ${totalProducts} listos</h2></div><div class="shopping-percent" id="shopping-percent">0%</div></div>
        <div class="shopping-progress"><span id="shopping-progress-bar"></span></div>
        <p class="shopping-sync" id="shopping-sync">${online ? '🟢 Sincronización compartida activa' : '🟠 Modo local · sin conexión compartida'}</p>
        <div class="shopping-actions"><button class="soft-button active-soft" id="toggle-bought" type="button">Mostrar comprados</button><button class="soft-button danger-soft" id="reset-shopping" type="button">Desmarcar todo</button></div>
      </section>
      <nav class="shopping-day-filter" aria-label="Filtrar por día">${chips}</nav>
      <div class="shopping-groups">${groupHtml}</div>
      <div class="shopping-empty" id="shopping-empty" hidden>No hay productos pendientes para este filtro.</div>`;

    const saveLocal = () => localStorage.setItem(storageKey, JSON.stringify(checked));
    const syncLabel = app.querySelector('#shopping-sync');

    async function setSharedCheck(itemId, value) {
      checked[itemId] = value;
      saveLocal();
      if (!shoppingDb) return;
      const pin = await getShoppingPin();
      if (!pin) throw new Error('PIN_CANCELLED');
      const response = await fetch(`${SUPABASE_URL}/functions/v1/shopping-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ list_id: listId, item_id: itemId, checked: value, pin })
      });
      if (response.status === 401) {
        localStorage.removeItem('shopping_shared_pin');
        throw new Error('PIN_INVALID');
      }
      if (!response.ok) throw new Error(`SYNC_${response.status}`);
      if (syncLabel) syncLabel.textContent = '🟢 Sincronización compartida activa';
    }

    function updateItemFromState(itemId, value) {
      checked[itemId] = value;
      saveLocal();
      const label = [...app.querySelectorAll('.shopping-item')].find(el => el.dataset.id === itemId);
      if (label) {
        label.querySelector('input').checked = value;
        label.classList.toggle('checked', value);
      }
      refreshShoppingSummary();
      applyShoppingFilters();
    }

    app.querySelectorAll('.shopping-item input').forEach(input => input.addEventListener('change', async event => {
      const label = event.target.closest('.shopping-item');
      const itemId = label.dataset.id;
      const value = event.target.checked;
      updateItemFromState(itemId, value);
      try {
        await setSharedCheck(itemId, value);
      } catch (error) {
        console.error(error);
        updateItemFromState(itemId, !value);
        if (error.message === 'PIN_INVALID') alert('Código de compra incorrecto. Inténtalo de nuevo.');
        else if (error.message !== 'PIN_CANCELLED') alert('No se pudo sincronizar el cambio. Se ha restaurado el estado anterior.');
      }
    }));

    app.querySelectorAll('[data-shopping-day]').forEach(button => button.addEventListener('click', () => {
      shoppingDayFilter = button.dataset.shoppingDay;
      app.querySelectorAll('[data-shopping-day]').forEach(b => b.classList.toggle('active', b === button));
      applyShoppingFilters();
    }));

    app.querySelector('#toggle-bought').addEventListener('click', event => {
      shoppingHideBought = !shoppingHideBought;
      event.currentTarget.textContent = shoppingHideBought ? 'Mostrar comprados' : 'Ocultar comprados';
      event.currentTarget.classList.toggle('active-soft', shoppingHideBought);
      applyShoppingFilters();
    });

    app.querySelector('#reset-shopping').addEventListener('click', async () => {
      const ids = items.map(item => shoppingItemId(item.name)).filter(id => checked[id]);
      if (!ids.length) return;
      try {
        for (const id of ids) await setSharedCheck(id, false);
        ids.forEach(id => updateItemFromState(id, false));
      } catch (error) {
        console.error(error);
        alert('No se pudo reiniciar toda la lista.');
      }
    });

    function refreshShoppingSummary() {
      const done = items.filter(item => Boolean(checked[shoppingItemId(item.name)])).length;
      const percent = totalProducts ? Math.round(done / totalProducts * 100) : 0;
      app.querySelector('#shopping-count-done').textContent = done;
      app.querySelector('#shopping-percent').textContent = `${percent}%`;
      app.querySelector('#shopping-progress-bar').style.width = `${percent}%`;
    }

    function applyShoppingFilters() {
      let visibleCount = 0;
      app.querySelectorAll('.shopping-item').forEach(item => {
        const itemDays = (item.dataset.days || '').split(' ').filter(Boolean);
        const visible = (shoppingDayFilter === 'TODOS' || itemDays.includes(shoppingDayFilter)) && !(shoppingHideBought && item.querySelector('input').checked);
        item.hidden = !visible;
        if (visible) visibleCount++;
      });
      app.querySelectorAll('[data-shopping-group]').forEach(group => { group.hidden = ![...group.querySelectorAll('.shopping-item')].some(item => !item.hidden); });
      app.querySelector('#shopping-empty').hidden = visibleCount !== 0;
    }

    refreshShoppingSummary();
    applyShoppingFilters();
    if (shoppingDb) startShoppingRealtime(listId, updateItemFromState, syncLabel);
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader('Lista de la compra', periodTitle) + missingFileMessage(week.archivos.compra);
  }
}

function startShoppingRealtime(listId, onChange, syncLabel) {
  stopShoppingRealtime();
  shoppingChannel = shoppingDb.channel(`shopping-${listId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_checks', filter: `list_id=eq.${listId}` }, payload => {
      const row = payload.new;
      if (row?.item_id) onChange(row.item_id, row.checked);
    })
    .subscribe(status => {
      if (!syncLabel) return;
      if (status === 'SUBSCRIBED') syncLabel.textContent = '🟢 Sincronización compartida activa';
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') syncLabel.textContent = '🟠 Sincronización temporalmente desconectada';
    });
}

function stopShoppingRealtime() {
  if (shoppingChannel && shoppingDb) shoppingDb.removeChannel(shoppingChannel);
  shoppingChannel = null;
}

async function getShoppingPin() {
  let pin = localStorage.getItem('shopping_shared_pin');
  if (pin) return pin;
  pin = window.prompt('Código de compra compartida');
  if (!pin) return null;
  pin = pin.trim();
  localStorage.setItem('shopping_shared_pin', pin);
  return pin;
}

function shoppingItemHtml(item, checked) {
  const id = shoppingItemId(item.name);
  const isChecked = Boolean(checked[id]);
  const badges = item.days.map(day => `<span class="day-badge">${escapeHtml(day)}</span>`).join('');
  return `<label class="shopping-item ${isChecked ? 'checked' : ''}" data-id="${id}" data-days="${escapeHtml(item.days.join(' '))}">
    <input type="checkbox" ${isChecked ? 'checked' : ''} aria-label="Marcar ${escapeHtml(item.name)} como comprado" />
    <span class="shopping-text"><span class="shopping-name-row"><strong>${escapeHtml(item.name)}</strong><span class="shopping-days">${badges}</span></span>
    ${item.equivalence ? `<span class="shopping-buy">${escapeHtml(item.equivalence)}</span>` : ''}${item.amount ? `<span class="shopping-dose">Referencia dieta: ${escapeHtml(item.amount)}</span>` : ''}</span>
  </label>`;
}

function parseShoppingCsv(text) {
  const rows = [];
  for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim(); if (!line) continue;
    const separator = line.indexOf(';'); if (separator < 0) continue;
    const parts = line.slice(0, separator).trim().split(' | ').map(v => v.trim()).filter(Boolean);
    if (!parts.length) continue;
    let equivalence = '', amount = '';
    if (parts.length >= 3) { equivalence = parts.slice(1, -1).join(' | '); amount = parts.at(-1); }
    else if (parts.length === 2) amount = parts[1];
    rows.push({ name: parts[0], equivalence, amount, days: line.slice(separator + 1).trim().split(/\s+/).filter(Boolean) });
  }
  return rows;
}

function parseShoppingMarkdown(md) {
  const rows = []; let currentCategory = '';
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim(); if (!line.startsWith('|')) continue;
    const cells = splitMarkdownRow(line).map(cleanMarkdownText); if (cells.length < 4) continue;
    if (/^Alimento$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;
    const [name, amount, equivalence, days] = cells; if (!name) continue;
    if (name === name.toUpperCase() && !amount && !equivalence && !days) { currentCategory = name; continue; }
    rows.push({ name, amount, equivalence, days: String(days || '').split(/\s+/).filter(Boolean), category: currentCategory });
  }
  return rows;
}

function groupShoppingItems(items) {
  const definitions = [
    { key:'FRUTA Y VERDURA', label:'Fruta y verdura', icon:'🥬' }, { key:'CARNE', label:'Carne y fiambre', icon:'🥩' },
    { key:'PESCADO', label:'Pescado', icon:'🐟' }, { key:'HUEVOS', label:'Huevos', icon:'🥚' }, { key:'LACTEOS', label:'Lácteos', icon:'🧀' },
    { key:'PAN CEREALES', label:'Pan, pasta y cereales', icon:'🍞' }, { key:'CONSERVAS', label:'Conservas y similares', icon:'🥫' }, { key:'OTROS', label:'Otros', icon:'🧺' }
  ];
  const buckets = Object.fromEntries(definitions.map(def => [def.key, []]));
  items.forEach(item => (buckets[item.category ? categoryKeyFromLabel(item.category) : categoryForItem(item.name)] || buckets.OTROS).push(item));
  return definitions.map(def => ({ ...def, items: buckets[def.key] })).filter(group => group.items.length);
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
  if (n.includes('carne')) return 'CARNE'; if (n.includes('pescado')) return 'PESCADO'; if (n.includes('huevo')) return 'HUEVOS';
  if (n.includes('lacteo')) return 'LACTEOS'; if (n.includes('pan') || n.includes('cereal') || n.includes('pasta')) return 'PAN CEREALES';
  if (n.includes('legumbre') || n.includes('conserva')) return 'CONSERVAS'; return 'OTROS';
}

function collectShoppingDays(items) { const found = new Set(items.flatMap(item => item.days)); return ['L','M','X','J','V','S','D'].filter(day => found.has(day)); }
function shoppingItemId(name) { return `item-${normalizeKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`; }

function parseCuadro02(md) {
  const data = {}; let headers = null;
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim(); if (!line.startsWith('|')) continue;
    const cells = splitMarkdownRow(line);
    if (cells.some(c => /·\s*Almu/i.test(c)) && cells.some(c => /·\s*Fran/i.test(c))) { headers = cells.slice(1).map(cleanMarkdownText); continue; }
    if (!headers || cells.length < 3) continue;
    const meal = cleanMarkdownText(cells[0]); if (!['Desayuno','Media mañana','Comida','Merienda','Cena'].includes(meal)) continue;
    for (let i = 0; i < headers.length && i + 1 < cells.length; i++) {
      const match = headers[i].match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\s*·\s*(Almu|Fran)$/i); if (!match) continue;
      const day = capitalize(match[1]), person = match[2].toLowerCase(); data[day] ||= {}; data[day][meal] ||= {}; data[day][meal][person] = cells[i + 1].trim();
    }
  }
  return data;
}

function splitMarkdownRow(line) { return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()); }
function cleanMarkdownText(value) { return value.replace(/\*\*/g, '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/`/g, '').trim(); }
function formatMealCell(value) { if (!value) return '—'; const safe = value.replace(/<script[\s\S]*?<\/script>/gi, ''); return window.marked ? marked.parseInline(safe) : escapeHtml(cleanMarkdownText(safe)); }
async function fetchText(path) { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`${response.status} ${path}`); return response.text(); }
function missingFileMessage(path) { return `<div class="status">Todavía no está publicado <strong>${escapeHtml(path)}</strong> en el repositorio.</div>`; }
function normalizeKey(value = '') { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function capitalize(value = '') { return value ? value.charAt(0).toUpperCase() + value.slice(1) : value; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
