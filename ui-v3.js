// Ajustes de compra y Próxima comida.
// - Más separadores/categorías de compra.
// - En Próxima comida, receta solo en TOTAL y solo para Comida/Cena.

(() => {
  if (typeof routes === 'undefined') return;

  const previousCompra = routes.compra;
  const previousProxima = routes.proxima;

  const SHOPPING_CATEGORIES = [
    { key: 'FRUTA', label: 'Fruta', icon: '🍎' },
    { key: 'VERDURA', label: 'Verdura', icon: '🥬' },
    { key: 'FIAMBRE', label: 'Fiambre', icon: '🥓' },
    { key: 'CARNE', label: 'Carne', icon: '🥩' },
    { key: 'PESCADO', label: 'Pescado y marisco', icon: '🐟' },
    { key: 'HUEVOS', label: 'Huevos', icon: '🥚' },
    { key: 'LACTEOS', label: 'Lácteos', icon: '🧀' },
    { key: 'PAN_CEREALES', label: 'Pan, pasta y cereales', icon: '🍞' },
    { key: 'CONSERVAS', label: 'Legumbres y conservas', icon: '🥫' },
    { key: 'ESPECIAS', label: 'Especias y condimentos', icon: '🌿' },
    { key: 'OTROS', label: 'Otros', icon: '🧺' }
  ];

  function shoppingCategory(name = '') {
    const n = normalizeKey(name);

    if (/fruta de temporada|manzana|pera|platano|naranja|mandarina|kiwi|melocoton|nectarina|fresa|sandia|melon|uva/.test(n)) return 'FRUTA';

    if (/jamon serrano|jamon york|jamon de york|fiambre|lomo curado|pavo.*fiambre|pechuga de pavo.*fiambre/.test(n)) return 'FIAMBRE';

    if (/lomo fresco|pechuga de pollo|pechuga de pavo fresca|muslo de pavo|pollo|pavo fresco|cerdo|ternera/.test(n)) return 'CARNE';

    if (/salmon|merluza|rape|sepia|bacalao|almeja|mejillon|pescado|marisco/.test(n)) return 'PESCADO';

    if (/^huevo$|huevos/.test(n)) return 'HUEVOS';

    if (/queso|yogur|mozarella|mozzarella/.test(n)) return 'LACTEOS';

    if (/pan integral|pan sin gluten|tortitas|macarrones|pasta|arroz|corn flakes|copos de avena|avena|quinoa|cereal|special k/.test(n)) return 'PAN_CEREALES';

    if (/atun en lata|atun.*conserva|aceituna|salsa de tomate|tomate frito|garbanzo|alubia|legumbre/.test(n)) return 'CONSERVAS';

    if (/menta|romero|perejil|oregano|vinagre|especia|condimento|caldo vegetal/.test(n)) return 'ESPECIAS';

    if (/tomate fresco|patata|guisante|zanahoria|cebolla|pimiento|cebolleta|lechuga|rabano|calabaza|apio|puerro|pepino|calabacin|berenjena|ajo/.test(n)) return 'VERDURA';

    return 'OTROS';
  }

  function regroupShopping() {
    const container = document.querySelector('.shopping-groups');
    if (!container) return;

    const items = [...container.querySelectorAll('.shopping-item')];
    if (!items.length) return;

    const buckets = Object.fromEntries(SHOPPING_CATEGORIES.map(category => [category.key, []]));

    for (const item of items) {
      const name = item.querySelector('.shopping-name-row strong')?.textContent?.trim() || '';
      buckets[shoppingCategory(name)].push(item);
    }

    container.innerHTML = '';

    for (const category of SHOPPING_CATEGORIES) {
      const categoryItems = buckets[category.key];
      if (!categoryItems.length) continue;

      const section = document.createElement('section');
      section.className = 'shopping-group shopping-group-v3';
      section.setAttribute('data-shopping-group', '');
      section.innerHTML = `
        <div class="shopping-category-head shopping-category-head-v3">
          <span class="shopping-category-icon">${category.icon}</span>
          <h2>${category.label}</h2>
          <span class="shopping-category-count">${categoryItems.length}</span>
        </div>
        <div class="shopping-list"></div>`;

      const list = section.querySelector('.shopping-list');
      categoryItems.forEach(item => list.appendChild(item));
      container.appendChild(section);
    }
  }

  function keepOnlyTotalRecipe() {
    const card = document.querySelector('.next-card');
    if (!card) return;

    const meal = card.querySelector('.meal-name')?.textContent?.trim() || '';
    const isMainMeal = meal === 'Comida' || meal === 'Cena';

    // Nunca receta en tarjetas individuales de Almu o Fran dentro de Próxima comida.
    card.querySelectorAll('.person:not(.next-total) .cuadro-recipe-button').forEach(button => button.remove());

    // Fuera de Comida/Cena tampoco debe quedar ningún botón de receta.
    if (!isMainMeal) {
      card.querySelectorAll('.cuadro-recipe-button').forEach(button => button.remove());
    }
  }

  routes.compra = async () => {
    await previousCompra();
    regroupShopping();
  };

  routes.proxima = async () => {
    await previousProxima();
    keepOnlyTotalRecipe();
  };

  // La navegación anterior/posterior de Próxima comida debe pasar también por el ajuste.
  window.shiftMeal = delta => {
    mealOffset += delta;
    routes.proxima();
  };
})();
