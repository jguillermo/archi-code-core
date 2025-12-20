export class JWTDataSigner {
  private static jwt: any = null;
  private readonly secretKey: string;
  private readonly signOptions: any;
  private readonly verifyOptions: any;

  constructor(secretKey: string, signOptions: any = {}, verifyOptions: any = {}) {
    const MIN_SECRET_KEY_LENGTH = 16;

    this.ensureJWTAvailable();

    if (typeof secretKey !== 'string' || secretKey.length < MIN_SECRET_KEY_LENGTH) {
      throw new Error(`La clave secreta debe ser una cadena de al menos ${MIN_SECRET_KEY_LENGTH} caracteres.`);
    }

    this.secretKey = secretKey;
    this.signOptions = signOptions;
    this.verifyOptions = verifyOptions;
  }

  private ensureJWTAvailable(): void {
    if (!JWTDataSigner.jwt) {
      try {
        JWTDataSigner.jwt = require('jsonwebtoken');
      } catch (error) {
        console.warn('jsonwebtoken is not installed. JWT signing functionality will not be available.');
        throw new Error('jsonwebtoken module is required but not installed.');
      }
    }
  }

  sign(data: object): string {
    return JWTDataSigner.jwt.sign(data, this.secretKey, this.signOptions);
  }

  verify(signedData: string): object {
    try {
      const data = JWTDataSigner.jwt.verify(signedData, this.secretKey, this.verifyOptions) as object | null;
      return data ?? {};
    } catch (error) {
      throw new Error(`verify Error: ${(error as Error).message}`);
    }
  }

  data(signedData: string): object {
    try {
      const decoded = JWTDataSigner.jwt.decode(signedData) as object | null;
      return decoded ?? {};
    } catch (error) {
      throw new Error(`data Error: ${(error as Error).message}`);
    }
  }
}
