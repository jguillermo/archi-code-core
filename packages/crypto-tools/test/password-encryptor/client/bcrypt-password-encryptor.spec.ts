import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PasswordEncryptor } from '../../../src/password-encryptor/password-encryptor';
import { PasswordEncryptorFactory } from '../../../src/password-encryptor/password-encryptor-factory';
import { BcryptPasswordEncryptor } from '../../../src/password-encryptor/client/bcrypt-password-encryptor';

describe('BcryptPasswordEncryptor', () => {
  let encryptor: PasswordEncryptor;

  beforeEach(() => {
    encryptor = PasswordEncryptorFactory.create(BcryptPasswordEncryptor.name, 12); // Setting up with 12 salt rounds.
  });

  describe('hashPassword', () => {
    it('should generate a valid hash for a password', async () => {
      const password = 'SecurePassword123!';
      const hash = await encryptor.hashPassword(password);
      expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/);
    });
  });

  describe('isValidHash', () => {
    it('should return true for a valid bcrypt hash', () => {
      const validHash = '$2b$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq';
      expect(BcryptPasswordEncryptor.isValidHash(validHash)).toBe(true);
    });

    it('should return false for a malformed hash', () => {
      const invalidHash = '$2b$malformedhash';
      expect(BcryptPasswordEncryptor.isValidHash(invalidHash)).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(BcryptPasswordEncryptor.isValidHash('')).toBe(false);
    });

    it('should return false for a hash from a different algorithm', () => {
      const nonBcryptHash = 'sha256$abcdef1234567890';
      expect(BcryptPasswordEncryptor.isValidHash(nonBcryptHash)).toBe(false);
    });
  });
});

describe('BcryptPasswordEncryptor without bcrypt', () => {
  it('uses 10 salt rounds when none are given', async () => {
    const hash = await new BcryptPasswordEncryptor().hashPassword('secret');
    expect(hash.startsWith('$2b$10$')).toBe(true);
  });

  it('refuses to work when bcrypt is not installed', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await jest.isolateModulesAsync(async () => {
      jest.doMock('bcrypt', () => {
        throw new Error('Cannot find module bcrypt');
      });
      const isolated =
        await import('../../../src/password-encryptor/client/bcrypt-password-encryptor');
      expect(() => new isolated.BcryptPasswordEncryptor()).toThrow(
        'bcrypt module is required but not installed.',
      );
    });
    jest.dontMock('bcrypt');
    jest.restoreAllMocks();
  });
});
