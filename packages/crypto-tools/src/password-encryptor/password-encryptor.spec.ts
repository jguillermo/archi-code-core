import { beforeEach, describe, expect, it } from '@jest/globals';
import { PasswordEncryptor } from './password-encryptor';
import { PasswordEncryptorFactory } from './password-encryptor-factory';
import { BcryptPasswordEncryptor } from './client/bcrypt-password-encryptor';
import { SodiumPasswordEncryptor } from './client/sodium-password-encryptor';

describe('PasswordEncryptorFactory', () => {
  let listEncryptor: PasswordEncryptor[];
  const clients = [BcryptPasswordEncryptor.name, SodiumPasswordEncryptor.name];

  beforeEach(() => {
    listEncryptor = clients.map((clientName: string) => PasswordEncryptorFactory.create(clientName, 12));
  });

  describe('Constructor', () => {
    it('should initialize with a valid saltRounds value', () => {
      for (const client of clients) {
        expect(() => PasswordEncryptorFactory.create(client, 10)).not.toThrow();
      }
    });

    it('should throw an error if saltRounds is less than 4', () => {
      expect(() => PasswordEncryptorFactory.create(SodiumPasswordEncryptor.name, 3)).toThrowError('Salt rounds must be between 4 and 31.');
      for (const client of clients) {
        expect(() => PasswordEncryptorFactory.create(client, 3)).toThrowError('Salt rounds must be between 4 and 31.');
      }
    });

    it('should throw an error if saltRounds is greater than 31', () => {
      for (const client of clients) {
        expect(() => PasswordEncryptorFactory.create(client, 32)).toThrowError('Salt rounds must be between 4 and 31.');
      }
    });
  });

  describe('hashPassword', () => {
    it('should generate unique hashes for the same password', async () => {
      const password = 'SecurePassword123!';

      for (const encryptor of listEncryptor) {
        const hash1 = await encryptor.hashPassword(password);
        const hash2 = await encryptor.hashPassword(password);
        expect(hash1).not.toEqual(hash2);
      }
    });
  });

  describe('verifyPassword', () => {
    it('should successfully verify a valid password', async () => {
      const password = 'SecurePassword123!';
      for (const encryptor of listEncryptor) {
        const hash = await encryptor.hashPassword(password);
        const isValid = await encryptor.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it('should fail to verify an invalid password', async () => {
      const password = 'SecurePassword123!';
      for (const encryptor of listEncryptor) {
        const hash = await encryptor.hashPassword(password);
        const isValid = await encryptor.verifyPassword('WrongPassword!', hash);
        expect(isValid).toBe(false);
      }
    });

    it('should fail to verify with a malformed hash', async () => {
      for (const encryptor of listEncryptor) {
        const isValid = await encryptor.verifyPassword('SecurePassword123!', '$2b$12$malformedhashXXXXXXXXXXXXXXXXXXXXXXX');
        expect(isValid).toBe(false);
      }
    });
  });
});
