// Vistas mobile-first para Cuadro 01 y Cuadro 02.
// En escritorio se conserva el Markdown/tablas originales.
// En móvil los ingredientes quedan plegados por defecto.

(() => {
  if (typeof routes === 'undefined') return;

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const MEALS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  let cuadro01Day = null;
  let cuadro02Day = null;

  const isMobile = () => window.matchMedia('(max-width: 699px)').matches;

  function defaultDay() {
    const today = typeof madridNowParts === 'function' ? madridNowParts().weekday : '';
    return DAYS.includes(today) ? today : 'Lunes';
  }

  function daySelector(selected, handlerName) {
    return `<nav class="cuadro-day-selector" aria-label="Seleccionar día">
      ${DAYS.map(day => `<button type="button" class="cuadro-day-chip ${day === selected ? 'active' : ''}" onclick="${handlerName}('${day}')">${day.slice(0, 3)}</button>`).join('')}
    </nav>`;
  }

  function dayNav(selected, handlerName) {
    const i = DAYS.indexOf(selected);
    const prev = i > 0 ? DAYS[i - 1] : null;
    const next = i < DAYS.length - 1 ? DAYS[i + 1] : null;
    return `<div class="cuadro-day-nav">
      <button type="button" ${prev ? '' : 'disabled'} onclick="${prev ? `${handlerName}('${prev}')` : ''}">← ${prev || '—'}</button>
      <button type="button" ${next ? '' : 'disabled'} onclick="${next ? `${handlerName}('${next}')` : ''}">${next || '—'} →</button>
    </div>`;
  }

  function rich(value = '') {
    if (!value) return '<span class="muted">—</span>';
    return window.marked ? marked.parseInline(value) : escapeHtml(cleanMarkdownText(value));
  }

  function ingredientDetails(detail) {
    if (!detail) return '';
    return `<details class="cuadro-ingredients">
      <summary>Ver ingredientes</summary>
      <div class="cuadro-detail">${rich(detail)}</div>
    </details>`;
  }

  function splitMd(line) {
    return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(v => v.trim());
  }

  function parseCuadro01(md) {
    const lines = md.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const start = lines.findIndex(line => line.startsWith('|') && /Comida Almu/i.test(line) && /Cena total/i.test(line));
    if (start < 0) return {};
    const data = {};
    for (let i = start + 2; i < lines.length; i++) {
      if (!lines[i].startsWith('|')) break;
      const row = splitMd(lines[i]);
      if (row.length < 7) continue;
      const day = cleanMarkdownText(row[0]).replace(/\*\*/g, '');
      if (!DAYS.includes(day)) continue;
      const detail = (lines[i + 1]?.startsWith('|')) ? splitMd(lines[i + 1]) : [];
      data[day] = {
        comida: {
          almuTitle: row[1], franTitle: row[2], totalTitle: row[3],
          almuDetail: detail[1] || '', franDetail: detail[2] || '', totalDetail: detail[3] || ''
        },
        cena: {
          almuTitle: row[4], franTitle: row[5], totalTitle: row[6],
          almuDetail: detail[4] || '', franDetail: detail[5] || '', totalDetail: detail[6] || ''
        }
      };
      if (detail.length >= 7) i += 1;
    }
    return data;
  }

  function personCard(label, title, detail) {
    return `<article class="cuadro-person-card">
      <span class="cuadro-person-label">${label}</span>
      <div class="cuadro-title">${rich(title)}</div>
      ${ingredientDetails(detail)}
    </article>`;
  }

  function totalCard(title, detail) {
    return `<article class="cuadro-total-card">
      <span class="cuadro-total-label">TOTAL PREPARACIÓN</span>
      <div class="cuadro-title">${rich(title)}</div>
      ${ingredientDetails(detail)}
    </article>`;
  }

  function meal01(label, meal) {
    return `<section class="cuadro-meal-block">
      <h2>${label === 'Comida' ? '🍽️' : '🌙'} ${label}</h2>
      <div class="cuadro-two-cols">
        ${personCard('ALMU', meal.almuTitle, meal.almuDetail)}
        ${personCard('FRAN', meal.franTitle, meal.franDetail)}
      </div>
      ${totalCard(meal.totalTitle, meal.totalDetail)}
    </section>`;
  }

  async function renderCuadro01Mobile() {
    const week = activeWeek();
    if (!week) return void (app.innerHTML = pageHeader('Cuadro 01') + '<div class="status">No hay una semana configurada.</div>');
    cuadro01Day ||= defaultDay();
    app.innerHTML = '<div class="status">Cargando Cuadro 01…</div>';
    try {
      const data = parseCuadro01(await fetchText(week.archivos.cuadro01));
      if (!data[cuadro01Day]) cuadro01Day = DAYS.find(day => data[day]) || 'Lunes';
      const d = data[cuadro01Day];
      app.innerHTML = `
        <section class="cuadro-mobile-view">
          <div class="cuadro-mobile-top"><span>🍽️ CUADRO 01</span><h1>${cuadro01Day}</h1><p>Comidas, cenas y preparación total</p></div>
          ${daySelector(cuadro01Day, 'selectCuadro01Day')}
          ${meal01('Comida', d.comida)}
          ${meal01('Cena', d.cena)}
          ${dayNav(cuadro01Day, 'selectCuadro01Day')}
        </section>
        ${pageHeader('Cuadro 01', week.id)}`;
    } catch (error) {
      console.error(error);
      app.innerHTML = pageHeader('Cuadro 01', week.id) + missingFileMessage(week.archivos.cuadro01);
    }
  }

  function splitMealEntry(value = '') {
    if (!value) return { title: '', detail: '' };
    const lines = String(value).split(/<br\s*\/?\s*>/i).map(x => x.trim()).filter(Boolean);
    if (lines.length <= 1) return { title: value, detail: '' };
    return { title: lines[0], detail: lines.slice(1).join('<br>') };
  }

  function meal02Person(label, value) {
    const parts = splitMealEntry(value || '');
    return `<article>
      <span class="cuadro-person-label">${label}</span>
      <div class="cuadro-title">${rich(parts.title)}</div>
      ${ingredientDetails(parts.detail)}
    </article>`;
  }

  function meal02Card(meal, entry) {
    return `<section class="cuadro02-meal-card">
      <h2>${meal}</h2>
      <div class="cuadro-two-cols">
        ${meal02Person('ALMU', entry?.almu || '')}
        ${meal02Person('FRAN', entry?.fran || '')}
      </div>
    </section>`;
  }

  async function renderCuadro02Mobile() {
    const week = activeWeek();
    if (!week) return void (app.innerHTML = pageHeader('Cuadro 02') + '<div class="status">No hay una semana configurada.</div>');
    cuadro02Day ||= defaultDay();
    app.innerHTML = '<div class="status">Cargando Cuadro 02…</div>';
    try {
      const data = parseCuadro02(await fetchText(week.archivos.cuadro02));
      if (!data[cuadro02Day]) cuadro02Day = DAYS.find(day => data[day]) || 'Lunes';
      app.innerHTML = `
        <section class="cuadro-mobile-view">
          <div class="cuadro-mobile-top"><span>📋 CUADRO 02</span><h1>${cuadro02Day}</h1><p>Las cinco ingestas de Almu y Fran</p></div>
          ${daySelector(cuadro02Day, 'selectCuadro02Day')}
          <div class="cuadro02-meals">${MEALS.map(meal => meal02Card(meal, data[cuadro02Day]?.[meal])).join('')}</div>
          ${dayNav(cuadro02Day, 'selectCuadro02Day')}
        </section>
        ${pageHeader('Cuadro 02', week.id)}`;
    } catch (error) {
      console.error(error);
      app.innerHTML = pageHeader('Cuadro 02', week.id) + missingFileMessage(week.archivos.cuadro02);
    }
  }

  routes.cuadro01 = () => isMobile() ? renderCuadro01Mobile() : renderMarkdownPage('Cuadro 01', 'cuadro01');
  routes.cuadro02 = () => isMobile() ? renderCuadro02Mobile() : renderMarkdownPage('Cuadro 02', 'cuadro02');

  window.selectCuadro01Day = day => { cuadro01Day = day; renderCuadro01Mobile(); };
  window.selectCuadro02Day = day => { cuadro02Day = day; renderCuadro02Mobile(); };
})();
