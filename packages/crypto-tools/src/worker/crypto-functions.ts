type Optional<T> = T | undefined;

export interface CryptoFunctions {
  securityLevels(): string;
  passwordHash(
    password: string,
    level: Optional<string>,
    algorithm: Optional<string>,
    cost: Optional<number>,
  ): string;
  passwordVerify(password: string, hash: string): boolean;
  passwordIsHash(value: string): boolean;
  passwordParams(
    level: Optional<string>,
    algorithm: Optional<string>,
    cost: Optional<number>,
  ): string;
  cipherGenerateKey(level: Optional<string>, algorithm: Optional<string>): string;
  cipherEncrypt(
    data: Uint8Array,
    key: string,
    level: Optional<string>,
    algorithm: Optional<string>,
    password: Optional<boolean>,
  ): string;
  cipherDecrypt(text: string, key: string, algorithm: Optional<string>): string;
  cipherDecryptBytes(text: string, key: string, algorithm: Optional<string>): Uint8Array;
  tokenGenerateKey(): string;
  tokenEncrypt(
    payloadJson: string,
    key: string,
    level: Optional<string>,
    algorithm: Optional<string>,
    now: number,
    expiresIn: Optional<number>,
    requireExpiration: Optional<boolean>,
  ): string;
  tokenDecrypt(
    token: string,
    key: string,
    now: number,
    requireExpiration: Optional<boolean>,
  ): string;
  rsaGenerateKeyPair(level: Optional<string>, bits: Optional<number>): string;
  rsaEncrypt(
    data: Uint8Array,
    publicKey: string,
    level: Optional<string>,
    algorithm: Optional<string>,
  ): string;
  rsaDecrypt(token: string, privateKey: string): string;
  rsaDecryptBytes(token: string, privateKey: string): Uint8Array;
  signatureSign(
    data: Uint8Array,
    privateKey: string,
    level: Optional<string>,
    algorithm: Optional<string>,
  ): string;
  signatureVerify(data: Uint8Array, signature: string, publicKey: string): boolean;
  hashDigest(data: Uint8Array, level: Optional<string>, algorithm: Optional<string>): string;
  hashHmac(
    data: Uint8Array,
    key: string,
    level: Optional<string>,
    algorithm: Optional<string>,
  ): string;
  jwtSign(payloadJson: string, key: string, optionsJson: string, now: number): string;
  jwtVerify(token: string, key: string, optionsJson: string, now: number): string;
  jwtDecode(token: string): string;
}

export type CryptoFunctionName = keyof CryptoFunctions;

export interface CryptoRequest {
  id: number;
  fn: CryptoFunctionName;
  args: unknown[];
}

export type CryptoResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string; fatal?: boolean };

export type WorkerNotice = { type: 'started' } | { type: 'failed'; error: string };

export type WorkerReply = CryptoResponse | WorkerNotice;
