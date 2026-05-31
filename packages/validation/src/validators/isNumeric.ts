import coerceToString from './util/coerceToString';
import { decimal } from './alpha';

const numericNoSymbols = /^[0-9]+$/;

export default function isNumeric(str, options) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  if (options && options.no_symbols) {
    return numericNoSymbols.test(str);
  }
  return new RegExp(
    `^[+-]?([0-9]*[${(options || {}).locale ? decimal[options.locale] : '.'}])?[0-9]+$`,
  ).test(str);
}
