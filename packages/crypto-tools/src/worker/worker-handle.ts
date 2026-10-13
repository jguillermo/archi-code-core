import type { CryptoRequest, CryptoResponse } from './crypto-functions';

export interface InitMessage {
  type: 'init';
  module: WebAssembly.Module;
}

export type WorkerMessage = InitMessage | CryptoRequest;

export interface WorkerHandle {
  post(message: WorkerMessage): void;
  onMessage(listener: (response: CryptoResponse) => void): void;
  onFailure(listener: (error: Error) => void): void;
  keepAlive(active: boolean): void;
  terminate(): void;
}

export type WorkerRuntime = 'web-worker' | 'worker-threads' | 'inline';

export interface WorkerFactory {
  runtime: WorkerRuntime;
  create(source: string): WorkerHandle;
}
