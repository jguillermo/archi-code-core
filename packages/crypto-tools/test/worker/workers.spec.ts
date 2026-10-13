import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type * as WorkersModule from '../../src/worker/workers';
import type { WorkerFactory } from '../../src/worker/worker-handle';
import { fakeFactory, flush } from '../support/fake-handle';
import { required } from '../support/required';

interface Setup {
  browser?: WorkerFactory;
  node?: WorkerFactory;
  compile?: () => Promise<unknown>;
  glue?: string;
}

async function loadWorkers(setup: Setup): Promise<typeof WorkersModule> {
  let loaded: typeof WorkersModule | undefined;
  await jest.isolateModulesAsync(async () => {
    jest.doMock('../../src/worker/browser-host', () => ({
      browserWorkerFactory: () => setup.browser,
    }));
    jest.doMock('../../src/worker/node-host', () => ({ nodeWorkerFactory: () => setup.node }));
    if (setup.compile) {
      const { compile, glue = 'glue' } = setup;
      jest.doMock('../../src/wasm/wasm-module', () => ({
        compileWasm: compile,
        wasmGlue: () => glue,
      }));
    }
    loaded = await import('../../src/worker/workers');
  });
  jest.dontMock('../../src/worker/browser-host');
  jest.dontMock('../../src/worker/node-host');
  jest.dontMock('../../src/wasm/wasm-module');
  return required(loaded);
}

const compiled = () => Promise.resolve({});

describe('workers with the real runtime', () => {
  afterEach(async () => {
    const { workers } = await import('../../src/worker/workers');
    workers.terminate();
    workers.configure({ mode: 'auto' });
  });

  it('uses worker_threads in Node', async () => {
    const { workers } = await import('../../src/worker/workers');
    expect(workers.runtime()).toBe('worker-threads');
  });

  it('validates the options', async () => {
    const { workers } = await import('../../src/worker/workers');
    expect(() => workers.configure({ size: 0 })).toThrow(
      'Worker pool size must be a positive integer.',
    );
    expect(() => workers.configure({ size: 1.5 })).toThrow(
      'Worker pool size must be a positive integer.',
    );
    expect(() => workers.configure({ mode: 'threads' as 'auto' })).toThrow(
      'Unknown worker mode: threads. Use auto, worker or inline.',
    );
    for (const timeout of [0, -1, Number.NaN]) {
      expect(() => workers.configure({ timeout })).toThrow(
        'Worker timeout must be a positive number of milliseconds or Infinity.',
      );
    }
    for (const idleTimeout of [0, -1, Number.NaN]) {
      expect(() => workers.configure({ idleTimeout })).toThrow(
        'Worker idleTimeout must be a positive number of milliseconds or Infinity.',
      );
    }
  });

  it('drops a worker whose wasm cannot start and serves the next calls with a new one', async () => {
    const real = await import('../../src/wasm/wasm-module');
    const { nodeWorkerFactory } = await import('../../src/worker/node-host');
    const empty = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    let broken = true;
    const { callCrypto, workers } = await loadWorkers({
      node: nodeWorkerFactory(),
      glue: real.wasmGlue(),
      compile: () => (broken ? WebAssembly.compile(empty) : real.compileWasm()),
    });
    workers.configure({ size: 1 });
    await expect(callCrypto('passwordIsHash', 'nope')).rejects.toMatchObject({
      code: 'WORKER',
      message: expect.stringContaining('Crypto worker failed: '),
    });
    broken = false;
    expect(await callCrypto('passwordIsHash', 'nope')).toBe(false);
    workers.terminate();
  });

  it('stops a call that runs longer than the timeout and keeps serving calls', async () => {
    const { callCrypto, workers } = await import('../../src/worker/workers');
    workers.configure({ size: 1, timeout: 200 });
    const slow = callCrypto('passwordHash', 'x', 'cnsa', undefined, undefined);
    const queued = callCrypto('engineEncode', 'testhash123', 'HELLO WORLD');
    await expect(slow).rejects.toMatchObject({
      code: 'TIMEOUT',
      message: 'Crypto call passwordHash took longer than 200 ms.',
    });
    await expect(queued).resolves.toBe('Pt3/97FmPVoz+4JG');
    workers.configure({ timeout: 60_000 });
  }, 30_000);

  it('runs calls in parallel and rejects pending calls on terminate', async () => {
    const { callCrypto, workers } = await import('../../src/worker/workers');
    workers.configure({ size: 2 });
    const digests = await Promise.all(
      ['a', 'b', 'c'].map((text) =>
        callCrypto('hashDigest', new TextEncoder().encode(text), undefined, undefined),
      ),
    );
    expect(new Set(digests).size).toBe(3);
    const pending = callCrypto('passwordHash', 'x', 'standard', undefined, undefined);
    workers.terminate();
    await expect(pending).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Crypto workers were terminated.',
    });
    expect(await callCrypto('passwordIsHash', 'nope')).toBe(false);
  });

  it('turns wasm errors into CryptoError', async () => {
    const { callCrypto } = await import('../../src/worker/workers');
    await expect(
      callCrypto('cipherDecrypt', 'nope', 'a-secret-key-1234567890', undefined),
    ).rejects.toMatchObject({
      name: 'CryptoError',
      code: 'MALFORMED',
      message: 'Invalid encrypted format.',
    });
  });
});

describe('workers pool', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('spawns up to the configured size and then picks the least busy worker', async () => {
    const { handles, factory } = fakeFactory();
    const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
    workers.configure({ size: 2 });
    for (const text of ['a', 'b', 'c', 'd']) {
      void callCrypto('engineEncode', 'k', text);
    }
    await flush();
    expect(handles).toHaveLength(2);
    expect(handles[0].posted[0]).toEqual({ type: 'init', module: {} });
    expect(handles[0].requests()).toEqual([1, 3]);
    expect(handles[1].requests()).toEqual([2, 4]);
    handles[0].respond({ id: 1, ok: true, result: 'x' });
    void callCrypto('engineEncode', 'k', 'e');
    await flush();
    expect(handles[0].requests()).toEqual([1, 3, 5]);
    handles[1].respond({ id: 2, ok: true, result: 'x' });
    handles[1].respond({ id: 4, ok: true, result: 'x' });
    void callCrypto('engineEncode', 'k', 'f');
    await flush();
    expect(handles[1].requests()).toEqual([2, 4, 6]);
  });

  it('sizes the pool from the available cores', async () => {
    jest.replaceProperty(globalThis, 'navigator', undefined as unknown as Navigator);
    const { handles, factory } = fakeFactory();
    const { callCrypto } = await loadWorkers({ node: factory, compile: compiled });
    void callCrypto('engineEncode', 'k', 'a');
    void callCrypto('engineEncode', 'k', 'b');
    await flush();
    expect(handles).toHaveLength(1);
  });

  it('resolves, rejects and lets idle workers sleep', async () => {
    const { handles, factory } = fakeFactory();
    const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
    workers.configure({ size: 1 });
    const ok = callCrypto('engineEncode', 'k', 'a');
    const failed = callCrypto('engineEncode', 'k', 'b');
    await flush();
    const [handle] = handles;
    handle.respond({ id: 99, ok: true, result: 'ignored' });
    handle.respond({ id: 1, ok: true, result: 'encoded' });
    handle.respond({ id: 2, ok: false, error: 'TAMPERED|Data may have been tampered with.' });
    await expect(ok).resolves.toBe('encoded');
    await expect(failed).rejects.toMatchObject({ code: 'TAMPERED' });
    expect(handle.alive).toEqual([true, true, false]);
  });

  it('drops a failed worker, rejects its calls and replaces it', async () => {
    const { handles, factory } = fakeFactory();
    const { callCrypto } = await loadWorkers({ node: factory, compile: compiled });
    const pending = callCrypto('engineEncode', 'k', 'a');
    await flush();
    handles[0].fail(new Error('boom'));
    await expect(pending).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Crypto worker failed: boom',
    });
    expect(handles[0].terminated).toBe(true);
    void callCrypto('engineEncode', 'k', 'b');
    await flush();
    expect(handles).toHaveLength(2);
  });

  it('rejects calls when the wasm cannot be compiled', async () => {
    const { handles, factory } = fakeFactory();
    const { callCrypto } = await loadWorkers({
      node: factory,
      compile: () => Promise.reject('bad wasm'),
    });
    await expect(callCrypto('engineEncode', 'k', 'a')).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Crypto worker failed: bad wasm',
    });
    expect(handles[0].terminated).toBe(true);
  });

  it('prefers Web Workers when both runtimes exist', async () => {
    const web = fakeFactory('web-worker');
    const node = fakeFactory();
    const { workers } = await loadWorkers({
      browser: web.factory,
      node: node.factory,
      compile: compiled,
    });
    expect(workers.runtime()).toBe('web-worker');
  });

  it('fails in worker mode when the runtime has no workers', async () => {
    const { callCrypto, workers } = await loadWorkers({ compile: compiled });
    workers.configure({ mode: 'worker' });
    expect(() => workers.runtime()).toThrow(
      'This runtime has neither Web Workers nor worker_threads',
    );
    await expect(callCrypto('engineEncode', 'k', 'a')).rejects.toMatchObject({ code: 'WORKER' });
  });

  it('falls back to a single inline runner with one warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { callCrypto, workers } = await loadWorkers({});
    workers.configure({ size: 3 });
    expect(workers.runtime()).toBe('inline');
    const results = await Promise.all([
      callCrypto('engineEncode', 'testhash123', 'HELLO WORLD'),
      callCrypto('engineEncode', 'testhash123', 'HELLO WORLD'),
    ]);
    expect(results).toEqual(['Pt3/97FmPVoz+4JG', 'Pt3/97FmPVoz+4JG']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('times out the running call, then retries the queued ones in a new worker', async () => {
    jest.useFakeTimers();
    try {
      const { handles, factory } = fakeFactory();
      const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
      workers.configure({ size: 1, timeout: 100 });
      const first = callCrypto('engineEncode', 'k', 'a');
      const second = callCrypto('engineEncode', 'k', 'b');
      const third = callCrypto('engineEncode', 'k', 'c');
      await jest.advanceTimersByTimeAsync(60);
      handles[0].respond({ id: 1, ok: true, result: 'A' });
      await expect(first).resolves.toBe('A');
      const timedOut = expect(second).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: 'Crypto call engineEncode took longer than 100 ms.',
      });
      await jest.advanceTimersByTimeAsync(60);
      expect(handles).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(40);
      await timedOut;
      expect(handles[0].terminated).toBe(true);
      expect(handles[1].requests()).toEqual([3]);
      handles[1].respond({ id: 3, ok: true, result: 'C' });
      await expect(third).resolves.toBe('C');
      expect(handles[1].alive).toEqual([true, false]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('closes idle workers to give their memory back and starts new ones on demand', async () => {
    jest.useFakeTimers();
    try {
      const { handles, factory } = fakeFactory();
      const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
      workers.configure({ size: 1, idleTimeout: 100 });
      const first = callCrypto('engineEncode', 'k', 'a');
      await jest.advanceTimersByTimeAsync(0);
      handles[0].respond({ id: 1, ok: true, result: 'A' });
      await expect(first).resolves.toBe('A');
      await jest.advanceTimersByTimeAsync(60);
      const second = callCrypto('engineEncode', 'k', 'b');
      await jest.advanceTimersByTimeAsync(60);
      expect(handles[0].terminated).toBe(false);
      handles[0].respond({ id: 2, ok: true, result: 'B' });
      await expect(second).resolves.toBe('B');
      await jest.advanceTimersByTimeAsync(100);
      expect(handles[0].terminated).toBe(true);
      const third = callCrypto('engineEncode', 'k', 'c');
      await jest.advanceTimersByTimeAsync(0);
      expect(handles[1].requests()).toEqual([3]);
      handles[1].respond({ id: 3, ok: true, result: 'C' });
      await expect(third).resolves.toBe('C');
      workers.configure({ idleTimeout: Infinity });
      const fourth = callCrypto('engineEncode', 'k', 'd');
      await jest.advanceTimersByTimeAsync(0);
      handles[2].respond({ id: 4, ok: true, result: 'D' });
      await expect(fourth).resolves.toBe('D');
      await jest.advanceTimersByTimeAsync(3_600_000);
      expect(handles[2].terminated).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('never times out with an infinite timeout', async () => {
    jest.useFakeTimers();
    try {
      const { handles, factory } = fakeFactory();
      const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
      workers.configure({ timeout: Infinity });
      const call = callCrypto('engineEncode', 'k', 'a');
      await jest.advanceTimersByTimeAsync(3_600_000);
      handles[0].respond({ id: 1, ok: true, result: 'late' });
      await expect(call).resolves.toBe('late');
    } finally {
      jest.useRealTimers();
    }
  });

  it('replaces a worker after a fatal error and retries its other calls', async () => {
    const { handles, factory } = fakeFactory();
    const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
    workers.configure({ size: 1 });
    const crashed = callCrypto('passwordVerify', 'x', 'huge');
    const queued = callCrypto('engineEncode', 'k', 'a');
    await flush();
    handles[0].respond({ id: 1, ok: false, error: 'unreachable', fatal: true });
    await expect(crashed).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Crypto worker crashed: unreachable',
    });
    expect(handles[0].terminated).toBe(true);
    await flush();
    expect(handles[1].requests()).toEqual([2]);
    handles[1].respond({ id: 2, ok: true, result: 'encoded' });
    await expect(queued).resolves.toBe('encoded');
  });

  it('rejects the retried calls when no new worker can start', async () => {
    const { handles, factory } = fakeFactory();
    const create = factory.create;
    let created = 0;
    factory.create = (source) => {
      created += 1;
      if (created > 1) {
        throw new Error('no more workers');
      }
      return create(source);
    };
    const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
    workers.configure({ size: 1, mode: 'worker' });
    const crashed = callCrypto('engineEncode', 'k', 'a');
    const queued = callCrypto('engineEncode', 'k', 'b');
    await flush();
    handles[0].respond({ id: 1, ok: false, error: 'unreachable', fatal: true });
    await expect(crashed).rejects.toMatchObject({ code: 'WORKER' });
    await expect(queued).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Could not start a crypto worker: no more workers',
    });
  });

  it('falls back to the calling thread when the page blocks workers', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blocked: WorkerFactory = {
      runtime: 'web-worker',
      create: () => {
        throw new Error('Refused by the Content Security Policy');
      },
    };
    const { callCrypto, workers } = await loadWorkers({ browser: blocked });
    expect(await callCrypto('engineEncode', 'testhash123', 'HELLO WORLD')).toBe('Pt3/97FmPVoz+4JG');
    expect(workers.runtime()).toBe('inline');
    expect(warn).toHaveBeenCalledWith(
      '@archi-code/crypto-tools: workers are blocked (Refused by the Content Security Policy), running on the calling thread.',
    );
    workers.terminate();
    expect(workers.runtime()).toBe('web-worker');
  });

  it('falls back to the calling thread when a Web Worker fails before answering', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const web = fakeFactory('web-worker');
    const { callCrypto, workers } = await loadWorkers({ browser: web.factory });
    const call = callCrypto('engineEncode', 'testhash123', 'HELLO WORLD');
    await flush();
    web.handles[0].fail(new Error('blocked by CSP'));
    await expect(call).resolves.toBe('Pt3/97FmPVoz+4JG');
    expect(web.handles[0].terminated).toBe(true);
    expect(workers.runtime()).toBe('inline');
    expect(warn).toHaveBeenCalledWith(
      '@archi-code/crypto-tools: workers are blocked (blocked by CSP), running on the calling thread.',
    );
    web.handles[0].fail(new Error('late exit'));
    workers.terminate();
  });

  it('keeps using Web Workers when one fails after it started', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const web = fakeFactory('web-worker');
    const { callCrypto, workers } = await loadWorkers({ browser: web.factory, compile: compiled });
    workers.configure({ size: 1 });
    const call = callCrypto('passwordHash', 'x', 'cnsa', undefined, undefined);
    await flush();
    web.handles[0].respond({ type: 'started' });
    web.handles[0].fail(new Error('Out of memory'));
    await expect(call).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Crypto worker failed: Out of memory',
    });
    expect(warn).not.toHaveBeenCalled();
    void callCrypto('engineEncode', 'k', 'a');
    await flush();
    expect(web.handles).toHaveLength(2);
    expect(workers.runtime()).toBe('web-worker');
  });

  it('rejects the calls of a worker whose wasm could not start and starts a new one', async () => {
    const { handles, factory } = fakeFactory();
    const { callCrypto, workers } = await loadWorkers({ node: factory, compile: compiled });
    workers.configure({ size: 1 });
    const first = callCrypto('engineEncode', 'k', 'a');
    const second = callCrypto('engineEncode', 'k', 'b');
    await flush();
    handles[0].respond({ type: 'started' });
    handles[0].respond({
      type: 'failed',
      error: 'WebAssembly.Memory(): could not allocate memory',
    });
    for (const call of [first, second]) {
      await expect(call).rejects.toMatchObject({
        code: 'WORKER',
        message: 'Crypto worker failed: WebAssembly.Memory(): could not allocate memory',
      });
    }
    expect(handles[0].terminated).toBe(true);
    const next = callCrypto('engineEncode', 'k', 'c');
    await flush();
    handles[1].respond({ id: 3, ok: true, result: 'C' });
    await expect(next).resolves.toBe('C');
  });

  it('treats other Web Worker failures as failures', async () => {
    const web = fakeFactory('web-worker');
    const { callCrypto, workers } = await loadWorkers({ browser: web.factory, compile: compiled });
    workers.configure({ size: 1 });
    const answered = callCrypto('engineEncode', 'k', 'a');
    const lost = callCrypto('engineEncode', 'k', 'b');
    await flush();
    web.handles[0].respond({ id: 1, ok: true, result: 'A' });
    await expect(answered).resolves.toBe('A');
    web.handles[0].fail(new Error('crashed'));
    await expect(lost).rejects.toMatchObject({ message: 'Crypto worker failed: crashed' });
    workers.configure({ mode: 'worker' });
    const strict = callCrypto('engineEncode', 'k', 'c');
    await flush();
    web.handles[1].fail(new Error('blocked'));
    await expect(strict).rejects.toMatchObject({ message: 'Crypto worker failed: blocked' });
    expect(workers.runtime()).toBe('web-worker');
  });

  it('reports blocked workers in worker mode and an inline runner that cannot start', async () => {
    const blocked: WorkerFactory = {
      runtime: 'web-worker',
      create: () => {
        throw new Error('blocked');
      },
    };
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { callCrypto, workers } = await loadWorkers({ browser: blocked, compile: compiled });
    workers.configure({ mode: 'worker' });
    await expect(callCrypto('engineEncode', 'k', 'a')).rejects.toMatchObject({
      code: 'WORKER',
      message: 'Could not start a crypto worker: blocked',
    });
    workers.configure({ mode: 'auto' });
    await expect(callCrypto('engineEncode', 'k', 'a')).rejects.toMatchObject({
      code: 'WORKER',
      message: expect.stringContaining('Could not start a crypto worker:'),
    });
  });

  it('never arms a timeout for calls on the calling thread', async () => {
    const timers = jest.spyOn(globalThis, 'setTimeout');
    const { callCrypto, workers } = await loadWorkers({});
    workers.configure({ mode: 'inline', timeout: 12_345, idleTimeout: Infinity });
    expect(await callCrypto('engineEncode', 'testhash123', 'HELLO WORLD')).toBe('Pt3/97FmPVoz+4JG');
    expect(timers.mock.calls.some(([, delay]) => delay === 12_345)).toBe(false);
  });

  it('runs inline on request without warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { handles, factory } = fakeFactory();
    const { callCrypto, workers } = await loadWorkers({ node: factory });
    workers.configure({ mode: 'inline' });
    expect(await callCrypto('engineEncode', 'testhash123', 'HELLO WORLD')).toBe('Pt3/97FmPVoz+4JG');
    expect(handles).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
  });
});
