import { UserPasswordEncryptor } from '@bounded-context/authentication-authorization';
import { BcryptPasswordEncryptor, PasswordEncryptor, PasswordEncryptorFactory } from '@code-core/cypto-tools';

export class BcryptUserPasswordEncryptor extends UserPasswordEncryptor {
  private service: PasswordEncryptor;

  constructor() {
    super();
    this.service = PasswordEncryptorFactory.create(BcryptPasswordEncryptor.name);
  }

  async encrypt(password: string): Promise<string> {
    return await this.service.hashPassword(password);
  }

  async verify(password: string, hashedPassword: string): Promise<boolean> {
    return await this.service.verifyPassword(password, hashedPassword);
  }
}
