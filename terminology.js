// Terminología de interfaz del proyecto.
// Preferimos los nombres directos: Desayuno, Media mañana, Comida, Merienda y Cena.
// Cuando hace falta un genérico, usamos "toma" o una frase natural según el contexto.

(() => {
  const replacements = [
    [/Semana completa por ingestas/gi, 'Semana completa'],
    [/Las cinco ingestas de Almu y Fran/gi, 'Todo el día de Almu y Fran'],
    [/Recetas de esta ingesta/gi, 'Recetas de esta comida'],
    [/No se pudo determinar la ingesta actual/gi, 'No se pudo determinar qué toca ahora'],
    [/\bingestas\b/gi, 'tomas'],
    [/\bingesta\b/gi, 'toma']
  ];

  function cleanText(value) {
    let result = value;
    for (const [pattern, replacement] of replacements) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  function cleanNode(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const next = cleanText(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const next = cleanText(node.nodeValue || '');
          if (next !== node.nodeValue) node.nodeValue = next;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          cleanNode(node);
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    cleanNode(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
