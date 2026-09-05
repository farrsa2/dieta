// Ajustes de experiencia de compra.
// 1) Los productos comprados se ocultan por defecto.
// 2) El botón refleja correctamente ese estado al entrar en la lista.

(() => {
  if (typeof routes === 'undefined' || typeof renderShopping !== 'function') return;

  const originalShoppingRoute = routes.compra;

  routes.compra = async function () {
    shoppingHideBought = true;
    await originalShoppingRoute();

    const toggle = document.querySelector('#toggle-bought');
    if (toggle) {
      toggle.textContent = 'Mostrar comprados';
      toggle.classList.add('active-soft');
    }
  };
})();
