import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { browserWorkerFactory } from '../../src/worker/browser-host';
import { workerSource } from '../../src/worker/worker-source';
import { compileWasm, wasmGlue } from '../../src/wasm/wasm-module';
import { FakeWebWorker } from '../support/fake-web-worker';
import { requester } from '../support/requests';
import { required } from '../support/required';

const scope = globalThis as unknown as { Worker?: unknown };

describe('browserWorkerFactory', () => {
  beforeEach(() => {
    FakeWebWorker.created = [];
    scope.Worker = FakeWebWorker;
  });

  afterEach(() => {
    delete scope.Worker;
    jest.restoreAllMocks();
  });

  it('is not available without Web Workers', () => {
    delete scope.Worker;
    expect(browserWorkerFactory()).toBeUndefined();
  });

  it('runs the wasm in a Web Worker created from a Blob', async () => {
    const factory = browserWorkerFactory();
    expect(factory?.runtime).toBe('web-worker');
    const handle = required(factory).create(workerSource(wasmGlue()));
    handle.post({ type: 'init', module: await compileWasm() });
    const request = requester(handle);
    expect(await request('engineEncode', 'testhash123', 'HELLO WORLD')).toEqual({
      id: 1,
      ok: true,
      result: 'Pt3/97FmPVoz+4JG',
    });
    expect(await request('cipherDecrypt', 'nope', 'a-secret-key-1234567890', undefined)).toEqual({
      id: 2,
      ok: false,
      error: 'MALFORMED|Invalid encrypted format.',
      fatal: false,
    });
    const encrypted = await request(
      'cipherEncrypt',
      new Uint8Array([4, 5]),
      'a-secret-key-1234567890',
    );
    const bytes = await request(
      'cipherDecryptBytes',
      encrypted.ok && encrypted.result,
      'a-secret-key-1234567890',
    );
    expect(bytes.ok && [...(bytes.result as Uint8Array)]).toEqual([4, 5]);
  });

  it('reports worker failures', () => {
    const handle = required(browserWorkerFactory()).create(workerSource(wasmGlue()));
    const failures: string[] = [];
    handle.onFailure((error) => failures.push(error.message));
    FakeWebWorker.created[0].fail('boom');
    FakeWebWorker.created[0].fail();
    expect(failures).toEqual(['boom', 'Worker failed.']);
  });

  it('terminates the worker and releases its Blob URL', () => {
    const revoke = jest.spyOn(URL, 'revokeObjectURL');
    const handle = required(browserWorkerFactory()).create(workerSource(wasmGlue()));
    handle.keepAlive(true);
    handle.terminate();
    expect(FakeWebWorker.created[0].terminated).toBe(true);
    expect(revoke).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
  });
});
