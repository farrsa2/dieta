(() => {
  const DATA_PATH = 'data/menu_14_dias.json';

  const escape = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  async function diagnoseOperationalData() {
    try {
      const response = await fetch(DATA_PATH, { cache: 'no-store' });
      if (!response.ok) {
        return {
          code: `DAT-HTTP-${response.status}`,
          message: `No se ha podido descargar ${DATA_PATH}. El servidor responde HTTP ${response.status}.`
        };
      }

      let envelope;
      try {
        envelope = await response.json();
      } catch (error) {
        return {
          code: 'DAT-JSON',
          message: `El archivo ${DATA_PATH} existe, pero su JSON externo no es válido.`
        };
      }

      let data = envelope;
      if (envelope?.encoding === 'gzip+base64' && envelope.payload) {
        if (typeof DecompressionStream === 'undefined') {
          return {
            code: 'DAT-GZIP-UNSUPPORTED',
            message: 'El archivo existe, pero este navegador no admite la descompresión gzip usada por la web.'
          };
        }
        try {
          const binary = Uint8Array.from(atob(envelope.payload), char => char.charCodeAt(0));
          const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'));
          const text = await new Response(stream).text();
          data = JSON.parse(text);
        } catch (error) {
          return {
            code: 'DAT-GZIP',
            message: 'El archivo existe, pero su contenido comprimido no se puede descomprimir o interpretar.'
          };
        }
      }

      const missing = [];
      if (!Array.isArray(data?.weeks)) missing.push('weeks');
      if (!data?.documents) missing.push('documents');
      if (!data?.shopping) missing.push('shopping');
      if (missing.length) {
        return {
          code: 'DAT-STRUCT',
          message: `El JSON se ha leído, pero faltan secciones obligatorias: ${missing.join(', ')}.`
        };
      }

      return {
        code: 'DAT-RUNTIME',
        message: 'El JSON existe, se descarga, se descomprime y tiene la estructura básica correcta. El fallo está en una fase posterior de inicialización de la web.'
      };
    } catch (error) {
      return {
        code: 'DAT-NETWORK',
        message: `Error de red al intentar cargar ${DATA_PATH}: ${error?.message || 'sin detalle'}.`
      };
    }
  }

  async function replaceGenericError() {
    const app = document.querySelector('#app');
    if (!app) return;
    const text = app.textContent || '';
    if (!/No se pudo cargar\s+data\/menu_14_dias\.json/i.test(text)) return;

    const result = await diagnoseOperationalData();
    app.innerHTML = `
      <section class="card status" style="text-align:left;max-width:720px;margin:24px auto">
        <strong>No se pudieron cargar los datos operativos.</strong>
        <p style="margin:.6rem 0">${escape(result.message)}</p>
        <p style="margin:0"><strong>Código:</strong> ${escape(result.code)}</p>
      </section>`;
    console.error('[DIETA]', result.code, result.message);
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { void replaceGenericError(); }, 250);
  });
})();
