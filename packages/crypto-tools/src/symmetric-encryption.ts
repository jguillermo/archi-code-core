import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

export class SymmetricEncryption {
  private static readonly validAlgorithms = ['aes-256-cbc', 'aes-192-cbc', 'aes-128-cbc'] as const;
  private readonly key: Buffer;
  private readonly ivLength: number = 16;

  constructor(
    private readonly algorithm: (typeof SymmetricEncryption.validAlgorithms)[number],
    key: string | Buffer,
  ) {
    if (!SymmetricEncryption.validAlgorithms.includes(algorithm)) {
      throw new Error(`Invalid algorithm: ${algorithm}. Allowed algorithms are: ${SymmetricEncryption.validAlgorithms.join(', ')}`);
    }
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    if (keyBuffer.length < 16) {
      throw new Error(`Key must have a minimum length of 16 characters.`);
    }
    this.key = this.adjustKey(keyBuffer);
  }

  private adjustKey(key: Buffer): Buffer {
    const keyLengths = {
      'aes-256-cbc': 32,
      'aes-192-cbc': 24,
      'aes-128-cbc': 16,
    };
    const requiredLength = keyLengths[this.algorithm] ?? 32;

    if (key.length === requiredLength) {
      return key;
    }

    if (key.length < requiredLength) {
      const repeatedKey = Buffer.alloc(requiredLength);
      for (let i = 0; i < requiredLength; i++) {
        repeatedKey[i] = key[i % key.length];
      }
      return repeatedKey;
    }
    return key.slice(0, requiredLength);
  }

  private generateHmac(data: string): string {
    const hmac = createHmac('sha256', this.key);
    hmac.update(data);
    return hmac.digest('hex');
  }

  encrypt(text: string): string {
    try {
      const iv = randomBytes(this.ivLength); // Generar IV
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
      const encryptedData = `${iv.toString('hex')}|${encrypted.toString('hex')}`;
      const hmac = this.generateHmac(encryptedData);
      return `${encryptedData}|${hmac}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  decrypt(encryptedWithIvAndHmac: string): string {
    try {
      const [iv, encrypted, hmac] = encryptedWithIvAndHmac.split('|');
      if (!iv || !encrypted || !hmac || iv.length !== this.ivLength * 2) {
        throw new Error('Invalid encrypted format.');
      }

      // Verificar integridad con HMAC
      const encryptedData = `${iv}|${encrypted}`;
      if (this.generateHmac(encryptedData) !== hmac) {
        throw new Error('Invalid HMAC. Data may have been tampered with.');
      }

      const decipher = createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (error) {
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }
}
