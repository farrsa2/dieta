// Vistas mobile-first para Cuadro 01 y Cuadro 02.
// En escritorio se conserva el Markdown/tablas originales.
// En móvil los ingredientes quedan plegados por defecto y las recetas se abren en modal.

(() => {
  if (typeof routes === 'undefined') return;

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const MEALS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  let cuadro01Day = null;
  let cuadro02Day = null;
  let recipeSeq = 0;
  const recipeRegistry = new Map();

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

  function normalized(value = '') {
    return String(value)
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/\*\*/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9ñ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function recipeAlias(name) {
    return normalized(name)
      .replace(/\ba la plancha\b/g, '')
      .replace(/\bplancha\b/g, '')
      .replace(/\bde aceite de oliva\b/g, '')
      .replace(/\bint\b/g, '')
      .replace(/\btostadas\b/g, 'tostada')
      .replace(/\bcalabacines\b/g, 'calabacin')
      .replace(/\bmuslos\b/g, 'muslo')
      .replace(/\bmozarela\b/g, 'mozzarella')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function recipesFor(content = '') {
    if (!window.DIET_RECIPES) return [];
    const haystack = recipeAlias(content);
    const found = [];

    for (const [name, recipe] of Object.entries(window.DIET_RECIPES)) {
      const key = recipeAlias(name);
      let match = key && haystack.includes(key);

      if (!match) {
        const words = key.split(' ').filter(w => w.length > 3 && !['aceite','oliva','fresca','fresco','similar'].includes(w));
        if (words.length >= 2) match = words.slice(0, 2).every(w => haystack.includes(w));
      }

      if (match && !found.some(item => item.recipe === recipe)) found.push({ name, recipe });
    }

    return found;
  }

  function recipeButton(content = '', context = '') {
    const recipes = recipesFor(content);
    if (!recipes.length) return '';
    const id = `recipe-${++recipeSeq}`;
    recipeRegistry.set(id, { recipes, context });
    return `<button type="button" class="cuadro-recipe-button" onclick="openDietRecipe('${id}')">👩‍🍳 Ver receta</button>`;
  }

  function ensureRecipeModal() {
    let modal = document.querySelector('#diet-recipe-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'diet-recipe-modal';
    modal.className = 'recipe-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="recipe-modal-backdrop" data-close-recipe></div>
      <section class="recipe-modal-panel" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
        <div class="recipe-modal-head">
          <div>
            <span class="recipe-modal-kicker">👩‍🍳 RECETA DEL NUTRICIONISTA</span>
            <h2 id="recipe-modal-title">Receta</h2>
            <p id="recipe-modal-context"></p>
          </div>
          <button type="button" class="recipe-modal-close" data-close-recipe aria-label="Cerrar receta">×</button>
        </div>
        <div id="recipe-modal-body" class="recipe-modal-body"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-recipe]').forEach(el => el.addEventListener('click', closeDietRecipe));
    return modal;
  }

  window.openDietRecipe = function(id) {
    const entry = recipeRegistry.get(id);
    if (!entry) return;
    const modal = ensureRecipeModal();
    const title = entry.recipes.length === 1 ? entry.recipes[0].name : 'Recetas de esta ingesta';
    modal.querySelector('#recipe-modal-title').textContent = title;
    modal.querySelector('#recipe-modal-context').textContent = entry.context || '';
    modal.querySelector('#recipe-modal-body').innerHTML = entry.recipes.map(item => `
      <article class="recipe-modal-item">
        ${entry.recipes.length > 1 ? `<h3>${escapeHtml(item.name)}</h3>` : ''}
        <p>${escapeHtml(item.recipe)}</p>
      </article>`).join('');
    modal.hidden = false;
    document.body.classList.add('recipe-modal-open');
  };

  window.closeDietRecipe = function() {
    const modal = document.querySelector('#diet-recipe-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('recipe-modal-open');
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDietRecipe();
  });

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

  function personCard(label, title, detail, context) {
    const full = `${title} ${detail}`;
    return `<article class="cuadro-person-card">
      <span class="cuadro-person-label">${label}</span>
      <div class="cuadro-title">${rich(title)}</div>
      ${ingredientDetails(detail)}
      ${recipeButton(full, context)}
    </article>`;
  }

  function totalCard(title, detail) {
    return `<article class="cuadro-total-card">
      <span class="cuadro-total-label">TOTAL PREPARACIÓN</span>
      <div class="cuadro-title">${rich(title)}</div>
      ${ingredientDetails(detail)}
    </article>`;
  }

  function meal01(label, meal, day) {
    return `<section class="cuadro-meal-block">
      <h2>${label === 'Comida' ? '🍽️' : '🌙'} ${label}</h2>
      <div class="cuadro-two-cols">
        ${personCard('ALMU', meal.almuTitle, meal.almuDetail, `${day} · ${label} · Almu`)}
        ${personCard('FRAN', meal.franTitle, meal.franDetail, `${day} · ${label} · Fran`)}
      </div>
      ${totalCard(meal.totalTitle, meal.totalDetail)}
    </section>`;
  }

  async function renderCuadro01Mobile() {
    const week = activeWeek();
    if (!week) return void (app.innerHTML = pageHeader('Cuadro 01') + '<div class="status">No hay una semana configurada.</div>');
    cuadro01Day ||= defaultDay();
    recipeRegistry.clear();
    app.innerHTML = '<div class="status">Cargando Cuadro 01…</div>';
    try {
      const data = parseCuadro01(await fetchText(week.archivos.cuadro01));
      if (!data[cuadro01Day]) cuadro01Day = DAYS.find(day => data[day]) || 'Lunes';
      const d = data[cuadro01Day];
      app.innerHTML = `
        <section class="cuadro-mobile-view">
          <div class="cuadro-mobile-top"><span>🍽️ CUADRO 01</span><h1>${cuadro01Day}</h1><p>Comidas, cenas y preparación total</p></div>
          ${daySelector(cuadro01Day, 'selectCuadro01Day')}
          ${meal01('Comida', d.comida, cuadro01Day)}
          ${meal01('Cena', d.cena, cuadro01Day)}
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

  function meal02Person(label, value, context) {
    const parts = splitMealEntry(value || '');
    const full = `${parts.title} ${parts.detail}`;
    return `<article>
      <span class="cuadro-person-label">${label}</span>
      <div class="cuadro-title">${rich(parts.title)}</div>
      ${ingredientDetails(parts.detail)}
      ${recipeButton(full, context)}
    </article>`;
  }

  function meal02Card(meal, entry, day) {
    return `<section class="cuadro02-meal-card">
      <h2>${meal}</h2>
      <div class="cuadro-two-cols">
        ${meal02Person('ALMU', entry?.almu || '', `${day} · ${meal} · Almu`)}
        ${meal02Person('FRAN', entry?.fran || '', `${day} · ${meal} · Fran`)}
      </div>
    </section>`;
  }

  async function renderCuadro02Mobile() {
    const week = activeWeek();
    if (!week) return void (app.innerHTML = pageHeader('Cuadro 02') + '<div class="status">No hay una semana configurada.</div>');
    cuadro02Day ||= defaultDay();
    recipeRegistry.clear();
    app.innerHTML = '<div class="status">Cargando Cuadro 02…</div>';
    try {
      const data = parseCuadro02(await fetchText(week.archivos.cuadro02));
      if (!data[cuadro02Day]) cuadro02Day = DAYS.find(day => data[day]) || 'Lunes';
      app.innerHTML = `
        <section class="cuadro-mobile-view">
          <div class="cuadro-mobile-top"><span>📋 CUADRO 02</span><h1>${cuadro02Day}</h1><p>Las cinco ingestas de Almu y Fran</p></div>
          ${daySelector(cuadro02Day, 'selectCuadro02Day')}
          <div class="cuadro02-meals">${MEALS.map(meal => meal02Card(meal, data[cuadro02Day]?.[meal], cuadro02Day)).join('')}</div>
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

  window.selectCuadro01Day = day => { cuadro01Day = day; closeDietRecipe(); renderCuadro01Mobile(); };
  window.selectCuadro02Day = day => { cuadro02Day = day; closeDietRecipe(); renderCuadro02Mobile(); };
})();
