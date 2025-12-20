export abstract class Hasher {
  protected saltToUse: Uint8Array;

  constructor(saltLength: number = 16) {
    if (saltLength <= 0) {
      throw new Error('Salt length must be a positive number.');
    }
    this.saltToUse = new Uint8Array(saltLength);
  }

  abstract sha256(text: string): Promise<string>;

  abstract sha512(text: string): Promise<string>;

  abstract blake2b(text: string): Promise<string>;
}
