import { describe, expect, it } from '@jest/globals';
import { HasherFactory } from '../../src/hash/hasher-factory';
import { SodiumHasher } from '../../src/hash/client/sodium-hasher';

describe('HasherFactory', () => {
  it('creates a SodiumHasher with the default salt length', () => {
    expect(HasherFactory.create(SodiumHasher.name)).toBeInstanceOf(SodiumHasher);
  });

  it('rejects an unsupported algorithm', () => {
    expect(() => HasherFactory.create('md5')).toThrow('Unsupported algorithm: md5');
  });
});
