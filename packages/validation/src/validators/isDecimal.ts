import merge from './util/merge';
import tryToString from './util/tryToString';
import { decimal } from './alpha';

function decimalRegExp(options) {
  const regExp = new RegExp(
    `^[-+]?([0-9]+)?(\\${decimal[options.locale]}[0-9]{${options.decimal_digits}})${options.force_decimal ? '' : '?'}$`,
  );
  return regExp;
}

const default_decimal_options = {
  force_decimal: false,
  decimal_digits: '1,',
  locale: 'en-US',
};

const blacklist = ['', '-', '+'];

export default function isDecimal(str, options) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  options = merge(options, default_decimal_options);
  if (options.locale in decimal) {
    return !blacklist.includes(str.replace(/ /g, '')) && decimalRegExp(options).test(str);
  }
  throw new Error(`Invalid locale '${options.locale}'`);
}
