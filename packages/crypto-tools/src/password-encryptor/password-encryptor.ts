export abstract class PasswordEncryptor {
  protected readonly _saltRounds: number;

  constructor(saltRounds = 10) {
    if (saltRounds < 4 || saltRounds > 31) {
      throw new Error('Salt rounds must be between 4 and 31.');
    }
    this._saltRounds = saltRounds;
  }

  abstract hashPassword(password: string): Promise<string>;

  abstract verifyPassword(password: string, hash: string): Promise<boolean>;
}
