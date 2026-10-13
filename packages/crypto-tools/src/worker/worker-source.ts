const HANDLER = `
;(function () {
  var threads = globalThis.process?.getBuiltinModule?.('node:worker_threads');
  var port = threads ? threads.parentPort : null;
  var send = function (message, transfer) {
    if (port) {
      port.postMessage(message, transfer);
    } else {
      self.postMessage(message, transfer);
    }
  };
  var ready;
  var handle = function (message) {
    if (message.type === 'init') {
      ready = wasm_bindgen({ module_or_path: message.module });
      ready.catch(function (error) {
        send({ type: 'failed', error: error instanceof Error ? error.message : String(error) });
      });
      return;
    }
    ready
      .then(function () {
        var result = wasm_bindgen[message.fn].apply(null, message.args);
        var transfer = result instanceof Uint8Array ? [result.buffer] : [];
        send({ id: message.id, ok: true, result: result }, transfer);
      })
      .catch(function (error) {
        send({
          id: message.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          fatal: error instanceof WebAssembly.RuntimeError,
        });
      });
  };
  if (port) {
    port.on('message', handle);
  } else {
    self.onmessage = function (event) {
      handle(event.data);
    };
  }
  send({ type: 'started' });
})();
`;

export function workerSource(glue: string): string {
  return glue + HANDLER;
}
