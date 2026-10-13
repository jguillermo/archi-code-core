import { describe, expect, it } from '@jest/globals';
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
    expect(await request('engineEncode', 'testhash123', 'HELLO WORLD')).toEqual({
      id: 1,
      ok: true,
      result: 'Pt3/97FmPVoz+4JG',
    });
    expect(await request('tokenDecrypt', 'nope', 'a-secret-key-1234567890', 1)).toEqual({
      id: 2,
      ok: false,
      error: 'MALFORMED|Invalid token format.',
      fatal: false,
    });
    const missing = await request('missing' as 'engineEncode');
    expect(missing.ok).toBe(false);
    handle.onFailure(() => undefined);
    handle.keepAlive(true);
    handle.terminate();
  });

  it('marks a wasm trap as fatal', async () => {
    const handle = inlineWorkerFactory(wasmGlue()).create('');
    handle.post({ type: 'init', module: await compileWasm() });
    const request = requester(handle);
    const huge = '$argon2id$v=19$m=4000000,t=1,p=1$c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA';
    expect(await request('passwordVerify', 'x', huge)).toEqual({
      id: 1,
      ok: false,
      error: 'unreachable',
      fatal: true,
    });
  });

  it('drops responses while nobody listens', async () => {
    const handle = inlineWorkerFactory(wasmGlue()).create('');
    handle.post({ type: 'init', module: await compileWasm() });
    handle.post({ id: 1, fn: 'engineEncode', args: ['k', 'x'] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const request = requester(handle);
    expect((await request('engineEncode', 'k', 'x')).ok).toBe(true);
  });
});
