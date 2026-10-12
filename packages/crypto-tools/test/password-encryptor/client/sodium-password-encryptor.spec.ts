import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { SodiumPasswordEncryptor } from '../../../src/password-encryptor/client/sodium-password-encryptor';
import { SodiumInitializer } from '../../../src/sodium-initializer';

const fakeSodium = {
  crypto_pwhash_OPSLIMIT_INTERACTIVE: 1,
  crypto_pwhash_MEMLIMIT_INTERACTIVE: 2,
  crypto_pwhash_OPSLIMIT_MODERATE: 3,
  crypto_pwhash_MEMLIMIT_MODERATE: 4,
  crypto_pwhash_OPSLIMIT_SENSITIVE: 5,
  crypto_pwhash_MEMLIMIT_SENSITIVE: 6,
  crypto_pwhash_str: (password: string, opslimit: number, memlimit: number) =>
    `${password}:${opslimit}:${memlimit}`,
};

describe('SodiumPasswordEncryptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hashes and verifies a password with the default salt rounds', async () => {
    const encryptor = new SodiumPasswordEncryptor();
    const hash = await encryptor.hashPassword('secret');
    expect(await encryptor.verifyPassword('secret', hash)).toBe(true);
    expect(await encryptor.verifyPassword('other', hash)).toBe(false);
  });

  it.each([
    [4, 'secret:1:2'],
    [10, 'secret:1:2'],
    [11, 'secret:3:4'],
    [20, 'secret:3:4'],
    [21, 'secret:5:6'],
    [31, 'secret:5:6'],
  ])('uses the cost limits that match %i salt rounds', async (saltRounds, expected) => {
    jest.spyOn(SodiumInitializer, 'getSodium').mockResolvedValue(fakeSodium);
    expect(await new SodiumPasswordEncryptor(saltRounds).hashPassword('secret')).toBe(expected);
  });
});
