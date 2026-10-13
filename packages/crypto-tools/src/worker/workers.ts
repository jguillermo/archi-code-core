import { CryptoError } from '../level/crypto-error';
import { compileWasm, wasmGlue } from '../wasm/wasm-module';
import { browserWorkerFactory } from './browser-host';
import type {
  CryptoFunctionName,
  CryptoFunctions,
  CryptoResponse,
  WorkerReply,
} from './crypto-functions';
import { inlineWorkerFactory } from './inline-host';
import { nodeWorkerFactory } from './node-host';
import type { WorkerFactory, WorkerHandle, WorkerRuntime } from './worker-handle';
import { workerSource } from './worker-source';

export type WorkerMode = 'auto' | 'worker' | 'inline';

export interface WorkersOptions {
  size?: number;
  mode?: WorkerMode;
  timeout?: number;
  idleTimeout?: number;
}

const MAX_DEFAULT_SIZE = 4;
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_IDLE_TIMEOUT = 30_000;
const WORKER_MODES: readonly WorkerMode[] = ['auto', 'worker', 'inline'];

interface PendingCall {
  fn: CryptoFunctionName;
  args: unknown[];
  resolve(value: unknown): void;
  reject(error: CryptoError): void;
}

interface PoolMember {
  runtime: WorkerRuntime;
  started: boolean;
  handle: WorkerHandle;
  ready: Promise<void>;
  pending: Map<number, PendingCall>;
  watchdog?: ReturnType<typeof setTimeout>;
  idle?: ReturnType<typeof setTimeout>;
}

function defaultSize(): number {
  const scope = globalThis as { navigator?: { hardwareConcurrency?: number } };
  const cores = scope.navigator?.hardwareConcurrency ?? 2;
  return Math.min(MAX_DEFAULT_SIZE, Math.max(1, cores - 1));
}

function checkOptions(options: WorkersOptions): void {
  const { size, mode, timeout, idleTimeout } = options;
  if (size !== undefined && (!Number.isInteger(size) || size < 1)) {
    throw new CryptoError('INVALID_INPUT', 'Worker pool size must be a positive integer.');
  }
  if (mode !== undefined && !WORKER_MODES.includes(mode)) {
    throw new CryptoError(
      'INVALID_INPUT',
      `Unknown worker mode: ${mode}. Use auto, worker or inline.`,
    );
  }
  if (timeout !== undefined && !(timeout > 0)) {
    throw new CryptoError(
      'INVALID_INPUT',
      'Worker timeout must be a positive number of milliseconds or Infinity.',
    );
  }
  if (idleTimeout !== undefined && !(idleTimeout > 0)) {
    throw new CryptoError(
      'INVALID_INPUT',
      'Worker idleTimeout must be a positive number of milliseconds or Infinity.',
    );
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class CryptoWorkerPool {
  private size = defaultSize();
  private mode: WorkerMode = 'auto';
  private timeout = DEFAULT_TIMEOUT;
  private idleTimeout = DEFAULT_IDLE_TIMEOUT;
  private members: PoolMember[] = [];
  private nextId = 1;
  private warnedInline = false;
  private workersBlocked = false;

  configure(options: WorkersOptions): void {
    checkOptions(options);
    this.terminate();
    this.size = options.size ?? this.size;
    this.mode = options.mode ?? this.mode;
    this.timeout = options.timeout ?? this.timeout;
    this.idleTimeout = options.idleTimeout ?? this.idleTimeout;
  }

  terminate(): void {
    const members = this.members;
    this.members = [];
    this.workersBlocked = false;
    for (const member of members) {
      this.stopTimers(member);
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
      const call: PendingCall = {
        fn,
        args,
        resolve: resolve as (value: unknown) => void,
        reject,
      };
      try {
        this.dispatch(this.nextId++, call);
      } catch (error) {
        reject(CryptoError.from(error));
      }
    });
  }

  private dispatch(id: number, call: PendingCall): void {
    const member = this.pick();
    member.pending.set(id, call);
    member.handle.keepAlive(true);
    clearTimeout(member.idle);
    member.idle = undefined;
    this.startWatchdog(member);
    void member.ready.then(
      () => member.handle.post({ id, fn: call.fn, args: call.args }),
      () => undefined,
    );
  }

  private factory(): WorkerFactory {
    if (this.mode !== 'inline' && !this.workersBlocked) {
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
      this.warnInline('no workers available');
    }
    return inlineWorkerFactory(wasmGlue());
  }

  private warnInline(reason: string): void {
    if (!this.warnedInline) {
      this.warnedInline = true;
      console.warn(`@archi-code/crypto-tools: ${reason}, running on the calling thread.`);
    }
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
    let handle: WorkerHandle;
    try {
      handle = factory.create(workerSource(wasmGlue()));
    } catch (error) {
      if (factory.runtime === 'inline' || this.mode === 'worker') {
        throw new CryptoError('WORKER', `Could not start a crypto worker: ${messageOf(error)}`);
      }
      this.workersBlocked = true;
      this.warnInline(`workers are blocked (${messageOf(error)})`);
      return this.spawn(this.factory());
    }
    const member: PoolMember = {
      runtime: factory.runtime,
      started: false,
      handle,
      pending: new Map(),
      ready: compileWasm().then((module) => handle.post({ type: 'init', module })),
    };
    member.ready.catch((error: unknown) => this.fail(member, error));
    handle.onMessage((reply) => this.receive(member, reply));
    handle.onFailure((error) => this.failed(member, error));
    this.members.push(member);
    return member;
  }

  private receive(member: PoolMember, reply: WorkerReply): void {
    if (!('type' in reply)) {
      this.settle(member, reply);
    } else if (reply.type === 'started') {
      member.started = true;
    } else {
      this.fail(member, reply.error);
    }
  }

  private settle(member: PoolMember, response: CryptoResponse): void {
    const call = member.pending.get(response.id);
    if (!call) {
      return;
    }
    member.pending.delete(response.id);
    member.started = true;
    this.stopWatchdog(member);
    if (response.ok) {
      call.resolve(response.result);
    } else if (response.fatal) {
      call.reject(new CryptoError('WORKER', `Crypto worker crashed: ${response.error}`));
      this.replace(member);
      return;
    } else {
      call.reject(CryptoError.from(response.error));
    }
    if (member.pending.size === 0) {
      member.handle.keepAlive(false);
      this.startIdle(member);
    } else {
      this.startWatchdog(member);
    }
  }

  private startIdle(member: PoolMember): void {
    if (!Number.isFinite(this.idleTimeout)) {
      return;
    }
    member.idle = setTimeout(() => this.retire(member), this.idleTimeout);
    member.idle.unref?.();
  }

  private retire(member: PoolMember): void {
    member.idle = undefined;
    this.members = this.members.filter((candidate) => candidate !== member);
    member.handle.terminate();
  }

  private stopTimers(member: PoolMember): void {
    this.stopWatchdog(member);
    clearTimeout(member.idle);
    member.idle = undefined;
  }

  private startWatchdog(member: PoolMember): void {
    const interruptible = member.runtime !== 'inline';
    if (member.watchdog !== undefined || !interruptible || !Number.isFinite(this.timeout)) {
      return;
    }
    member.watchdog = setTimeout(() => this.timedOut(member), this.timeout);
    member.watchdog.unref?.();
  }

  private stopWatchdog(member: PoolMember): void {
    clearTimeout(member.watchdog);
    member.watchdog = undefined;
  }

  private timedOut(member: PoolMember): void {
    member.watchdog = undefined;
    const [running] = member.pending;
    const [id, call] = running;
    member.pending.delete(id);
    call.reject(
      new CryptoError('TIMEOUT', `Crypto call ${call.fn} took longer than ${this.timeout} ms.`),
    );
    this.replace(member);
  }

  private replace(member: PoolMember): void {
    this.stopTimers(member);
    this.members = this.members.filter((candidate) => candidate !== member);
    const waiting = [...member.pending];
    member.pending.clear();
    member.handle.terminate();
    for (const [id, call] of waiting) {
      try {
        this.dispatch(id, call);
      } catch (error) {
        call.reject(CryptoError.from(error));
      }
    }
  }

  private failed(member: PoolMember, error: Error): void {
    const blockedBeforeStarting =
      member.runtime === 'web-worker' && !member.started && this.mode === 'auto';
    if (blockedBeforeStarting && this.members.includes(member)) {
      this.workersBlocked = true;
      this.warnInline(`workers are blocked (${error.message})`);
      this.replace(member);
      return;
    }
    this.fail(member, error);
  }

  private fail(member: PoolMember, error: unknown): void {
    this.stopTimers(member);
    this.members = this.members.filter((candidate) => candidate !== member);
    member.handle.terminate();
    this.rejectAll(member, new CryptoError('WORKER', `Crypto worker failed: ${messageOf(error)}`));
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
