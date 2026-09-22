import tryToString from './util/tryToString';
import { decimal } from './alpha';

const numericNoSymbols = /^[0-9]+$/;

export default function isNumeric(
  str: unknown,
  options?: { no_symbols?: boolean; locale?: string },
): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  if (options && options.no_symbols) {
    return numericNoSymbols.test(str);
  }
  return new RegExp(
    `^[+-]?([0-9]*[${(options || {}).locale ? decimal[options.locale] : '.'}])?[0-9]+$`,
  ).test(str);
}
