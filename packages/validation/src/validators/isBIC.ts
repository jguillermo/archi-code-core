import { toString } from '../convert/string';
import { CountryCodes } from './isISO31661Alpha2';

// https://en.wikipedia.org/wiki/ISO_9362
const isBICReg = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;

export function isBIC(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;

  // toUpperCase() should be removed when a new major version goes out that changes
  // the regex to [A-Z] (per the spec).
  const countryCode = str.slice(4, 6).toUpperCase();

  if (!CountryCodes.has(countryCode) && countryCode !== 'XK') {
    return false;
  }

  return isBICReg.test(str);
}
