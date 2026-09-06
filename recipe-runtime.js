// Reglas permanentes de recetas para las vistas operativas.
// Fuente: window.DIET_RECIPES, cargada desde data/menu_14_dias.json.
(() => {
  if (typeof routes === 'undefined') return;

  const MEALS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  const RECIPE_MEALS = new Set(['Comida', 'Cena']);
  const registry = new Map();
  let seq = 0;

  const normalize = (value = '') => String(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/\*\*/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const recipeKey = (value = '') => normalize(value)
    .replace(/\ba la plancha\b/g, '')
    .replace(/\bplancha\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  function recipeEntriesFor(content = '') {
    const source = window.DIET_RECIPES || {};
    const haystack = recipeKey(content);
    const found = [];
    for (const [id, raw] of Object.entries(source)) {
      const recipe = typeof raw === 'string' ? { nombre: id, elaboracion: raw } : (raw || {});
      const name = recipe.nombre || id.replace(/_/g, ' ');
      const key = recipeKey(name);
      let match = Boolean(key && haystack.includes(key));
      if (!match) {
        const words = key.split(' ').filter(word => word.length > 3 && !['aceite','oliva','fresca','fresco','similar'].includes(word));
        if (words.length >= 2) match = words.slice(0, 2).every(word => haystack.includes(word));
      }
      if (match && !found.some(item => item.id === id)) found.push({ id, name, recipe });
    }
    return found;
  }

  function recipeBody(recipe) {
    if (typeof recipe === 'string') return `<p>${escapeHtml(recipe)}</p>`;
    const parts = [];
    if (recipe.raciones) parts.push(`<p><strong>${escapeHtml(recipe.raciones)}</strong></p>`);
    if (Array.isArray(recipe.ingredientes) && recipe.ingredientes.length) {
      parts.push(`<ul>${recipe.ingredientes.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    }
    if (recipe.elaboracion) parts.push(`<p>${escapeHtml(recipe.elaboracion)}</p>`);
    if (recipe.nota) parts.push(`<p>${escapeHtml(recipe.nota)}</p>`);
    return parts.join('') || '<p>Receta archivada sin detalle adicional.</p>';
  }

  function ensureModal() {
    let modal = document.querySelector('#operational-recipe-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'operational-recipe-modal';
    modal.className = 'recipe-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="recipe-modal-backdrop" data-close-operational-recipe></div>
      <section class="recipe-modal-panel" role="dialog" aria-modal="true" aria-labelledby="operational-recipe-title">
        <div class="recipe-modal-head">
          <div>
            <span class="recipe-modal-kicker">👩‍🍳 RECETA DEL NUTRICIONISTA</span>
            <h2 id="operational-recipe-title">Receta</h2>
            <p id="operational-recipe-context"></p>
          </div>
          <button type="button" class="recipe-modal-close" data-close-operational-recipe aria-label="Cerrar receta">×</button>
        </div>
        <div id="operational-recipe-body" class="recipe-modal-body"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-operational-recipe]').forEach(node => node.addEventListener('click', () => {
      modal.hidden = true;
      document.body.classList.remove('recipe-modal-open');
    }));
    return modal;
  }

  function recipeButton(recipes, context) {
    if (!recipes.length) return '';
    const id = `operational-recipe-${++seq}`;
    registry.set(id, { recipes, context });
    return `<button type="button" class="cuadro-recipe-button" data-recipe-action onclick="openOperationalRecipe('${id}')">👩‍🍳 Ver receta</button>`;
  }

  window.openOperationalRecipe = id => {
    const entry = registry.get(id);
    if (!entry) return;
    const modal = ensureModal();
    modal.querySelector('#operational-recipe-title').textContent = entry.recipes.length === 1 ? entry.recipes[0].name : 'Recetas de esta comida';
    modal.querySelector('#operational-recipe-context').textContent = entry.context || '';
    modal.querySelector('#operational-recipe-body').innerHTML = entry.recipes.map(item => `
      <article class="recipe-modal-item">
        ${entry.recipes.length > 1 ? `<h3>${escapeHtml(item.name)}</h3>` : ''}
        ${recipeBody(item.recipe)}
      </article>`).join('');
    modal.hidden = false;
    document.body.classList.add('recipe-modal-open');
  };

  function decorateRollingMenu() {
    const view = document.querySelector('.rolling-menu-view');
    if (!view) return;
    view.querySelectorAll('.cuadro02-meal-card').forEach(card => {
      const meal = card.querySelector('h2')?.textContent?.trim() || '';
      card.querySelectorAll('[data-recipe-action]').forEach(node => node.remove());
      if (!RECIPE_MEALS.has(meal)) return;
      card.querySelectorAll('.cuadro-two-cols article').forEach(article => {
        const person = article.querySelector('.cuadro-person-label')?.textContent?.trim() || '';
        const content = `${article.querySelector('.cuadro-title')?.textContent || ''} ${article.querySelector('.cuadro-detail')?.textContent || ''}`;
        const recipes = recipeEntriesFor(content);
        if (!recipes.length) return;
        article.insertAdjacentHTML('beforeend', recipeButton(recipes, `${meal} · ${person}`));
      });
    });
  }

  function splitMd(line) {
    return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(value => value.trim());
  }

  function parseCuadro01Totals(md) {
    const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const lines = md.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const start = lines.findIndex(line => line.startsWith('|') && /Comida Almu/i.test(line) && /Cena total/i.test(line));
    if (start < 0) return {};
    const data = {};
    for (let i = start + 2; i < lines.length; i++) {
      if (!lines[i].startsWith('|')) break;
      const row = splitMd(lines[i]);
      if (row.length < 7) continue;
      const day = cleanMarkdownText(row[0]).replace(/\*\*/g, '');
      if (!days.includes(day)) continue;
      const detail = lines[i + 1]?.startsWith('|') ? splitMd(lines[i + 1]) : [];
      data[day] = {
        Comida: { title: row[3] || '', detail: detail[3] || '' },
        Cena: { title: row[6] || '', detail: detail[6] || '' }
      };
      if (detail.length >= 7) i += 1;
    }
    return data;
  }

  const addDays = (iso, days) => {
    const date = new Date(`${iso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const dayName = iso => capitalize(new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', timeZone: 'UTC'
  }).format(new Date(`${iso}T12:00:00Z`)));

  async function operationalSequence() {
    const result = [];
    const weeks = [...(config?.semanas || [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (const week of weeks) {
      const data = parseCuadro02(await fetchText(week.archivos.cuadro02));
      for (let iso = week.inicio; iso <= week.fin; iso = addDays(iso, 1)) {
        const day = dayName(iso);
        for (const meal of MEALS) {
          const entry = data[day]?.[meal];
          if (entry) result.push({ week, date: iso, day, meal, almu: entry.almu || '', fran: entry.fran || '' });
        }
      }
    }
    return result;
  }

  function baseTarget(now, schedule) {
    if (now.time < (schedule['Media mañana'] || '08:00')) return { date: now.date, meal: 'Desayuno' };
    if (now.time < (schedule['Comida'] || '11:00')) return { date: now.date, meal: 'Media mañana' };
    if (now.time < (schedule['Merienda'] || '16:00')) return { date: now.date, meal: 'Comida' };
    if (now.time < (schedule['Cena'] || '18:00')) return { date: now.date, meal: 'Merienda' };
    if (now.time < (schedule['Fin cena'] || '21:30')) return { date: now.date, meal: 'Cena' };
    return { date: addDays(now.date, 1), meal: 'Desayuno' };
  }

  async function resolveDisplayedMeal() {
    const now = madridNowParts();
    const sequence = await operationalSequence();
    if (!sequence.length) return null;
    const target = baseTarget(now, config.horarios || {});
    let baseIndex = sequence.findIndex(item => item.date === target.date && item.meal === target.meal);
    if (baseIndex < 0) baseIndex = sequence.findIndex(item => item.date >= target.date);
    if (baseIndex < 0) baseIndex = sequence.length - 1;
    const displayIndex = Math.max(0, Math.min(sequence.length - 1, baseIndex + (typeof mealOffset === 'number' ? mealOffset : 0)));
    return sequence[displayIndex];
  }

  async function decorateNextMeal() {
    const card = document.querySelector('.next-card');
    if (!card) return;
    card.querySelectorAll('.next-total').forEach(node => node.remove());
    const current = await resolveDisplayedMeal();
    if (!current || !RECIPE_MEALS.has(current.meal)) return;

    const totals = parseCuadro01Totals(await fetchText(current.week.archivos.cuadro01));
    const total = totals[current.day]?.[current.meal];
    if (!total) return;

    const recipes = recipeEntriesFor(`${current.almu} ${current.fran} ${total.title} ${total.detail}`);
    const totalHtml = `<article class="person next-total"><h3>TOTAL</h3><span class="next-total-title">${formatMealCell(total.title)}</span><span class="next-total-detail">${formatMealCell(total.detail)}</span>${recipeButton(recipes, `${current.day} · ${current.meal} · Total`)}</article>`;
    const grid = card.querySelector('.people-grid');
    if (grid) grid.insertAdjacentHTML('beforeend', totalHtml);
  }

  async function decorateCurrentView() {
    if (document.querySelector('.rolling-menu-view')) decorateRollingMenu();
    if (document.querySelector('.next-card')) await decorateNextMeal();
  }

  function startRecipeDecorator() {
    let observer = null;
    let running = false;

    const observe = () => {
      observer.observe(app, { childList: true, subtree: true });
    };

    const run = async () => {
      if (running) return;
      running = true;
      observer.disconnect();
      try {
        await decorateCurrentView();
      } catch (error) {
        console.error('No se pudieron decorar las recetas operativas:', error);
      } finally {
        running = false;
        observe();
      }
    };

    observer = new MutationObserver(() => { void run(); });
    observe();
    void run();
  }

  window.addEventListener('DOMContentLoaded', startRecipeDecorator);
})();
