const app = document.querySelector('#app');
let config = null;

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

  const schedule = config.horarios || {};
  const defined = Object.values(schedule).every(Boolean);
  if (!defined) {
    app.innerHTML = pageHeader('Próxima comida', `${now.weekday} · ${now.time}`) + `
      <div class="status">
        La lógica ya está preparada, pero faltan por definir los horarios de Desayuno, Media mañana, Comida, Merienda y Cena en <strong>semanas.json</strong>.
      </div>`;
    return;
  }

  try {
    const md = await fetchText(week.archivos.cuadro02);
    const data = parseCuadro02(md);
    const next = computeNextMeal(data, now, schedule);
    if (!next) throw new Error('No se pudo determinar la próxima ingesta');

    app.innerHTML = pageHeader('Próxima comida', `${next.day} · ${next.time}`) + `
      <section class="card next-card">
        <h2>Próxima ingesta</h2>
        <p class="meal-name">${escapeHtml(next.meal)}</p>
        <div class="people-grid">
          <article class="person"><h3>ALMU</h3><p>${formatMealCell(next.almu)}</p></article>
          <article class="person"><h3>FRAN</h3><p>${formatMealCell(next.fran)}</p></article>
        </div>
      </section>`;
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader('Próxima comida') + missingFileMessage(week.archivos.cuadro02);
  }
}

async function renderShopping() {
  const week = activeWeek();
  if (!week) {
    app.innerHTML = pageHeader('Lista de la compra') + '<div class="status">No hay una semana configurada.</div>';
    return;
  }

  app.innerHTML = pageHeader('Lista de la compra', week.id) + '<div class="status">Cargando…</div>';
  try {
    const md = await fetchText(week.archivos.compra);
    const items = parseShoppingMarkdown(md);
    if (!items.length) throw new Error('No se encontraron productos');
    const storageKey = `compra_${week.id}`;
    const checked = JSON.parse(localStorage.getItem(storageKey) || '{}');

    const itemHtml = items.map((item, index) => {
      if (item.category) return `<h2 class="category-title">${escapeHtml(item.category)}</h2>`;
      const id = `item-${index}`;
      const isChecked = Boolean(checked[id]);
      return `
        <label class="shopping-item ${isChecked ? 'checked' : ''}" data-id="${id}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} />
          <span class="shopping-text">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="shopping-meta">${escapeHtml([item.amount, item.equivalence, item.days].filter(Boolean).join(' · '))}</span>
          </span>
        </label>`;
    }).join('');

    const totalProducts = items.filter(i => !i.category).length;
    app.innerHTML = pageHeader('Lista de la compra', week.id) + `
      <section>
        <div class="shopping-toolbar">
          <strong id="shopping-count"></strong>
          <button class="reset-button" type="button" id="reset-shopping">Desmarcar todo</button>
        </div>
        <div class="shopping-list">${itemHtml}</div>
      </section>`;

    const refreshCount = () => {
      const boxes = [...app.querySelectorAll('.shopping-item input')];
      const done = boxes.filter(b => b.checked).length;
      app.querySelector('#shopping-count').textContent = `${done} / ${totalProducts} comprados`;
    };

    app.querySelectorAll('.shopping-item input').forEach(input => {
      input.addEventListener('change', event => {
        const label = event.target.closest('.shopping-item');
        const id = label.dataset.id;
        checked[id] = event.target.checked;
        label.classList.toggle('checked', event.target.checked);
        localStorage.setItem(storageKey, JSON.stringify(checked));
        refreshCount();
      });
    });

    app.querySelector('#reset-shopping').addEventListener('click', () => {
      localStorage.removeItem(storageKey);
      renderShopping();
    });
    refreshCount();
  } catch (error) {
    console.error(error);
    app.innerHTML = pageHeader('Lista de la compra', week.id) + `
      ${missingFileMessage(week.archivos.compra)}
      <div class="status" style="margin-top:12px">La vista y los checks ya están implementados. Se activará al publicar el Markdown aprobado de compra.</div>`;
  }
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

function computeNextMeal(data, now, schedule) {
  const meals = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  const weekOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const dayPosition = weekOrder.indexOf(now.weekday);

  if (dayPosition >= 0) {
    for (const meal of meals) {
      if (now.time < schedule[meal] && data[now.weekday]?.[meal]) {
        return buildNext(now.weekday, meal, schedule[meal], data[now.weekday][meal]);
      }
    }
    for (let offset = 1; offset <= 7; offset++) {
      const day = weekOrder[(dayPosition + offset) % 7];
      if (data[day]?.Desayuno) return buildNext(day, 'Desayuno', schedule['Desayuno'], data[day].Desayuno);
    }
  }

  const firstDay = weekOrder.find(day => data[day]?.Desayuno);
  if (firstDay) return buildNext(firstDay, 'Desayuno', schedule['Desayuno'], data[firstDay].Desayuno);
  return null;
}

function buildNext(day, meal, time, entry) {
  return { day, meal, time, almu: entry.almu || '', fran: entry.fran || '' };
}

function parseShoppingMarkdown(md) {
  const rows = [];
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) continue;
    const cells = splitMarkdownRow(line).map(cleanMarkdownText);
    if (cells.length < 4) continue;
    if (/^Alimento$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;
    const [name, amount, equivalence, days] = cells;
    if (!name) continue;
    if (name === name.toUpperCase() && !amount && !equivalence && !days) {
      rows.push({ category: name });
    } else {
      rows.push({ name, amount, equivalence, days });
    }
  }
  return rows;
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

function capitalize(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}
