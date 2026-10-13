import { afterEach, describe, expect, it, jest } from '@jest/globals';
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
    handle.post({ type: 'init', module: await compileWasm() });
    handle.keepAlive(true);
    const request = requester(handle);
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
    });
    handle.keepAlive(false);

    const stopped = new Promise<Error>((resolve) => handle.onFailure(resolve));
    handle.terminate();
    expect((await stopped).message).toBe('Worker stopped with exit code 1.');
  });
});
