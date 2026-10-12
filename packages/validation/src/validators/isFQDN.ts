import { toString } from '../convert/string';
import { merge } from '../helpers/merge';

export interface IsFQDNOptions {
  require_tld?: boolean;
  allow_underscores?: boolean;
  allow_trailing_dot?: boolean;
  allow_numeric_tld?: boolean;
  allow_wildcard?: boolean;
  ignore_max_length?: boolean;
}

const default_fqdn_options = {
  require_tld: true,
  allow_underscores: false,
  allow_trailing_dot: false,
  allow_numeric_tld: false,
  allow_wildcard: false,
  ignore_max_length: false,
};

const tldRegex = /^([a-z¡-¨ª-퟿豈-﷏ﷰ-￯]{2,}|xn[a-z0-9-]{2,})$/i;
const numericRegex = /^\d+$/;
const partCharsRegex = /^[a-z_¡-￿0-9-]+$/i;
const fullWidthRegex = /[！-～]/;
const hyphenEdgeRegex = /^-|-$/;
const underscoreRegex = /_/;
// Spoofing code points the label ranges above would let through: `exa\u200Bmple.com` must fail.
const invisibleRegex = /[\p{Cc}\p{Cf}\p{Cs}\p{Z}]/u;

export function isFQDN(value: unknown, options?: IsFQDNOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let strVal = s;
  options = merge(options, default_fqdn_options);

  if (options.allow_trailing_dot && strVal[strVal.length - 1] === '.') {
    strVal = strVal.substring(0, strVal.length - 1);
  }

  if (options.allow_wildcard === true && strVal.indexOf('*.') === 0) {
    strVal = strVal.substring(2);
  }

  if (invisibleRegex.test(strVal)) {
    return false;
  }

  const parts = strVal.split('.');
  const tld = parts[parts.length - 1];

  if (options.require_tld) {
    if (parts.length < 2) {
      return false;
    }

    if (!options.allow_numeric_tld && !tldRegex.test(tld)) {
      return false;
    }
  }

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

    if (fullWidthRegex.test(part)) {
      return false;
    }

    if (hyphenEdgeRegex.test(part)) {
      return false;
    }

    if (!options.allow_underscores && underscoreRegex.test(part)) {
      return false;
    }

    return true;
  });
}
