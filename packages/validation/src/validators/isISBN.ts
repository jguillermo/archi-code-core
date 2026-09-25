import { toString } from '../convert/string';

const possibleIsbn10 = /^(?:[0-9]{9}X|[0-9]{10})$/;
const possibleIsbn13 = /^(?:[0-9]{13})$/;
const factor = [1, 3];

export default function isISBN(
  input: unknown,
  options?: '10' | '13' | 10 | 13 | { version?: '10' | '13' | 10 | 13 },
): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const isbn: string = s;

  // For backwards compatibility:
  // isISBN(str [, version]), i.e. `options` could be used as argument for the legacy `version`
  const rawVersion = typeof options === 'object' ? options.version : options;
  const version = String(rawVersion);

  if (!rawVersion) {
    return isISBN(isbn, { version: 10 }) || isISBN(isbn, { version: 13 });
  }

  const sanitizedIsbn = isbn.replace(/[\s-]+/g, '');

  let checksum = 0;

  if (version === '10') {
    if (!possibleIsbn10.test(sanitizedIsbn)) {
      return false;
    }

    for (let i = 0; i < Number(version) - 1; i++) {
      checksum += (i + 1) * Number(sanitizedIsbn.charAt(i));
    }

    if (sanitizedIsbn.charAt(9) === 'X') {
      checksum += 10 * 10;
    } else {
      checksum += 10 * Number(sanitizedIsbn.charAt(9));
    }

    if (checksum % 11 === 0) {
      return true;
    }
  } else if (version === '13') {
    if (!possibleIsbn13.test(sanitizedIsbn)) {
      return false;
    }

    for (let i = 0; i < 12; i++) {
      checksum += factor[i % 2] * Number(sanitizedIsbn.charAt(i));
    }

    if (Number(sanitizedIsbn.charAt(12)) - ((10 - (checksum % 10)) % 10) === 0) {
      return true;
    }
  }

  return false;
}
