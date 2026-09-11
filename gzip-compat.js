(() => {
  if (!window.pako || typeof TransformStream === 'undefined') return;

  class PakoGzipDecompressionStream {
    constructor(format) {
      if (format !== 'gzip') throw new TypeError(`Formato no soportado: ${format}`);
      const chunks = [];
      return new TransformStream({
        transform(chunk) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        },
        flush(controller) {
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const input = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            input.set(chunk, offset);
            offset += chunk.length;
          }
          const output = window.pako.ungzip(input);
          controller.enqueue(output);
        }
      });
    }
  }

  window.__NATIVE_DECOMPRESSION_STREAM__ = window.DecompressionStream;
  window.DecompressionStream = PakoGzipDecompressionStream;
})();
