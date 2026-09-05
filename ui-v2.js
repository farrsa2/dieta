// Ajustes permanentes de interfaz: nombres públicos, Home compacto y totales/recetas en Próxima comida.

(() => {
  if (typeof routes === 'undefined') return;

  const originalCuadro01 = routes.cuadro01;
  const originalCuadro02 = routes.cuadro02;
  const originalCompra = routes.compra;

  function patchPageChrome(title = '') {
    document.querySelectorAll('.back-button').forEach(button => {
      button.textContent = '🏠';
      button.setAttribute('aria-label', 'Inicio');
      button.setAttribute('title', 'Inicio');
    });
    if (title) document.querySelectorAll('.page-title').forEach(node => { node.textContent = title; });
  }

  function patchCuadroTop(title, icon) {
    const top = document.querySelector('.cuadro-mobile-top');
    if (!top) return;
    const label = top.querySelector('span');
    if (label) label.textContent = `${icon} ${title.toUpperCase()}`;
    top.querySelector('p')?.remove();
  }

  function renderHomeV2() {
    app.innerHTML = `<section class="home" aria-label="Inicio"><div class="home-grid">
      <button class="home-button" type="button" onclick="location.hash='cuadro01'"><span class="home-icon">🍽️</span><strong class="home-title">Comidas y cenas</strong></button>
      <button class="home-button" type="button" onclick="location.hash='cuadro02'"><span class="home-icon">📋</span><strong class="home-title">Menú completo</strong></button>
      <button class="home-button" type="button" onclick="location.hash='proxima'"><span class="home-icon">⏱️</span><strong class="home-title">Próxima comida</strong></button>
      <button class="home-button" type="button" onclick="location.hash='compra'"><span class="home-icon">🛒</span><strong class="home-title">Lista de la compra</strong></button>
    </div></section>`;
  }

  function splitMd(line) {
    return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(v => v.trim());
  }

  function parseCuadro01Totals(md) {
    const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const lines = md.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
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

  let nextRecipeSeq = 0;
  const nextRecipeRegistry = new Map();

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

  function recipeButton(content, context) {
    const recipes = recipesFor(content);
    if (!recipes.length) return '';
    const id = `next-recipe-${++nextRecipeSeq}`;
    nextRecipeRegistry.set(id, { recipes, context });
    return `<button type="button" class="cuadro-recipe-button" onclick="openNextMealRecipe('${id}')">👩‍🍳 Ver receta</button>`;
  }

  function ensureRecipeModal() {
    let modal = document.querySelector('#diet-recipe-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'diet-recipe-modal';
    modal.className = 'recipe-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="recipe-modal-backdrop" data-close-next-recipe></div>
      <section class="recipe-modal-panel" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
        <div class="recipe-modal-head">
          <div>
            <span class="recipe-modal-kicker">👩‍🍳 RECETA DEL NUTRICIONISTA</span>
            <h2 id="recipe-modal-title">Receta</h2>
            <p id="recipe-modal-context"></p>
          </div>
          <button type="button" class="recipe-modal-close" data-close-next-recipe aria-label="Cerrar receta">×</button>
        </div>
        <div id="recipe-modal-body" class="recipe-modal-body"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-next-recipe]').forEach(node => node.addEventListener('click', () => {
      modal.hidden = true;
      document.body.classList.remove('recipe-modal-open');
    }));
    return modal;
  }

  window.openNextMealRecipe = function(id) {
    const entry = nextRecipeRegistry.get(id);
    if (!entry) return;
    const modal = ensureRecipeModal();
    modal.querySelector('#recipe-modal-title').textContent = entry.recipes.length === 1 ? entry.recipes[0].name : 'Recetas de esta comida';
    modal.querySelector('#recipe-modal-context').textContent = entry.context || '';
    modal.querySelector('#recipe-modal-body').innerHTML = entry.recipes.map(item => `
      <article class="recipe-modal-item">
        ${entry.recipes.length > 1 ? `<h3>${escapeHtml(item.name)}</h3>` : ''}
        <p>${escapeHtml(item.recipe)}</p>
      </article>`).join('');
    modal.hidden = false;
    document.body.classList.add('recipe-modal-open');
  };

  async function renderNextMealV2() {
    const week = activeWeek();
    const now = madridNowParts();
    if (!week) {
      app.innerHTML = pageHeader('Próxima comida') + '<div class="status">No hay una semana configurada.</div>';
      patchPageChrome('Próxima comida');
      return;
    }

    app.innerHTML = pageHeader('Próxima comida', `${now.weekday} · ${now.time}`) + '<div class="status">Calculando…</div>';
    patchPageChrome('Próxima comida');

    try {
      const [md02, md01] = await Promise.all([
        fetchText(week.archivos.cuadro02),
        fetchText(week.archivos.cuadro01)
      ]);
      const data = parseCuadro02(md02);
      const totals = parseCuadro01Totals(md01);
      const sequence = buildMealSequence(data);
      const baseIndex = computeCurrentMealIndex(sequence, now, config.horarios || {});
      if (baseIndex < 0) throw new Error('No se pudo determinar qué toca ahora');
      const displayIndex = Math.max(0, Math.min(sequence.length - 1, baseIndex + mealOffset));
      mealOffset = displayIndex - baseIndex;
      const current = sequence[displayIndex];
      const previous = sequence[displayIndex - 1] || null;
      const next = sequence[displayIndex + 1] || null;
      const showRecipe = current.meal === 'Comida' || current.meal === 'Cena';
      const total = showRecipe ? totals[current.day]?.[current.meal] : null;

      nextRecipeRegistry.clear();
      const almuRecipe = showRecipe ? recipeButton(current.almu, `${current.day} · ${current.meal} · Almu`) : '';
      const franRecipe = showRecipe ? recipeButton(current.fran, `${current.day} · ${current.meal} · Fran`) : '';
      const totalRecipe = showRecipe && total ? recipeButton(`${current.almu} ${current.fran}`, `${current.day} · ${current.meal} · Total`) : '';

      app.innerHTML = pageHeader('Próxima comida', `${current.day} · ${now.time}`) + `<section class="card next-card">
        <p class="meal-name">${escapeHtml(current.meal)}</p>
        <div class="people-grid">
          <article class="person"><h3>ALMU</h3><p>${formatMealCell(current.almu)}</p>${almuRecipe}</article>
          <article class="person"><h3>FRAN</h3><p>${formatMealCell(current.fran)}</p>${franRecipe}</article>
          ${total ? `<article class="person next-total"><h3>TOTAL</h3><span class="next-total-title">${formatMealCell(total.title)}</span><span class="next-total-detail">${formatMealCell(total.detail)}</span>${totalRecipe}</article>` : ''}
        </div>
        <div class="meal-nav">
          <button class="meal-nav-button" type="button" ${previous ? '' : 'disabled'} onclick="shiftMeal(-1)"><span>← Anterior</span><strong>${previous ? escapeHtml(previous.meal) : '—'}</strong></button>
          <button class="meal-nav-button" type="button" ${next ? '' : 'disabled'} onclick="shiftMeal(1)"><span>Posterior →</span><strong>${next ? escapeHtml(next.meal) : '—'}</strong></button>
        </div>
      </section>`;
      patchPageChrome('Próxima comida');
    } catch (error) {
      console.error(error);
      app.innerHTML = pageHeader('Próxima comida') + missingFileMessage(week.archivos.cuadro02);
      patchPageChrome('Próxima comida');
    }
  }

  routes.inicio = renderHomeV2;
  routes.proxima = renderNextMealV2;
  window.shiftMeal = delta => { mealOffset += delta; renderNextMealV2(); };

  routes.cuadro01 = async () => {
    await originalCuadro01();
    patchPageChrome('Comidas y cenas');
    patchCuadroTop('Comidas y cenas', '🍽️');
  };

  routes.cuadro02 = async () => {
    await originalCuadro02();
    patchPageChrome('Menú completo');
    patchCuadroTop('Menú completo', '📋');
  };

  routes.compra = async () => {
    await originalCompra();
    patchPageChrome('Lista de la compra');
  };
})();
