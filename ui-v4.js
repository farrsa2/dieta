// Tarjetas de compra v4: cantidad compacta + usos culinarios por producto.

(() => {
  if (typeof routes === 'undefined') return;

  const previousCompra = routes.compra;

  async function loadShoppingUses() {
    const week = activeWeek();
    const path = week?.compra?.usos;
    if (!path) return {};
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${path}`);
      return await response.json();
    } catch (error) {
      console.warn('No se pudo cargar el contexto de uso de la compra:', error);
      return {};
    }
  }

  function normalizedKey(value = '') {
    return String(value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function lookupUses(uses, name) {
    if (Array.isArray(uses[name])) return uses[name];
    const key = normalizedKey(name);
    const match = Object.keys(uses).find(candidate => normalizedKey(candidate) === key);
    return match ? uses[match] : [];
  }

  function decorateShoppingCards(uses) {
    document.querySelectorAll('.shopping-item').forEach(item => {
      const text = item.querySelector('.shopping-text');
      const nameRow = item.querySelector('.shopping-name-row');
      const name = nameRow?.querySelector('strong')?.textContent?.trim() || '';
      if (!text || !nameRow || !name) return;

      const equivalence = item.querySelector('.shopping-buy')?.textContent?.trim() || '';
      const doseNode = item.querySelector('.shopping-dose');
      const amount = (doseNode?.textContent || '').replace(/^Referencia dieta:\s*/i, '').trim();
      const days = item.querySelector('.shopping-days');

      item.querySelector('.shopping-buy')?.remove();
      doseNode?.remove();
      item.querySelector('.shopping-meta-v4')?.remove();
      item.querySelector('.shopping-uses-v4')?.remove();

      const meta = document.createElement('span');
      meta.className = 'shopping-meta-v4';
      if (equivalence && amount) meta.textContent = `${equivalence} (${amount})`;
      else meta.textContent = equivalence || amount;
      if (meta.textContent) text.appendChild(meta);

      const productUses = lookupUses(uses, name);
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
    });
  }

  routes.compra = async () => {
    await previousCompra();
    const uses = await loadShoppingUses();
    decorateShoppingCards(uses);
  };
})();
