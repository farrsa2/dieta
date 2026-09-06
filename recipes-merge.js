// Mantiene juntas las recetas del JSON operativo y las elaboraciones extraídas del PDF.
(() => {
  let recipes = { ...(window.DIET_PDF_RECIPES || {}) };
  Object.defineProperty(window, 'DIET_RECIPES', {
    configurable: true,
    enumerable: true,
    get() {
      return recipes;
    },
    set(value) {
      recipes = {
        ...(value || {}),
        ...(window.DIET_PDF_RECIPES || {})
      };
    }
  });
})();
