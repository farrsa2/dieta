// Consolidación estable de la lista de compra.
// 1) La compra se sirve desde data/menu_14_dias.json mediante el CSV embebido.
// 2) Las tarjetas muestran cantidad compacta, usos culinarios validados y días al final.
// 3) Filtros y resumen se colocan juntos al final sin alterar sincronización.
(() => {
  const LEGACY_SHOPPING_PATH = 'data/20260907_SEMANA01_COMPRA_LMX.csv';
  const MANUAL_SOY_MILK = 'Leche de soja | 6 × 1 L | 6 litros;J V S D';

  // Respaldo transitorio de SEMANA01. Las semanas nuevas deben traer estos datos
  // en DIET_OPERATIONAL.shopping.uses, generados durante la validación día a día.
  const CURRENT_RECIPE_USES = {
    'Fruta de temporada': ['J · Varias tomas', 'V · Varias tomas', 'S · Varias tomas', 'D · Varias tomas'],
    'Tomate fresco': ['J · Pan con tomate · Ensalada griega', 'V · Pan con tomate · Ensalada de jamón y mozzarella', 'S · Verduras asadas', 'D · Empedrado de alubias · Ensalada mixta II'],
    'Cebolla': ['J · Guisantes con jamón · Ensalada griega', 'S · Verduras asadas · Muslo de pavo con frutos secos · Bacalao marinera'],
    'Pimiento': ['S · Verduras asadas', 'D · Empedrado de alubias · Ensalada mixta II'],
    'Lechuga': ['J · Sándwich de pavo', 'V · Sándwich de pavo', 'S · Sándwich de pavo', 'D · Ensalada mixta II'],
    'Calabacín': ['S · Calabacines con orégano'],
    'Apio': ['D · Ensalada mixta II'],
    'Pepino': ['D · Ensalada mixta II'],
    'Ajo': ['S · Calabacines con orégano · Bacalao marinera'],
    'Guisantes': ['J · Guisantes con jamón'],
    'Jamón serrano': ['J · Guisantes con jamón', 'V · Ensalada de jamón y mozzarella', 'D · Pan con jamón serrano'],
    'Jamón York': ['V · Tostadas con jamón York', 'S · Tostadas con jamón York'],
    'Fiambre pechuga de pavo': ['J · Sándwich de pavo', 'V · Sándwich de pavo', 'S · Sándwich de pavo'],
    'Lomo embuchado': ['J · Tostada con lomo'],
    'Pechuga de pollo': ['J · Guisantes con jamón + pollo', 'D · Empedrado de alubias'],
    'Muslo de pavo': ['S · Muslo de pavo con frutos secos'],
    'Salmón': ['V · Tabuleh de quinoa + salmón'],
    'Bacalao': ['S · Bacalao marinera'],
    'Almejas': ['S · Bacalao marinera'],
    'Mejillones': ['S · Bacalao marinera'],
    'Merluza': ['D · Parrillada de pescado'],
    'Rape': ['D · Parrillada de pescado'],
    'Sepia': ['D · Parrillada de pescado'],
    'Huevo': ['J · Arroz a la cubana · Tortilla'],
    'Queso de Burgos': ['J · Media mañana · Ensalada griega', 'V · Merienda', 'S · Merienda', 'D · Merienda'],
    'Mozzarella': ['V · Ensalada de jamón y mozzarella'],
    'Yogur': ['J · Cena', 'V · Cena', 'S · Cena', 'D · Cena'],
    'Pan integral': ['J · Tostada · Pan con tomate · Sándwich de pavo', 'V · Pan con tomate · Tostadas con jamón York · Sándwich de pavo', 'S · Tostadas con jamón York · Sándwich de pavo', 'D · Tostada · Pan con jamón serrano · Merienda con atún'],
    'Arroz': ['J · Arroz a la cubana'],
    'Corn Flakes': ['V · Desayuno', 'S · Desayuno'],
    'Special K': ['S · Media mañana', 'D · Media mañana'],
    'Copos de avena': ['S · Desayuno · Media mañana', 'D · Media mañana'],
    'Alubias secas': ['D · Empedrado de alubias'],
    'Atún en lata': ['J · Tostadas con atún', 'D · Empedrado de alubias · Merienda'],
    'Aceitunas negras': ['J · Ensalada griega'],
    'Piñones': ['S · Muslo de pavo con frutos secos'],
    'Pasas': ['S · Muslo de pavo con frutos secos'],
    'Ciruelas secas': ['S · Muslo de pavo con frutos secos'],
    'Salsa de tomate': ['J · Arroz a la cubana'],
    'Tomate triturado': ['S · Bacalao marinera'],
    'Caldo vegetal': ['S · Bacalao marinera'],
    'Leche de soja': ['Compra manual · 6 litros']
  };

  if (typeof fetchText === 'function') {
    const fetchTextBase = fetchText;
    fetchText = async path => {
      if (path === LEGACY_SHOPPING_PATH && window.DIET_OPERATIONAL?.shopping?.csv) {
        let csv = window.DIET_OPERATIONAL.shopping.csv;
        if (!/(^|\n)Leche de soja\s*\|/i.test(csv)) csv = `${csv.trimEnd()}\n${MANUAL_SOY_MILK}\n`;
        return csv;
      }
      return fetchTextBase(path);
    };
  }

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
      .replace(/[^a-z0-9áéíóúüñ ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function aliasesForName(name) {
    const key = comparableKey(name);
    if (key.includes('tomate frito') && key.includes('salsa de tomate')) return ['salsa de tomate'];
    if (key.includes('muslo de pavo')) return ['muslo de pavo'];
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
    // Formato nuevo y preferido del JSON: { day: 'S', dish: 'Muslo de pavo con frutos secos' }
    if (use && typeof use === 'object' && !Array.isArray(use)) {
      const day = /^[LMXJVSD]$/i.test(String(use.day || '').trim()) ? String(use.day).trim().toUpperCase() : '';
      const dish = String(use.dish || '').trim();
      if (!dish || GENERIC_USE_PARTS.has(normalizedKey(dish))) return '';
      return day ? `${day} · ${dish}` : dish;
    }

    // Compatibilidad temporal con las cadenas antiguas de SEMANA01.
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
    const raw = operational.length ? operational : findUses(CURRENT_RECIPE_USES, name);
    return raw.map(cleanUseLine).filter(Boolean);
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

      if (item.dataset.cardV4 === '1') {
        if (days && days.parentElement !== text) text.appendChild(days);
        return;
      }

      equivalenceNode?.remove();
      doseNode?.remove();

      const meta = document.createElement('span');
      meta.className = 'shopping-meta-v4';
      if (equivalence && amount) meta.textContent = `${equivalence} (${amount})`;
      else meta.textContent = equivalence || amount;
      if (meta.textContent) text.appendChild(meta);

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
        text.appendChild(useBox);
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
