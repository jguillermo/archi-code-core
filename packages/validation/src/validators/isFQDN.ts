import type { IsFQDNOptions } from '../types';
import tryToString from './util/tryToString';
import merge from './util/merge';

const default_fqdn_options = {
  require_tld: true,
  allow_underscores: false,
  allow_trailing_dot: false,
  allow_numeric_tld: false,
  allow_wildcard: false,
  ignore_max_length: false,
};

// Hoisted regexes — declaring them at module scope avoids reallocating a RegExp
// object for every part on every call (the per-part checks run inside a hot loop).
const tldRegex = /^([a-z¡-¨ª-퟿豈-﷏ﷰ-￯]{2,}|xn[a-z0-9-]{2,})$/i;
const whitespaceRegex = /\s/;
const numericRegex = /^\d+$/;
const partCharsRegex = /^[a-z_¡-￿0-9-]+$/i;
const fullWidthRegex = /[！-～]/;
const hyphenEdgeRegex = /^-|-$/;
const underscoreRegex = /_/;

export default function isFQDN(str: unknown, options?: IsFQDNOptions): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  let strVal = s;
  options = merge(options, default_fqdn_options);

  /* Remove the optional trailing dot before checking validity */
  if (options.allow_trailing_dot && strVal[strVal.length - 1] === '.') {
    strVal = strVal.substring(0, strVal.length - 1);
  }

  /* Remove the optional wildcard before checking validity */
  if (options.allow_wildcard === true && strVal.indexOf('*.') === 0) {
    strVal = strVal.substring(2);
  }

  const parts = strVal.split('.');
  const tld = parts[parts.length - 1];

  if (options.require_tld) {
    // disallow fqdns without tld
    if (parts.length < 2) {
      return false;
    }

    if (!options.allow_numeric_tld && !tldRegex.test(tld)) {
      return false;
    }

    // disallow spaces
    if (whitespaceRegex.test(tld)) {
      return false;
    }
  }

  // reject numeric TLDs
  if (!options.allow_numeric_tld && numericRegex.test(tld)) {
    return false;
  }

  return parts.every((part) => {
    if (part.length > 63 && !options.ignore_max_length) {
      return false;
    }

    if (!partCharsRegex.test(part)) {
      return false;
    }

    // disallow full-width chars
    if (fullWidthRegex.test(part)) {
      return false;
    }

    // disallow parts starting or ending with hyphen
    if (hyphenEdgeRegex.test(part)) {
      return false;
    }

    if (!options.allow_underscores && underscoreRegex.test(part)) {
      return false;
    }

    return true;
  });
}
