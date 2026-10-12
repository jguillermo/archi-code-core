import { describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = [
  'BcryptPasswordEncryptor',
  'CryptoEngine',
  'Hasher',
  'HasherFactory',
  'JWTDataSigner',
  'PasswordEncryptor',
  'PasswordEncryptorFactory',
  'SodiumHasher',
  'SodiumPasswordEncryptor',
];

describe('@archi-code/crypto-tools', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });
});
