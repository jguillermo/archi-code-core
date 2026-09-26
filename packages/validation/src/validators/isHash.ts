import { toString } from '../convert/string';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import { configText } from '../helpers/config';

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

/** Supported algorithms (autocomplete); any string is accepted, unknown ones throw ValidationConfigError. */
export type HashAlgorithm = keyof typeof lengths | (string & {});

// One precompiled regex per algorithm (instead of a new RegExp on every call).
const hashRegex: Record<string, RegExp> = Object.fromEntries(
  Object.entries(lengths).map(([name, len]) => [name, new RegExp(`^[a-fA-F0-9]{${len}}$`)]),
);

export function isHash(input: unknown, algorithm: HashAlgorithm): boolean {
  if (!hasOwn(hashRegex, algorithm)) {
    throw new ValidationConfigError(`Invalid hash algorithm '${configText(algorithm)}'`);
  }
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  return hashRegex[algorithm].test(s);
}
