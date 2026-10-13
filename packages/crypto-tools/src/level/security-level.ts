export const SECURITY_LEVEL_NAMES = ['basic', 'standard', 'strong', 'cnsa', 'military'] as const;

export type SecurityLevel = (typeof SECURITY_LEVEL_NAMES)[number];

export interface LevelOptions<Algorithm extends string> {
  level?: SecurityLevel;
  algorithm?: Algorithm;
}

export type PasswordParams =
  | { algorithm: 'bcrypt'; cost: number }
  | { algorithm: 'argon2id'; memoryKiB: number; iterations: number; parallelism: number };

export interface SecurityLevelDescription {
  cipher: string;
  token: string;
  hash: string;
  password: PasswordParams;
  rsa: { bits: number; encryption: string; signature: string };
  jwt: { secret: string; pem: string };
}

export type SecurityLevels = Record<Exclude<SecurityLevel, 'military'>, SecurityLevelDescription>;
