import { describe, expect, it } from '@jest/globals';
import { SymmetricEncryption } from './symmetric-encryption';

describe('SymmetricEncryption', () => {
  const validKey = 'my-secure-keymy-secure-keymy-secure-keymy-secure-key';
  const validKeyBuffer = Buffer.from(validKey, 'utf-8');
  const textToEncrypt = 'Hello, Secure World!';
  const invalidFormatString = 'invalid|encrypted|string';
  const algorithm = 'aes-256-cbc';

  it('should create an instance with a valid algorithm and key as string', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    expect(instance).toBeInstanceOf(SymmetricEncryption);
  });

  it('should create an instance with a valid algorithm and key as Buffer', () => {
    const instance = new SymmetricEncryption(algorithm, validKeyBuffer);
    expect(instance).toBeInstanceOf(SymmetricEncryption);
  });

  it('should throw an error for an invalid algorithm', () => {
    expect(() => new SymmetricEncryption('invalid-algorithm' as any, validKey)).toThrow(
      'Invalid algorithm: invalid-algorithm. Allowed algorithms are: aes-256-cbc, aes-192-cbc, aes-128-cbc',
    );
  });

  it('should throw an error for invalid key formats (not string or Buffer)', () => {
    expect(() => new SymmetricEncryption(algorithm, 123 as any)).toThrow();
  });

  it('should encrypt and decrypt text correctly', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const encrypted = instance.encrypt(textToEncrypt);
    const decrypted = instance.decrypt(encrypted);
    expect(decrypted).toBe(textToEncrypt);
  });

  it('should has in incorrect', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const encrypted = 'cc0f4587733fbd9c0d9a95757a53ae81|f5d580517206f7d29d83a2a9711251b532c1a7cdba346ba9d71e20e66fbceeea|55637b1e30d6589296eb72287ba561e34e0a6b22c76ea4d6d';
    expect(() => instance.decrypt(encrypted)).toThrow('Decryption failed: Invalid HMAC. Data may have been tampered with');
  });

  it('should produce unique ciphertexts for the same plaintext due to random IV', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const encrypted1 = instance.encrypt(textToEncrypt);
    const encrypted2 = instance.encrypt(textToEncrypt);
    expect(encrypted1).not.toBe(encrypted2); // IV ensures uniqueness
  });

  it('should throw an error if the encrypted string format is invalid', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    expect(() => instance.decrypt(invalidFormatString)).toThrow('Invalid encrypted format.');
  });

  it('should throw an error if HMAC validation fails (tampered ciphertext)', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const encrypted = instance.encrypt(textToEncrypt);
    const tamperedEncrypted = encrypted.replace(/.$/, '0'); // Modify the last character
    expect(() => instance.decrypt(tamperedEncrypted)).toThrow('Invalid HMAC. Data may have been tampered with.');
  });

  it('should handle long keys by truncating them to the required length', () => {
    const longKey = 'this-is-a-very-long-key-that-exceeds-32-bytes-in-length';
    const instance = new SymmetricEncryption(algorithm, longKey);
    const encrypted = instance.encrypt(textToEncrypt);
    const decrypted = instance.decrypt(encrypted);
    expect(decrypted).toBe(textToEncrypt);
  });

  it('should throw an error if the key is missing or empty', () => {
    expect(() => new SymmetricEncryption(algorithm, '')).toThrow();
  });
  it('should throw an error if the key is missing or empty', () => {
    expect(() => new SymmetricEncryption(algorithm, '123456789012345')).toThrow();
  });

  it('should ensure that HMAC is unique for different ciphertexts', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const encrypted1 = instance.encrypt(textToEncrypt);
    const encrypted2 = instance.encrypt(textToEncrypt);
    expect(encrypted1.split('|')[2]).not.toBe(encrypted2.split('|')[2]);
  });

  it('should handle non-ASCII text correctly', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const nonAsciiText = 'こんにちは、世界！'; // "Hello, World!" in Japanese
    const encrypted = instance.encrypt(nonAsciiText);
    const decrypted = instance.decrypt(encrypted);
    expect(decrypted).toBe(nonAsciiText);
  });

  it('should allow using a Buffer key for non-string keys', () => {
    const keyBuffer = Buffer.from(validKey, 'utf-8');
    const instance = new SymmetricEncryption(algorithm, keyBuffer);
    const encrypted = instance.encrypt(textToEncrypt);
    const decrypted = instance.decrypt(encrypted);
    expect(decrypted).toBe(textToEncrypt);
  });

  it('should throw an error for invalid IV length during decryption', () => {
    const instance = new SymmetricEncryption(algorithm, validKey);
    const invalidIvEncryptedString = 'shortiv|encrypteddata|hmac';
    expect(() => instance.decrypt(invalidIvEncryptedString)).toThrow('Invalid encrypted format.');
  });

  it('should encrypt large texts correctly', () => {
    const largeText = 'A'.repeat(10000); // 10,000 characters
    const instance = new SymmetricEncryption(algorithm, validKey);
    const encrypted = instance.encrypt(largeText);
    const decrypted = instance.decrypt(encrypted);
    expect(decrypted).toBe(largeText);
  });
});
