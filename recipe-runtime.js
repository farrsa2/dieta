// Reglas permanentes de recetas para las vistas operativas.
// Fuente: window.DIET_RECIPES, cargada desde data/menu_14_dias.json.
(() => {
  if (typeof routes === 'undefined') return;

  const MEALS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
  const RECIPE_MEALS = new Set(['Comida', 'Cena']);
  // Nunca se muestran botones en Desayuno, Media mañana o Merienda.
  const SPECIAL_RECIPE_MEALS = new Map([
    ['Merienda', new Set(['palmera_hojaldre_chocolate'])]
  ]);
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

  function specialRecipesForMeal(meal, content = '') {
    const allowed = SPECIAL_RECIPE_MEALS.get(meal);
    if (!allowed) return [];
    const normalized = normalize(content);
    const source = window.DIET_RECIPES || {};
    const found = [];
    if (meal === 'Merienda' && normalized.includes('palmera')) {
      for (const id of allowed) {
        const raw = source[id];
        if (!raw) continue;
        const recipe = typeof raw === 'string' ? { nombre: id, elaboracion: raw } : raw;
        found.push({ id, name: recipe.nombre || id.replace(/_/g, ' '), recipe });
      }
    }
    return found;
  }

  function recipeEntriesFor(content = '') {
    const source = window.DIET_RECIPES || {};
    const haystack = recipeKey(content);
    const found = [];
    for (const [id, raw] of Object.entries(source)) {
      const recipe = typeof raw === 'string' ? { nombre: id, elaboracion: raw } : (raw || {});
      const name = recipe.nombre || id.replace(/_/g, ' ');
      const aliases = Array.isArray(recipe.aliases) ? recipe.aliases : [];
      const keys = [name, ...aliases].map(recipeKey).filter(Boolean);
      let match = keys.some(key => haystack.includes(key));
      if (!match) {
        match = keys.some(key => {
          const words = key.split(' ').filter(word => word.length > 3 && !['aceite','oliva','fresca','fresco','similar'].includes(word));
          return words.length >= 2 && words.slice(0, 2).every(word => haystack.includes(word));
        });
      }
      if (match && !found.some(item => item.id === id)) found.push({ id, name, recipe });
    }
    return found;
  }

  function singleRecipeForMeal(content = '') {
    const source = window.DIET_RECIPES || {};
    const haystack = recipeKey(content);
    const candidates = [];
    for (const [id, raw] of Object.entries(source)) {
      const recipe = typeof raw === 'string' ? { nombre: id, elaboracion: raw } : (raw || {});
      const name = recipe.nombre || id.replace(/_/g, ' ');
      const aliases = Array.isArray(recipe.aliases) ? recipe.aliases : [];
      for (const label of [name, ...aliases]) {
        const key = recipeKey(label);
        if (!key || !haystack.includes(key)) continue;
        candidates.push({ id, name, recipe, score: key.length });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length ? [candidates[0]] : [];
  }

  // Las recetas se relacionan por identificadores explícitos del JSON operativo, nunca por texto aproximado.
  function explicitRecipesFor(date,meal,person){
  if(!date||!['Comida','Cena'].includes(meal)||!['almu','fran'].includes(person))return [];
  const data=window.DIET_OPERATIONAL||{};
  const ids=data.recetas_vinculadas?.[date]?.[meal]?.[person];
  if(!Array.isArray(ids))return [];
  const recipes=data.recipes||{};
  const result=[];
  for(const id of [...new Set(ids)]){
    const raw=recipes[id];
    if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
    const hasDetails=(typeof raw.elaboracion==='string'&&raw.elaboracion.trim())||(Array.isArray(raw.pasos)&&raw.pasos.length);
    if(!hasDetails)continue;
    const portion=data.recetas_por_racion?.[date]?.[meal]?.[person]?.[id];
    if(!portion||!Array.isArray(portion.ingredientes))continue;
    const sourceIsArchived=/archivad/i.test(String(raw.fuente||''));
    const fuente=sourceIsArchived ? raw.fuente
      : person==='almu' ? 'PDF de Almudena · 02–08/11/2026'
      : 'PDF de Fran · 02–08/11/2026';
    const userAdapted=person==='fran'&&id==='tacos_pollo';
    const originalNote=String(raw.nota||'');
    const sharedNote=/^(?!.*\bFran\b)(?!.*raci[oó]n prescrita).*$/i.test(originalNote) ? originalNote : '';
    const special=/(?:cusc[uú]s|couss*cous)/i.test(portion.nombre)
      ? 'Los 125 g de cuscús seco pertenecen a la receta completa, no a la ración individual.'
      : '';
    const note=[portion.nota||'',special,sharedNote].filter(Boolean).join(' ');
    const recipe={...raw,
      fuente:userAdapted?'Adaptación aprobada por el usuario':fuente,
      raciones:`${person==='almu'?'Almu':'Fran'} · ${portion.racion_g} g${userAdapted?' (adaptación aprobada, no prescripción nutricional)':''}`,
      ingredientes:[...portion.ingredientes],
      nota:note
    };
    result.push({id,name:raw.nombre||id.replace(/_/g,' '),recipe});
  }
  return result;
}

  function totalsFromJson(date,meal){
  if(!date||!['Comida','Cena'].includes(meal))return null;
  const data=window.DIET_OPERATIONAL||{};
  const week=(data.weeks||[]).find(w=>date>=w.inicio&&date<=w.fin);
  const md=week&&data.documents?.[week.document]?.main_markdown;
  if(typeof md!=='string')return null;
  const day=capitalize(new Intl.DateTimeFormat('es-ES',{weekday:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')));
  const lines=md.split(/\r?\n/).filter(x=>x.trim().startsWith('|'));
  const index=lines.findIndex(line=> {
    const label=line.replace(/^\|/,'').split('|')[0].replace(/\*\*/g,'').trim();
    return label===day||label.startsWith(day+' ');
  });
  if(index<0)return null;
  const cells=lines[index].replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
  if(cells.length<7)return null;
  const col=meal==='Comida'?3:6;
  const possible=lines[index+1]||'';
  const next=possible.replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
  const isDetail=next.length>=7 && !next[0].replace(/\*\*/g,'').trim();
  return {title:cells[col]||'',detail:isDetail?next[col]||'':''};
}

  function recipeBody(recipe) {
    if (typeof recipe === 'string') return `<p>${escapeHtml(recipe)}</p>`;
    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) return '<p>Receta archivada no disponible.</p>';
    const parts = [];
    if (recipe.raciones) parts.push(`<p><strong>${escapeHtml(recipe.raciones)}</strong></p>`);
    if (Array.isArray(recipe.ingredientes) && recipe.ingredientes.length) {
      parts.push(`<ul>${recipe.ingredientes.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    }
    if (recipe.elaboracion) parts.push(`<p>${escapeHtml(recipe.elaboracion)}</p>`);
    if (Array.isArray(recipe.pasos) && recipe.pasos.length) {
      parts.push(`<ol>${recipe.pasos.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`);
    }
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
    if (!entry) {
      console.warn('Referencia de receta caducada:', id);
      return;
    }
    const modal = ensureModal();
    modal.querySelector('#operational-recipe-title').textContent = entry.recipes.length === 1 ? entry.recipes[0].name : 'Recetas de esta comida';
    const kicker = modal.querySelector('.recipe-modal-kicker');
    if (kicker) {
      const fuentes = entry.recipes.map(item => item.recipe?.fuente || '');
      const archivada = fuentes.some(fuente => /archivad|adaptaci[oó]n/i.test(fuente));
      const userRecipe = fuentes.length === 1 && fuentes[0] === 'Receta añadida por el usuario';
      kicker.textContent = archivada ? '👩‍🍳 RECETA ARCHIVADA · ADAPTACIÓN A REVISAR'
        : userRecipe ? '👩‍🍳 RECETA GUARDADA'
        : '👩‍🍳 RECETA DEL NUTRICIONISTA';
    }
    modal.querySelector('#operational-recipe-context').textContent = entry.context || '';
    modal.querySelector('#operational-recipe-body').innerHTML = entry.recipes.map(item => `
      <article class="recipe-modal-item">
        ${entry.recipes.length > 1 ? `<h3>${escapeHtml(item.name)}</h3>` : ''}
        ${recipeBody(item.recipe)}
      </article>`).join('');
    modal.hidden = false;
    document.body.classList.add('recipe-modal-open');
  };

  function decorateRollingMenu(){
  const view=document.querySelector('.rolling-menu-view');
  const date=view?.dataset?.menuDate;
  if(!view||!date)return;
  view.querySelectorAll('.cuadro02-meal-card').forEach(card=>{
    const meal=card.querySelector('h2')?.textContent?.trim()||'';
    card.querySelectorAll('[data-recipe-action]').forEach(node=>node.remove());
    if(!RECIPE_MEALS.has(meal))return;
    card.querySelectorAll('.cuadro-two-cols article').forEach(article=>{
      const person=article.querySelector('.cuadro-person-label')?.textContent?.trim().toLowerCase()||'';
      if(person!=='almu'&&person!=='fran')return;
      const recipes=explicitRecipesFor(date,meal,person);
      if(!recipes.length)return;
      article.insertAdjacentHTML('beforeend',recipeButton(recipes,`${date} · ${meal} · ${person==='almu'?'Almu':'Fran'}`));
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
      const dayLabel = cleanMarkdownText(row[0]).replace(/\*\*/g, '').trim();
      const day = days.find(candidate => dayLabel === candidate || dayLabel.startsWith(`${candidate} `));
      if (!day) continue;
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

  function decorateNextMeal(){
  const card=document.querySelector('.next-card');
  if(!card)return;
  card.querySelectorAll('.next-total').forEach(node=>node.remove());
  card.querySelectorAll('[data-recipe-action]').forEach(node=>node.remove());
  const current=window.DIET_CURRENT_MEAL;
  const meal=card.querySelector('.meal-name')?.textContent?.trim();
  if(!current||current.meal!==meal||!RECIPE_MEALS.has(meal))return;
  const info=totalsFromJson(current.date,meal);
  const title=info?.title||'— · pendiente de validar cantidades conjuntas';
  const detail=info?.detail||'';
  const a=explicitRecipesFor(current.date,meal,'almu');
  const f=explicitRecipesFor(current.date,meal,'fran');
  const all=[
    ...a.map(x=>({...x,id:'almu-'+x.id,name:x.name+' · Almu'})),
    ...f.map(x=>({...x,id:'fran-'+x.id,name:x.name+' · Fran'}))
  ];
  const src=a.length ? 'Almu y Fran' : 'Fran (Almu pendiente)';
  const allowed=!/libre/i.test(String(title));
  const recipeBtn=allowed?recipeButton(all,`${current.date} · ${meal} · Receta de ${src}`):'';
  const html=`<article class="person next-total"><h3>TOTAL</h3><span class="next-total-title">${formatMealCell(title)}</span>${detail?`<span class="next-total-detail">${formatMealCell(detail)}</span>`:''}${recipeBtn}</article>`;
  card.querySelector('.people-grid')?.insertAdjacentHTML('beforeend',html);
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
