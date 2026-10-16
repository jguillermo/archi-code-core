import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browserWorkerFactory } from '../../src/worker/browser-host';
import type { WorkerNotice } from '../../src/worker/crypto-functions';
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
    vi.restoreAllMocks();
  });

  it('is not available without Web Workers', () => {
    delete scope.Worker;
    expect(browserWorkerFactory()).toBeUndefined();
  });

  it('runs the wasm in a Web Worker created from a Blob', async () => {
    const factory = browserWorkerFactory();
    expect(factory?.runtime).toBe('web-worker');
    const handle = required(factory).create(workerSource(wasmGlue()));
    const notices: WorkerNotice[] = [];
    const request = requester(handle, notices);
    handle.post({ type: 'init', module: await compileWasm() });
    expect(
      await request('hashDigest', new TextEncoder().encode('abc'), undefined, undefined),
    ).toEqual({
      id: 1,
      ok: true,
      result: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
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
    expect(notices).toEqual([{ type: 'started' }]);
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
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const handle = required(browserWorkerFactory()).create(workerSource(wasmGlue()));
    handle.keepAlive(true);
    handle.terminate();
    expect(FakeWebWorker.created[0].terminated).toBe(true);
    expect(revoke).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
  });
});
