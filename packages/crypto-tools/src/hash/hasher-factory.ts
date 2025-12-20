import { SodiumHasher } from './client/sodium-hasher';
import { Hasher } from './hasher';

export class HasherFactory {
  static create(algorithm: string, saltLength: number = 16): Hasher {
    switch (algorithm) {
      case SodiumHasher.name:
        return new SodiumHasher(saltLength);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }
}
