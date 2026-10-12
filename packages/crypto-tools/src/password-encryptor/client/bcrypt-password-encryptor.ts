import { PasswordEncryptor } from '../password-encryptor';

export class BcryptPasswordEncryptor extends PasswordEncryptor {
  private static bcrypt: any = null;

  constructor(saltRounds = 10) {
    super(saltRounds);
    this.ensureBcryptAvailable();
  }

  private ensureBcryptAvailable(): void {
    if (!BcryptPasswordEncryptor.bcrypt) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        BcryptPasswordEncryptor.bcrypt = require('bcrypt');
      } catch {
        console.warn('bcrypt is not installed. Password encryption will not be available.');
        throw new Error('bcrypt module is required but not installed.');
      }
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await BcryptPasswordEncryptor.bcrypt.hash(password, this._saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await BcryptPasswordEncryptor.bcrypt.compare(password, hash);
  }

  static isValidHash(hash: string): boolean {
    const bcryptRegex = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;
    return bcryptRegex.test(hash);
  }
}
