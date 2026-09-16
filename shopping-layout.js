// Consolidación estable de la lista de compra.
// 1) La compra se sirve desde data/menu_14_dias.json mediante el CSV embebido.
// 2) Las tarjetas muestran cantidad compacta, usos culinarios validados y días al final.
// 3) La presentación separa Fruta/Verdura y Carne/Fiambre sin alterar sincronización.
(() => {
  const SUPPLEMENTAL_USES = {
    'Rábanos': [{ day: 'L', dish: 'Ensalada mixta I' }],
    'Rábano': [{ day: 'L', dish: 'Ensalada mixta I' }],
    'Puerro': [{ day: 'S', dish: 'Crema de verduras' }],
    'Puerros': [{ day: 'S', dish: 'Crema de verduras' }],
    'Aceitunas verdes': [{ day: 'L', dish: 'Ensalada mixta I' }],
    'Aceitunas': [{ day: 'L', dish: 'Ensalada mixta I' }]
  };

  const SHOPPING_GROUPS = [
    { key: 'FRUTA', label: 'Fruta', icon: '🍎' },
    { key: 'VERDURA', label: 'Verdura', icon: '🥬' },
    { key: 'CARNE', label: 'Carne', icon: '🥩' },
    { key: 'FIAMBRE', label: 'Fiambre', icon: '🥓' },
    { key: 'PESCADO', label: 'Pescado', icon: '🐟' },
    { key: 'HUEVOS', label: 'Huevos', icon: '🥚' },
    { key: 'LACTEOS', label: 'Lácteos', icon: '🧀' },
    { key: 'PAN_CEREALES', label: 'Pan, pasta y cereales', icon: '🍞' },
    { key: 'CONSERVAS', label: 'Conservas y similares', icon: '🥫' },
    { key: 'OTROS', label: 'Otros', icon: '🧺' }
  ];

  const normalizedKey = (value = '') => String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function comparableKey(value = '') {
    return normalizedKey(value)
      .replace(/\bfresco\b/g, '')
      .replace(/\bfresca\b/g, '')
      .replace(/\bfrescos\b/g, '')
      .replace(/\bfrescas\b/g, '')
      .replace(/\s*\/\s*/g, ' ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function aliasesForName(name) {
    const key = comparableKey(name);
    if (key.includes('tomate frito') && key.includes('salsa de tomate')) return ['salsa de tomate', 'tomate frito salsa de tomate'];
    if (key.includes('muslo de pavo')) return ['muslo de pavo'];
    if (key === 'rabanos') return ['rabanos', 'rabano'];
    if (key === 'puerros') return ['puerros', 'puerro'];
    if (key.includes('aceitunas verdes')) return ['aceitunas verdes', 'aceitunas'];
    return [key];
  }

  function findUses(source, name) {
    if (Array.isArray(source?.[name])) return source[name];
    const aliases = aliasesForName(name);
    const match = Object.keys(source || {}).find(candidate => aliases.includes(comparableKey(candidate)));
    return match ? source[match] : [];
  }

  const GENERIC_USE_PARTS = new Set([
    'desayuno', 'media manana', 'comida', 'merienda', 'cena',
    'varias tomas', 'compra manual'
  ]);

  function cleanUseLine(use) {
    if (use && typeof use === 'object' && !Array.isArray(use)) {
      const day = /^[LMXJVSD]$/i.test(String(use.day || '').trim()) ? String(use.day).trim().toUpperCase() : '';
      const dish = String(use.dish || '').trim();
      if (!dish || GENERIC_USE_PARTS.has(normalizedKey(dish))) return '';
      return day ? `${day} · ${dish}` : dish;
    }

    const parts = String(use || '').split('·').map(part => part.trim()).filter(Boolean);
    if (!parts.length) return '';
    const first = parts[0];
    const hasDayPrefix = /^[LMXJVSD]$/i.test(first);
    const day = hasDayPrefix ? first.toUpperCase() : '';
    const content = (hasDayPrefix ? parts.slice(1) : parts)
      .filter(part => !GENERIC_USE_PARTS.has(normalizedKey(part)));
    if (!content.length) return '';
    return day ? `${day} · ${content.join(' · ')}` : content.join(' · ');
  }

  function lookupUses(name) {
    const operational = findUses(window.DIET_OPERATIONAL?.shopping?.uses || {}, name);
    const supplemental = findUses(SUPPLEMENTAL_USES, name);
    const raw = operational.length ? operational : supplemental;
    return raw.map(cleanUseLine).filter(Boolean);
  }

  function categoryForProduct(name) {
    const n = normalizedKey(name);

    if (/(fruta de temporada|\bfruta\b|kiwi|platano|aguacate)/.test(n)) return 'FRUTA';

    if (/(jamon serrano|jamon york|fiambre|lomo embuchado|lomo curado)/.test(n)) return 'FIAMBRE';

    if (/(muslo de pavo|pechuga de pavo|pavo fresco|pechuga de pollo|pollo fresco|lomo fresco|lomo de cerdo|hamburguesa)/.test(n)) return 'CARNE';

    if (/(salmon|merluza|rape|sepia|bacalao|almeja|mejillon)/.test(n)) return 'PESCADO';
    if (n === 'huevo' || /\bhuevos?\b/.test(n)) return 'HUEVOS';
    if (/(queso|yogur|arroz con leche|mantequilla|cheddar)/.test(n)) return 'LACTEOS';
    if (/(pan integral|pan sin gluten|tortitas|tortas de maiz|macarrones|gnocchi|cuscus|cous cous|corn flakes|special k|copos de avena|quinoa|arroz|pasta|cereal)/.test(n)) return 'PAN_CEREALES';
    if (/(atun en lata|atun en conserva|anchoas? en conserva|tomate frito|salsa de tomate|aceituna)/.test(n)) return 'CONSERVAS';

    if (/(tomate fresco|patata|guisante|judias verdes|zanahoria|cebolla|cebolleta|pimiento|lechuga|cogollo|champinon|ajo|rabano|calabaza|apio|puerro|pepino|calabacin)/.test(n)) return 'VERDURA';

    return 'OTROS';
  }

  function regroupShoppingItems() {
    const container = document.querySelector('.shopping-groups');
    if (!container) return;
    const items = [...container.querySelectorAll('.shopping-item')];
    if (!items.length) return;

    const buckets = Object.fromEntries(SHOPPING_GROUPS.map(group => [group.key, []]));
    items.forEach(item => {
      const name = item.querySelector('.shopping-name-row strong')?.textContent?.trim() || '';
      const key = categoryForProduct(name);
      (buckets[key] || buckets.OTROS).push(item);
    });

    const fragment = document.createDocumentFragment();
    SHOPPING_GROUPS.forEach(group => {
      const groupItems = buckets[group.key];
      if (!groupItems.length) return;
      const section = document.createElement('section');
      section.className = 'shopping-group';
      section.dataset.shoppingGroup = '';
      section.innerHTML = `<div class="shopping-category-head"><span class="shopping-category-icon">${group.icon}</span><h2>${group.label}</h2><span class="shopping-category-count">${groupItems.length}</span></div><div class="shopping-list"></div>`;
      const list = section.querySelector('.shopping-list');
      groupItems.forEach(item => list.appendChild(item));
      fragment.appendChild(section);
    });

    container.replaceChildren(fragment);
  }

  function decorateShoppingCards() {
    let decorated = 0;
    document.querySelectorAll('.shopping-item').forEach(item => {
      const text = item.querySelector('.shopping-text');
      const nameRow = item.querySelector('.shopping-name-row');
      const name = nameRow?.querySelector('strong')?.textContent?.trim() || '';
      if (!text || !nameRow || !name) return;

      const equivalenceNode = item.querySelector('.shopping-buy');
      const doseNode = item.querySelector('.shopping-dose');
      const days = item.querySelector('.shopping-days');
      const equivalence = equivalenceNode?.textContent?.trim() || '';
      const amount = (doseNode?.textContent || '').replace(/^Referencia dieta:\s*/i, '').trim();

      const oldUses = text.querySelector('.shopping-uses-v4');
      if (oldUses) oldUses.remove();

      if (item.dataset.cardV4 !== '1') {
        equivalenceNode?.remove();
        doseNode?.remove();

        const meta = document.createElement('span');
        meta.className = 'shopping-meta-v4';
        if (equivalence && amount) meta.textContent = `${equivalence} (${amount})`;
        else meta.textContent = equivalence || amount;
        if (meta.textContent) text.appendChild(meta);
      }

      const productUses = lookupUses(name);
      if (productUses.length) {
        const useBox = document.createElement('span');
        useBox.className = 'shopping-uses-v4';
        productUses.forEach(use => {
          const line = document.createElement('span');
          line.className = 'shopping-use-line-v4';
          line.textContent = use;
          useBox.appendChild(line);
        });
        if (days?.parentElement === text) text.insertBefore(useBox, days);
        else text.appendChild(useBox);
      }

      if (days) {
        days.classList.add('shopping-days-v4');
        text.appendChild(days);
      }

      item.dataset.cardV4 = '1';
      decorated++;
    });
    return decorated;
  }

  let observer = null;
  function stopObserver() { observer?.disconnect(); observer = null; }

  function arrangeShoppingLayout() {
    if ((location.hash.replace('#', '') || 'inicio') !== 'compra') return false;
    decorateShoppingCards();
    regroupShoppingItems();
    const filter = document.querySelector('.shopping-day-filter');
    const summary = document.querySelector('.shopping-summary');
    if (!filter || !summary || typeof app === 'undefined' || !app.contains(filter) || !app.contains(summary)) return false;
    app.appendChild(filter);
    app.appendChild(summary);
    return Boolean(document.querySelector('.shopping-item'));
  }

  function armShoppingLayout() {
    stopObserver();
    if ((location.hash.replace('#', '') || 'inicio') !== 'compra') return;
    observer = new MutationObserver(() => {
      if (arrangeShoppingLayout()) stopObserver();
    });
    observer.observe(app, { childList: true, subtree: true });
    arrangeShoppingLayout();
  }

  window.addEventListener('DOMContentLoaded', armShoppingLayout);
  window.addEventListener('hashchange', armShoppingLayout);
})();
