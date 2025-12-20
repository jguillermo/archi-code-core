import { beforeEach, describe, expect, it } from '@jest/globals';
import { Hasher } from './hasher';
import { HasherFactory } from './hasher-factory';
import { SodiumHasher } from './client/sodium-hasher';

/*
joya
private static readonly validAlgorithms = ['sha256', 'sha512', 'blake2b'] as const;
 private readonly algorithm: (typeof Hasher.validAlgorithms)[number],
* */
describe('Hasher', () => {
  describe('Constructor', () => {
    it('should initialize correctly with valid algorithm and salt length', () => {
      const hasher = HasherFactory.create(SodiumHasher.name, 16);
      expect(hasher).toBeDefined();
    });

    it('should throw an error if salt length is not positive', () => {
      expect(() => HasherFactory.create(SodiumHasher.name, 0)).toThrowError('Salt length must be a positive number.');
      expect(() => HasherFactory.create(SodiumHasher.name, -5)).toThrowError('Salt length must be a positive number.');
    });

    it('should allow only valid algorithms', () => {
      expect(() => HasherFactory.create(SodiumHasher.name, 16)).not.toThrow();
      expect(() => HasherFactory.create(SodiumHasher.name, 16)).not.toThrow();
      expect(() => HasherFactory.create(SodiumHasher.name, 16)).not.toThrow();
    });
  });

  describe('hash()', () => {
    let hasher: Hasher;

    beforeEach(() => {
      hasher = HasherFactory.create(SodiumHasher.name, 16);
    });

    it('should generate a hash correctly', async () => {
      const text = 'TestPassword123!';
      const hash = await hasher.sha256(text);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]+$/); // Hexadecimal output
    });

    it('should generate different hashes for different texts', async () => {
      const text1 = 'TestPassword123!';
      const text2 = 'AnotherPassword!';
      const hash1 = await hasher.sha256(text1);
      const hash2 = await hasher.sha256(text2);
      expect(hash1).not.toEqual(hash2);
    });

    it('should generate consistent hash for the same text within the same instance', async () => {
      const text = 'TestPassword123!';
      const hash1 = await hasher.sha256(text);
      const hash2 = await hasher.sha256(text);
      expect(hash1).toEqual(hash2);
    });
  });

  describe('verify()', () => {
    let hasher: Hasher;

    beforeEach(() => {
      hasher = HasherFactory.create(SodiumHasher.name, 16);
    });

    it('should return false for invalid hash verification', async () => {
      const text = 'MySecurePassword123!';
      const wrongHash = 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234';
      const hash = await hasher.sha512(text);
      expect(wrongHash === hash).toBe(false);
    });

    it('should return false if the text does not match the hash', async () => {
      const text = 'MySecurePassword123!';
      const wrongText = 'WrongPassword!';
      const hash = await hasher.sha512(text);
      const isValid = await hasher.sha512(wrongText);
      expect(hash === isValid).toBe(false);
    });
  });
});
