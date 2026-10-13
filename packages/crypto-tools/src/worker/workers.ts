import { CryptoError } from '../level/crypto-error';
import { compileWasm, wasmGlue } from '../wasm/wasm-module';
import { browserWorkerFactory } from './browser-host';
import type { CryptoFunctionName, CryptoFunctions, CryptoResponse } from './crypto-functions';
import { inlineWorkerFactory } from './inline-host';
import { nodeWorkerFactory } from './node-host';
import type { WorkerFactory, WorkerHandle, WorkerRuntime } from './worker-handle';
import { workerSource } from './worker-source';

export type WorkerMode = 'auto' | 'worker' | 'inline';

export interface WorkersOptions {
  size?: number;
  mode?: WorkerMode;
}

const MAX_DEFAULT_SIZE = 4;
const WORKER_MODES: readonly WorkerMode[] = ['auto', 'worker', 'inline'];

interface PendingCall {
  resolve(value: unknown): void;
  reject(error: CryptoError): void;
}

interface PoolMember {
  handle: WorkerHandle;
  ready: Promise<void>;
  pending: Map<number, PendingCall>;
}

function defaultSize(): number {
  const scope = globalThis as { navigator?: { hardwareConcurrency?: number } };
  const cores = scope.navigator?.hardwareConcurrency ?? 2;
  return Math.min(MAX_DEFAULT_SIZE, Math.max(1, cores - 1));
}

function checkOptions(options: WorkersOptions): void {
  const { size, mode } = options;
  if (size !== undefined && (!Number.isInteger(size) || size < 1)) {
    throw new CryptoError('INVALID_INPUT', 'Worker pool size must be a positive integer.');
  }
  if (mode !== undefined && !WORKER_MODES.includes(mode)) {
    throw new CryptoError(
      'INVALID_INPUT',
      `Unknown worker mode: ${mode}. Use auto, worker or inline.`,
    );
  }
}

class CryptoWorkerPool {
  private size = defaultSize();
  private mode: WorkerMode = 'auto';
  private members: PoolMember[] = [];
  private nextId = 1;
  private warnedInline = false;

  configure(options: WorkersOptions): void {
    checkOptions(options);
    this.terminate();
    this.size = options.size ?? this.size;
    this.mode = options.mode ?? this.mode;
  }

  terminate(): void {
    const members = this.members;
    this.members = [];
    for (const member of members) {
      member.handle.terminate();
      this.rejectAll(member, new CryptoError('WORKER', 'Crypto workers were terminated.'));
    }
  }

  runtime(): WorkerRuntime {
    return this.factory().runtime;
  }

  call<Name extends CryptoFunctionName>(
    fn: Name,
    ...args: Parameters<CryptoFunctions[Name]>
  ): Promise<ReturnType<CryptoFunctions[Name]>> {
    return new Promise((resolve, reject) => {
      const member = this.pick();
      const id = this.nextId++;
      member.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      member.handle.keepAlive(true);
      void member.ready.then(
        () => member.handle.post({ id, fn, args }),
        () => undefined,
      );
    });
  }

  private factory(): WorkerFactory {
    if (this.mode !== 'inline') {
      const factory = browserWorkerFactory() ?? nodeWorkerFactory();
      if (factory) {
        return factory;
      }
      if (this.mode === 'worker') {
        throw new CryptoError(
          'WORKER',
          'This runtime has neither Web Workers nor worker_threads; use mode auto or inline.',
        );
      }
      if (!this.warnedInline) {
        this.warnedInline = true;
        console.warn(
          '@archi-code/crypto-tools: no workers available, running on the calling thread.',
        );
      }
    }
    return inlineWorkerFactory(wasmGlue());
  }

  private pick(): PoolMember {
    const idle = this.members.find((member) => member.pending.size === 0);
    if (idle) {
      return idle;
    }
    if (this.members.length === 0) {
      return this.spawn(this.factory());
    }
    const least = this.members.reduce((best, member) =>
      member.pending.size < best.pending.size ? member : best,
    );
    if (this.members.length < this.size) {
      const factory = this.factory();
      if (factory.runtime !== 'inline') {
        return this.spawn(factory);
      }
    }
    return least;
  }

  private spawn(factory: WorkerFactory): PoolMember {
    const handle = factory.create(workerSource(wasmGlue()));
    const member: PoolMember = {
      handle,
      pending: new Map(),
      ready: compileWasm().then((module) => handle.post({ type: 'init', module })),
    };
    member.ready.catch((error: unknown) => this.fail(member, error));
    handle.onMessage((response) => this.settle(member, response));
    handle.onFailure((error) => this.fail(member, error));
    this.members.push(member);
    return member;
  }

  private settle(member: PoolMember, response: CryptoResponse): void {
    const call = member.pending.get(response.id);
    if (!call) {
      return;
    }
    member.pending.delete(response.id);
    if (member.pending.size === 0) {
      member.handle.keepAlive(false);
    }
    if (response.ok) {
      call.resolve(response.result);
    } else {
      call.reject(CryptoError.from(response.error));
    }
  }

  private fail(member: PoolMember, error: unknown): void {
    this.members = this.members.filter((candidate) => candidate !== member);
    member.handle.terminate();
    const message = error instanceof Error ? error.message : String(error);
    this.rejectAll(member, new CryptoError('WORKER', `Crypto worker failed: ${message}`));
  }

  private rejectAll(member: PoolMember, error: CryptoError): void {
    const calls = [...member.pending.values()];
    member.pending.clear();
    for (const call of calls) {
      call.reject(error);
    }
  }
}

const pool = new CryptoWorkerPool();

export function callCrypto<Name extends CryptoFunctionName>(
  fn: Name,
  ...args: Parameters<CryptoFunctions[Name]>
): Promise<ReturnType<CryptoFunctions[Name]>> {
  return pool.call(fn, ...args);
}

export const workers = {
  configure(options: WorkersOptions): void {
    pool.configure(options);
  },
  terminate(): void {
    pool.terminate();
  },
  runtime(): WorkerRuntime {
    return pool.runtime();
  },
};
