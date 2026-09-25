import tryToString from './util/tryToString';
import { ValidationConfigError } from './util/errors';
import hasOwn from './util/hasOwn';

const lengths = {
  md5: 32,
  md4: 32,
  sha1: 40,
  sha256: 64,
  sha384: 96,
  sha512: 128,
  ripemd128: 32,
  ripemd160: 40,
  tiger128: 32,
  tiger160: 40,
  tiger192: 48,
  crc32: 8,
  crc32b: 8,
};

// One precompiled regex per algorithm (instead of a new RegExp on every call).
const hashRegex: Record<string, RegExp> = Object.fromEntries(
  Object.entries(lengths).map(([name, len]) => [name, new RegExp(`^[a-fA-F0-9]{${len}}$`)]),
);

export default function isHash(input: unknown, algorithm: string): boolean {
  if (!hasOwn(hashRegex, algorithm)) {
    throw new ValidationConfigError(`Invalid hash algorithm '${String(algorithm)}'`);
  }
  const s = tryToString(input);
  if (s === false) return false;
  return hashRegex[algorithm].test(s);
}
