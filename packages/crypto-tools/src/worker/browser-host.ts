import type { CryptoResponse } from './crypto-functions';
import type { WorkerFactory, WorkerHandle, WorkerMessage } from './worker-handle';

interface BrowserWorker {
  postMessage(message: WorkerMessage): void;
  onmessage: ((event: { data: CryptoResponse }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
  terminate(): void;
}

interface BrowserLikeGlobal {
  Worker?: new (url: string) => BrowserWorker;
  Blob?: new (parts: string[], options: { type: string }) => object;
  URL?: { createObjectURL?(blob: object): string; revokeObjectURL(url: string): void };
}

export function browserWorkerFactory(): WorkerFactory | undefined {
  const { Worker, Blob, URL } = globalThis as BrowserLikeGlobal;
  if (typeof Worker !== 'function' || typeof Blob !== 'function' || !URL?.createObjectURL) {
    return undefined;
  }
  const createObjectURL = URL.createObjectURL.bind(URL);
  return {
    runtime: 'web-worker',
    create(source: string): WorkerHandle {
      const url = createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const worker = new Worker(url);
      return {
        post: (message) => worker.postMessage(message),
        onMessage: (listener) => {
          worker.onmessage = (event) => listener(event.data);
        },
        onFailure: (listener) => {
          worker.onerror = (event) => listener(new Error(event.message ?? 'Worker failed.'));
        },
        keepAlive: () => undefined,
        terminate: () => {
          worker.terminate();
          URL.revokeObjectURL(url);
        },
      };
    },
  };
}
