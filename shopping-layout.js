// Consolidación estable de la lista de compra.
// 1) La compra se sirve desde data/menu_14_dias.json mediante el CSV embebido.
// 2) Las tarjetas muestran cantidad compacta, usos culinarios y días al final.
// 3) Filtros y resumen se colocan juntos al final sin alterar sincronización.
(() => {
  const LEGACY_SHOPPING_PATH = 'data/20260907_SEMANA01_COMPRA_LMX.csv';
  const MANUAL_SOY_MILK = 'Leche de soja | 6 × 1 L | 6 litros;J V S D';

  // Compatibilidad con renderShopping: conserva la extensión .csv que usa el parser,
  // pero evita cualquier petición al fichero semanal. La fuente base real es el JSON operativo.
  // La leche de soja es una adición manual de compra solicitada expresamente por el usuario.
  if (typeof fetchText === 'function') {
    const fetchTextBase = fetchText;
    fetchText = async path => {
      if (path === LEGACY_SHOPPING_PATH && window.DIET_OPERATIONAL?.shopping?.csv) {
        let csv = window.DIET_OPERATIONAL.shopping.csv;
        if (!/(^|\n)Leche de soja\s*\|/i.test(csv)) {
          csv = `${csv.trimEnd()}\n${MANUAL_SOY_MILK}\n`;
        }
        return csv;
      }
      return fetchTextBase(path);
    };
  }

  const normalizedKey = (value = '') => String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function lookupUses(name) {
    const uses = window.DIET_OPERATIONAL?.shopping?.uses || {};
    if (Array.isArray(uses[name])) return uses[name];
    const key = normalizedKey(name);
    const match = Object.keys(uses).find(candidate => normalizedKey(candidate) === key);
    return match ? uses[match] : [];
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

      // Idempotencia: si ya está decorada, solo aseguramos que los días permanezcan abajo.
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

  function stopObserver() {
    observer?.disconnect();
    observer = null;
  }

  function arrangeShoppingLayout() {
    if ((location.hash.replace('#', '') || 'inicio') !== 'compra') return false;
    decorateShoppingCards();

    const filter = document.querySelector('.shopping-day-filter');
    const summary = document.querySelector('.shopping-summary');
    if (!filter || !summary || typeof app === 'undefined' || !app.contains(filter) || !app.contains(summary)) return false;

    // Los controles van al final, pero las tarjetas permanecen en sus grupos.
    app.appendChild(filter);
    app.appendChild(summary);
    return Boolean(document.querySelector('.shopping-item'));
  }

  function armShoppingLayout() {
    stopObserver();
    if ((location.hash.replace('#', '') || 'inicio') !== 'compra') return;

    // El JSON operativo se carga de forma asíncrona. Observamos hasta que renderShopping
    // haya creado las tarjetas; así no dependemos del orden de inicialización de routes.compra.
    observer = new MutationObserver(() => {
      if (arrangeShoppingLayout()) stopObserver();
    });
    observer.observe(app, { childList: true, subtree: true });
    arrangeShoppingLayout();
  }

  window.addEventListener('DOMContentLoaded', armShoppingLayout);
  window.addEventListener('hashchange', armShoppingLayout);
})();
