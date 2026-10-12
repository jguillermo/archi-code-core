import { describe, expect, it } from '@jest/globals';
import { SodiumHasher } from '../../../src/hash/client/sodium-hasher';

describe('SodiumHasher', () => {
  it('hashes with blake2b into 32 bytes of hex', async () => {
    expect(await new SodiumHasher().blake2b('text')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes with sha512 into 64 bytes of hex', async () => {
    expect(await new SodiumHasher().sha512('text')).toMatch(/^[0-9a-f]{128}$/);
  });

  it('keeps the same salt across hashes of one instance', async () => {
    const hasher = new SodiumHasher();
    expect(await hasher.blake2b('text')).toBe(await hasher.blake2b('text'));
  });
});
