import { afterAll, describe, expect, it } from '@jest/globals';
import { cipher } from '../../src/cipher/cipher';
import type { CipherAlgorithm } from '../../src/cipher/cipher';
import type { SecurityLevel } from '../../src/level/security-level';
import { workers } from '../../src/worker/workers';
import { fixtures, SECRET } from '../support/fixtures';

describe('cipher', () => {
  afterAll(() => {
    workers.terminate();
  });

  it.each<[SecurityLevel, string]>([
    ['basic', 'v1.aes-128-gcm.hkdf-sha256.'],
    ['standard', 'v1.aes-256-gcm.hkdf-sha256.'],
    ['strong', 'v1.xchacha20-poly1305.hkdf-sha256.'],
    ['cnsa', 'v1.aes-256-gcm.hkdf-sha384.'],
    ['military', 'v1.aes-256-gcm.hkdf-sha384.'],
  ])('encrypts and decrypts with level %s', async (level, prefix) => {
    const encrypted = await cipher.encrypt('Hello, Secure World! こんにちは', SECRET, { level });
    expect(encrypted.startsWith(prefix)).toBe(true);
    expect(await cipher.decrypt(encrypted, SECRET)).toBe('Hello, Secure World! こんにちは');
  });

  it('round-trips bytes and large texts', async () => {
    const bytes = Uint8Array.from({ length: 70_000 }, (_, index) => index % 256);
    const encrypted = await cipher.encrypt(bytes, SECRET, { algorithm: 'chacha20-poly1305' });
    expect(await cipher.decryptBytes(encrypted, SECRET)).toEqual(bytes);
    const large = 'A'.repeat(10_000);
    expect(await cipher.decrypt(await cipher.encrypt(large, SECRET), SECRET)).toBe(large);
  });

  it('produces a different ciphertext every time', async () => {
    const first = await cipher.encrypt('text', SECRET);
    expect(await cipher.encrypt('text', SECRET)).not.toBe(first);
  });

  it('generates keys that work at every level', async () => {
    const key = await cipher.generateKey({ level: 'cnsa' });
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const encrypted = await cipher.encrypt('text', key, { level: 'cnsa' });
    expect(await cipher.decrypt(encrypted, key)).toBe('text');
    expect(await cipher.generateKey()).not.toBe(key);
  });

  it('detects tampering and wrong keys', async () => {
    const encrypted = await cipher.encrypt('text', SECRET);
    const swapped = encrypted.slice(-2, -1) === 'A' ? 'B' : 'A';
    const tampered = `${encrypted.slice(0, -2)}${swapped}${encrypted.slice(-1)}`;
    await expect(cipher.decrypt(tampered, SECRET)).rejects.toMatchObject({ code: 'TAMPERED' });
    await expect(
      cipher.decrypt(encrypted, 'another-secret-key-with-32-characters!'),
    ).rejects.toMatchObject({
      code: 'TAMPERED',
    });
    await expect(cipher.decrypt('invalid', SECRET)).rejects.toMatchObject({ code: 'MALFORMED' });
  });

  it('enforces the minimum key length of each level', async () => {
    await expect(cipher.encrypt('text', '123456789012345')).rejects.toMatchObject({
      code: 'INVALID_KEY',
      message: 'Key must have a minimum length of 16 characters.',
    });
    await expect(
      cipher.encrypt('text', '0123456789abcdef', { level: 'cnsa' }),
    ).rejects.toMatchObject({
      message: 'Key must have a minimum length of 32 characters.',
    });
  });

  it.each(fixtures.legacyCipher)(
    'decrypts data from the previous SymmetricEncryption with $algorithm',
    async ({ algorithm, key, text, encrypted }) => {
      const legacy = `${algorithm}-hmac` as CipherAlgorithm;
      expect(await cipher.decrypt(encrypted, key, { algorithm: legacy })).toBe(text);
    },
  );

  it('keeps the previous format and its errors', async () => {
    const options = { algorithm: 'aes-256-cbc-hmac' as const };
    const key = 'my-secure-keymy-secure-keymy-secure-keymy-secure-key';
    const encrypted = await cipher.encrypt('Hello, Secure World!', key, options);
    expect(encrypted.split('|')).toHaveLength(3);
    expect(await cipher.decrypt(encrypted, key, options)).toBe('Hello, Secure World!');
    await expect(cipher.decrypt('invalid|encrypted|string', key, options)).rejects.toThrow(
      'Decryption failed: Invalid encrypted format.',
    );
    const tampered =
      'cc0f4587733fbd9c0d9a95757a53ae81|f5d580517206f7d29d83a2a9711251b532c1a7cdba346ba9d71e20e66fbceeea|55637b1e30d6589296eb72287ba561e34e0a6b22c76ea4d6d';
    await expect(cipher.decrypt(tampered, key, options)).rejects.toThrow(
      'Decryption failed: Invalid HMAC. Data may have been tampered with.',
    );
  });

  it('rejects data that is neither text nor bytes', async () => {
    await expect(cipher.encrypt(42 as unknown as string, SECRET)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'data must be a string or a Uint8Array.',
    });
    await expect(cipher.decrypt('x', 1 as unknown as string)).rejects.toThrow(
      'key must be a string.',
    );
    await expect(cipher.decryptBytes(1 as unknown as string, SECRET)).rejects.toThrow(
      'encrypted must be a string.',
    );
  });

  it('refuses an algorithm that contradicts the level', async () => {
    await expect(
      cipher.encrypt('x', SECRET, { level: 'basic', algorithm: 'aes-256-gcm' }),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED',
      message: 'Algorithm aes-256-gcm does not match level basic, which uses aes-128-gcm.',
    });
  });
});
