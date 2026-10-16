import { describe, expect, it } from 'vitest';
import { inlineWorkerFactory } from '../../src/worker/inline-host';
import { compileWasm, wasmGlue } from '../../src/wasm/wasm-module';
import { requester } from '../support/requests';

describe('inlineWorkerFactory', () => {
  it('runs the wasm on the calling thread', async () => {
    const factory = inlineWorkerFactory(wasmGlue());
    expect(factory.runtime).toBe('inline');
    const handle = factory.create('');
    handle.post({ type: 'init', module: await compileWasm() });
    const request = requester(handle);
    expect(
      await request('hashDigest', new TextEncoder().encode('abc'), undefined, undefined),
    ).toEqual({
      id: 1,
      ok: true,
      result: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    });
    expect(await request('tokenDecrypt', 'nope', 'a-secret-key-1234567890', 1)).toEqual({
      id: 2,
      ok: false,
      error: 'MALFORMED|Invalid token format.',
      fatal: false,
    });
    const missing = await request('missing' as 'jwtDecode');
    expect(missing.ok).toBe(false);
    handle.onFailure(() => undefined);
    handle.keepAlive(true);
    handle.terminate();
  });

  it('marks a wasm trap as fatal', async () => {
    const trappingGlue = `var wasm_bindgen = Object.assign(() => Promise.resolve(), {
      jwtDecode: () => { throw new WebAssembly.RuntimeError('unreachable'); },
    });`;
    const handle = inlineWorkerFactory(trappingGlue).create('');
    handle.post({ type: 'init', module: await compileWasm() });
    const request = requester(handle);
    expect(await request('jwtDecode', 'x')).toEqual({
      id: 1,
      ok: false,
      error: 'unreachable',
      fatal: true,
    });
  });

  it('drops responses while nobody listens', async () => {
    const handle = inlineWorkerFactory(wasmGlue()).create('');
    handle.post({ type: 'init', module: await compileWasm() });
    const abc = new TextEncoder().encode('abc');
    handle.post({ id: 1, fn: 'hashDigest', args: [abc, undefined, undefined] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const request = requester(handle);
    expect((await request('hashDigest', abc, undefined, undefined)).ok).toBe(true);
  });
});
