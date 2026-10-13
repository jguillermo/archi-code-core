import type { CryptoResponse } from './crypto-functions';
import type { WorkerFactory, WorkerHandle, WorkerMessage } from './worker-handle';

interface NodeWorker {
  postMessage(message: WorkerMessage): void;
  on(event: 'message', listener: (response: CryptoResponse) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'exit', listener: (code: number) => void): void;
  ref(): void;
  unref(): void;
  terminate(): Promise<number>;
}

interface NodeWorkerThreads {
  Worker: new (source: string, options: { eval: true }) => NodeWorker;
}

interface NodeLikeGlobal {
  process?: { getBuiltinModule?(id: string): unknown };
}

function workerThreads(): NodeWorkerThreads | undefined {
  const scope = globalThis as NodeLikeGlobal;
  return scope.process?.getBuiltinModule?.('node:worker_threads') as NodeWorkerThreads | undefined;
}

export function nodeWorkerFactory(): WorkerFactory | undefined {
  const threads = workerThreads();
  if (!threads) {
    return undefined;
  }
  return {
    runtime: 'worker-threads',
    create(source: string): WorkerHandle {
      const worker = new threads.Worker(source, { eval: true });
      worker.unref();
      return {
        post: (message) => worker.postMessage(message),
        onMessage: (listener) => worker.on('message', listener),
        onFailure: (listener) => {
          worker.on('error', listener);
          worker.on('exit', (code) =>
            listener(new Error(`Worker stopped with exit code ${code}.`)),
          );
        },
        keepAlive: (active) => (active ? worker.ref() : worker.unref()),
        terminate: () => void worker.terminate(),
      };
    },
  };
}
