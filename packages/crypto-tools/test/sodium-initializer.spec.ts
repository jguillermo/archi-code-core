import { describe, expect, it, jest } from '@jest/globals';

describe('SodiumInitializer', () => {
  it('returns the same initialized sodium on every call', async () => {
    const { SodiumInitializer } = await import('../src/sodium-initializer');
    expect(await SodiumInitializer.getSodium()).toBe(await SodiumInitializer.getSodium());
  });

  it('propagates a failure while sodium gets ready', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await jest.isolateModulesAsync(async () => {
      jest.doMock('libsodium-wrappers-sumo', () => ({
        ready: Promise.reject(new Error('wasm failed')),
      }));
      const { SodiumInitializer } = await import('../src/sodium-initializer');
      await expect(SodiumInitializer.getSodium()).rejects.toThrow('wasm failed');
    });
    expect(error).toHaveBeenCalled();
    jest.dontMock('libsodium-wrappers-sumo');
    jest.restoreAllMocks();
  });
});
