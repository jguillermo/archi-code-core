import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { WorkerNotice } from '../../src/worker/crypto-functions';
import { nodeWorkerFactory } from '../../src/worker/node-host';
import { workerSource } from '../../src/worker/worker-source';
import { compileWasm, wasmGlue } from '../../src/wasm/wasm-module';
import { requester } from '../support/requests';
import { required } from '../support/required';

describe('nodeWorkerFactory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is not available outside Node', () => {
    jest.replaceProperty(globalThis, 'process', undefined as unknown as NodeJS.Process);
    expect(nodeWorkerFactory()).toBeUndefined();
  });

  it('runs the wasm in worker_threads, transfers bytes and reports when it stops', async () => {
    const factory = nodeWorkerFactory();
    expect(factory?.runtime).toBe('worker-threads');
    const handle = required(factory).create(workerSource(wasmGlue()));
    const notices: WorkerNotice[] = [];
    const request = requester(handle, notices);
    handle.post({ type: 'init', module: await compileWasm() });
    handle.keepAlive(true);
    const key = 'a-secret-key-1234567890';

    const encrypted = await request(
      'cipherEncrypt',
      new Uint8Array([1, 2, 3]),
      key,
      undefined,
      undefined,
    );
    expect(encrypted.ok).toBe(true);
    const decrypted = await request(
      'cipherDecryptBytes',
      encrypted.ok && encrypted.result,
      key,
      undefined,
    );
    expect(decrypted.ok && [...(decrypted.result as Uint8Array)]).toEqual([1, 2, 3]);
    expect(await request('cipherDecrypt', 'nope', key, undefined)).toEqual({
      id: 3,
      ok: false,
      error: 'MALFORMED|Invalid encrypted format.',
      fatal: false,
    });
    expect(notices).toEqual([{ type: 'started' }]);
    handle.keepAlive(false);

    const stopped = new Promise<Error>((resolve) => handle.onFailure(resolve));
    handle.terminate();
    expect((await stopped).message).toBe('Worker stopped with exit code 1.');
  });

  it('reports a wasm module that cannot start', async () => {
    const handle = required(nodeWorkerFactory()).create(workerSource(wasmGlue()));
    const notices: WorkerNotice[] = [];
    requester(handle, notices);
    const empty = await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    handle.post({ type: 'init', module: empty });
    while (notices.length < 2) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(notices[0]).toEqual({ type: 'started' });
    expect(notices[1]).toMatchObject({ type: 'failed', error: expect.any(String) });
    handle.terminate();
  });
});
