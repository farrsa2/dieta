// Coloca los filtros de días y la tarjeta de progreso juntos al final de la lista.
(() => {
  function moveShoppingControlsToBottom() {
    const filter = document.querySelector('.shopping-day-filter');
    const summary = document.querySelector('.shopping-summary');
    if (!filter || !summary || !window.app) return false;
    if (!app.contains(filter) || !app.contains(summary)) return false;
    app.appendChild(filter);
    app.appendChild(summary);
    return true;
  }

  function moveWhenReady(attempt = 0) {
    if (moveShoppingControlsToBottom()) return;
    if (attempt < 40) setTimeout(() => moveWhenReady(attempt + 1), 50);
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (typeof routes !== 'undefined' && typeof routes.compra === 'function') {
      const previousCompra = routes.compra;
      routes.compra = async () => {
        await previousCompra();
        moveWhenReady();
      };
    }

    if ((location.hash.replace('#', '') || 'inicio') === 'compra') {
      moveWhenReady();
    }
  });
})();
