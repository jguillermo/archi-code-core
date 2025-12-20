import { Hasher } from '../hasher';
import { SodiumInitializer } from '../../sodium-initializer';

export class SodiumHasher extends Hasher {
  constructor(saltLength: number = 16) {
    super(saltLength);
  }

  private async hash(text: string, algorithm: 'sha256' | 'sha512' | 'blake2b'): Promise<string> {
    const sodium = await SodiumInitializer.getSodium(); // Obtener Libsodium inicializado

    // Generar sal si aún no existe
    if (this.saltToUse.every((byte) => byte === 0)) {
      this.saltToUse = sodium.randombytes_buf(this.saltToUse.length);
    }

    // Convertir texto y sal a Uint8Array
    const textBytes = sodium.from_string(text);
    const combined = new Uint8Array(textBytes.length + this.saltToUse.length);
    combined.set(textBytes);
    combined.set(this.saltToUse, textBytes.length);

    // Aplicar el algoritmo seleccionado
    let hash: Uint8Array;
    switch (algorithm) {
      case 'sha256':
        hash = sodium.crypto_hash_sha256(combined);
        break;
      case 'sha512':
        hash = sodium.crypto_hash_sha512(combined);
        break;
      case 'blake2b':
        hash = sodium.crypto_generichash(sodium.crypto_generichash_BYTES, combined);
        break;
    }
    return sodium.to_hex(hash);
  }

  async blake2b(text: string): Promise<string> {
    return await this.hash(text, 'blake2b');
  }

  async sha256(text: string): Promise<string> {
    return await this.hash(text, 'sha256');
  }

  async sha512(text: string): Promise<string> {
    return await this.hash(text, 'sha512');
  }
}
