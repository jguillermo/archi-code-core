import { describe, expect, it } from '@jest/globals';
import { compileWasm, wasmGlue } from '../../src/wasm/wasm-module';

describe('wasm module', () => {
  it('compiles the embedded wasm once', async () => {
    const module = await compileWasm();
    expect(module).toBeInstanceOf(WebAssembly.Module);
    expect(await compileWasm()).toBe(module);
    const exports = WebAssembly.Module.exports(module).map((entry) => entry.name);
    expect(exports).toEqual(
      expect.arrayContaining(['passwordHash', 'cipherEncrypt', 'engineEncode']),
    );
  });

  it('ships the no-modules glue without Node globals', () => {
    const glue = wasmGlue();
    expect(glue.startsWith('let wasm_bindgen = (function(bindings) {')).toBe(true);
    expect(glue).not.toMatch(/\bexports\./);
  });
});
