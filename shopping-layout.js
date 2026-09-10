// Consolidación estable de la lista de compra.
// 1) La compra se sirve desde data/menu_14_dias.json mediante el CSV embebido.
// 2) Filtros y resumen se colocan juntos al final sin temporizadores ni bucles.
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

  let observer = null;

  function stopObserver() {
    observer?.disconnect();
    observer = null;
  }

  function moveShoppingControlsToBottom() {
    const filter = document.querySelector('.shopping-day-filter');
    const summary = document.querySelector('.shopping-summary');
    if (!filter || !summary || typeof app === 'undefined' || !app.contains(filter) || !app.contains(summary)) return false;

    // Desconectar antes de modificar el DOM evita que el observador se reactive a sí mismo.
    stopObserver();
    app.appendChild(filter);
    app.appendChild(summary);
    return true;
  }

  function armShoppingLayout() {
    stopObserver();
    if ((location.hash.replace('#', '') || 'inicio') !== 'compra') return;
    if (moveShoppingControlsToBottom()) return;

    observer = new MutationObserver(() => {
      if (moveShoppingControlsToBottom()) stopObserver();
    });
    observer.observe(app, { childList: true, subtree: true });
  }

  window.addEventListener('DOMContentLoaded', armShoppingLayout);
  window.addEventListener('hashchange', armShoppingLayout);
})();
