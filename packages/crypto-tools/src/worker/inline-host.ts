import type { CryptoFunctions, CryptoResponse } from './crypto-functions';
import type { WorkerFactory, WorkerHandle, WorkerMessage } from './worker-handle';

type Bindings = CryptoFunctions &
  ((options: { module_or_path: WebAssembly.Module }) => Promise<unknown>);

function loadBindings(glue: string): Bindings {
  return new Function(`${glue}\nreturn wasm_bindgen;`)() as Bindings;
}

function run(bindings: Bindings, fn: keyof CryptoFunctions, args: unknown[]): unknown {
  return (bindings[fn] as (...values: unknown[]) => unknown)(...args);
}

export function inlineWorkerFactory(glue: string): WorkerFactory {
  return {
    runtime: 'inline',
    create(): WorkerHandle {
      const bindings = loadBindings(glue);
      let ready: Promise<unknown> = Promise.resolve();
      let listener: (response: CryptoResponse) => void = () => undefined;
      return {
        post: (message: WorkerMessage) => {
          if ('type' in message) {
            ready = bindings({ module_or_path: message.module });
            return;
          }
          ready
            .then(() => run(bindings, message.fn, message.args))
            .then(
              (result) => listener({ id: message.id, ok: true, result }),
              (error: unknown) =>
                listener({
                  id: message.id,
                  ok: false,
                  error: error instanceof Error ? error.message : String(error),
                  fatal: error instanceof WebAssembly.RuntimeError,
                }),
            );
        },
        onMessage: (next) => {
          listener = next;
        },
        onFailure: () => undefined,
        keepAlive: () => undefined,
        terminate: () => undefined,
      };
    },
  };
}
