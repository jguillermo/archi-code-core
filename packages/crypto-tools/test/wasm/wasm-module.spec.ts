import { describe, expect, it, jest } from '@jest/globals';
import { compileWasm, wasmGlue } from '../../src/wasm/wasm-module';

describe('wasm module', () => {
  it('compiles the embedded wasm once', async () => {
    const module = await compileWasm();
    expect(module).toBeInstanceOf(WebAssembly.Module);
    expect(await compileWasm()).toBe(module);
    const exports = WebAssembly.Module.exports(module).map((entry) => entry.name);
    expect(exports).toEqual(expect.arrayContaining(['passwordHash', 'cipherEncrypt', 'jwtDecode']));
  });

  it('compiles again after a failed compilation', async () => {
    await jest.isolateModulesAsync(async () => {
      const { compileWasm: compileFresh } = await import('../../src/wasm/wasm-module');
      const compile = jest
        .spyOn(WebAssembly, 'compile')
        .mockRejectedValueOnce(new Error('out of memory'));
      await expect(compileFresh()).rejects.toThrow('out of memory');
      expect(await compileFresh()).toBeInstanceOf(WebAssembly.Module);
      expect(compile).toHaveBeenCalledTimes(2);
      compile.mockRestore();
    });
  });

  it('ships the no-modules glue without Node globals', () => {
    const glue = wasmGlue();
    expect(glue.startsWith('let wasm_bindgen = (function(bindings) {')).toBe(true);
    expect(glue).not.toMatch(/\bexports\./);
  });
});
