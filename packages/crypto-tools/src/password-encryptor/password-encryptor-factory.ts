import { BcryptPasswordEncryptor } from './client/bcrypt-password-encryptor';
import { PasswordEncryptor } from './password-encryptor';
import { SodiumPasswordEncryptor } from './client/sodium-password-encryptor';

export class PasswordEncryptorFactory {
  static create(algorithm: string, saltRounds = 10): PasswordEncryptor {
    switch (algorithm) {
      case BcryptPasswordEncryptor.name:
        return new BcryptPasswordEncryptor(saltRounds);
      case SodiumPasswordEncryptor.name:
        return new SodiumPasswordEncryptor(saltRounds);
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }
}
