import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type * as WorkersModule from '../../src/worker/workers';
import type { WorkerFactory } from '../../src/worker/worker-handle';
import { fakeFactory, flush } from '../support/fake-handle';
import { required } from '../support/required';

interface Setup {
  browser?: WorkerFactory;
  node?: WorkerFactory;
  compile?: () => Promise<unknown>;
}

async function loadWorkers(setup: Setup): Promise<typeof WorkersModule> {
  let loaded: typeof WorkersModule | undefined;
  await jest.isolateModulesAsync(async () => {
    jest.doMock('../../src/worker/browser-host', () => ({
      browserWorkerFactory: () => setup.browser,
    }));
    jest.doMock('../../src/worker/node-host', () => ({ nodeWorkerFactory: () => setup.node }));
    if (setup.compile) {
      const compile = setup.compile;
      jest.doMock('../../src/wasm/wasm-module', () => ({
        compileWasm: compile,
        wasmGlue: () => 'glue',
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
  });

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
