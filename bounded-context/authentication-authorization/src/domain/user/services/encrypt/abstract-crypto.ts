export abstract class AbstractCrypto {
  abstract encode(message: string): string;

  abstract decode(message: string): string;
}
