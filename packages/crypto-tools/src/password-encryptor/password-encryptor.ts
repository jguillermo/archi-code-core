export abstract class PasswordEncryptor {
  protected readonly _saltRounds: number;

  constructor(saltRounds: number = 10) {
    if (saltRounds < 4 || saltRounds > 31) {
      throw new Error('Salt rounds must be between 4 and 31.');
    }
    this._saltRounds = saltRounds;
  }

  /**
   * Generates a secure hash for a password.
   * @param password The plain text password.
   * @returns The generated hash.
   */
  abstract hashPassword(password: string): Promise<string>;

  /**
   * Verifies if a password matches its hash.
   * @param password The plain text password.
   * @param hash The hash to compare with.
   * @returns True if they match, otherwise false.
   */
  abstract verifyPassword(password: string, hash: string): Promise<boolean>;
}
