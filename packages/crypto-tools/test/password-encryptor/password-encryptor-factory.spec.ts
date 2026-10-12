import { describe, expect, it } from '@jest/globals';
import { PasswordEncryptorFactory } from '../../src/password-encryptor/password-encryptor-factory';
import { BcryptPasswordEncryptor } from '../../src/password-encryptor/client/bcrypt-password-encryptor';
import { SodiumPasswordEncryptor } from '../../src/password-encryptor/client/sodium-password-encryptor';

describe('PasswordEncryptorFactory defaults', () => {
  it('creates each encryptor with the default salt rounds', () => {
    expect(PasswordEncryptorFactory.create(BcryptPasswordEncryptor.name)).toBeInstanceOf(
      BcryptPasswordEncryptor,
    );
    expect(PasswordEncryptorFactory.create(SodiumPasswordEncryptor.name)).toBeInstanceOf(
      SodiumPasswordEncryptor,
    );
  });

  it('rejects an unsupported algorithm', () => {
    expect(() => PasswordEncryptorFactory.create('md5')).toThrow('Unsupported algorithm: md5');
  });
});
