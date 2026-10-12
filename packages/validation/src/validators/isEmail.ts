import { toString } from '../convert/string';
import { checkHost, hostList } from '../helpers/checkHost';
import { configText } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';
import { escapeRegExp } from '../helpers/escapeRegExp';

import { isByteLength } from './isByteLength';
import { isFQDN } from './isFQDN';
import { isIP } from './isIP';
import { merge } from '../helpers/merge';

export interface IsEmailOptions {
  allow_display_name?: boolean;
  allow_underscores?: boolean;
  require_display_name?: boolean;
  allow_utf8_local_part?: boolean;
  require_tld?: boolean;
  blacklisted_chars?: string;
  ignore_max_length?: boolean;
  host_blacklist?: (string | RegExp)[];
  host_whitelist?: (string | RegExp)[];
  allow_ip_domain?: boolean;
  domain_specific_validation?: boolean;
}

const default_email_options = {
  allow_display_name: false,
  allow_underscores: false,
  require_display_name: false,
  allow_utf8_local_part: true,
  require_tld: true,
  blacklisted_chars: '',
  ignore_max_length: false,
  host_blacklist: [],
  host_whitelist: [],
};

/* eslint-disable no-control-regex */
const splitNameAddress = /^([^\x00-\x1F\x7F-\x9F\cX]+)</i;
const emailUserPart = /^[a-z\d!#$%&'*+\-/=?^_`{|}~]+$/i;
const gmailUserPart = /^[a-z\d]+$/;
// RFC 5322 quoted local part minus CR, LF, DEL and C0 controls, which would allow header injection.
const quotedEmailUser = /^([\t \x21\x23-\x5b\x5d-\x7e]|(\\[\t\x20-\x7e]))*$/i;
const emailUserUtf8Part = /^[a-z\d!#$%&'*+\-/=?^_`{|}~\u00A1-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
const quotedEmailUserUtf8 =
  /^([\t \x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\t\x20-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;
const defaultMaxEmailLength = 254;
// Spoofing code points the UTF-8 ranges let in; a plain space is only valid in a quoted local part.
const invisibleLocalPart = /[\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/u;

/* eslint-enable no-control-regex */

// RFC 2822 display name: https://tools.ietf.org/html/rfc2822#appendix-A.1.2
function validateDisplayName(display_name: string): boolean {
  const display_name_without_quotes = display_name.replace(/^"(.+)"$/, '$1');
  if (!display_name_without_quotes.trim()) {
    return false;
  }

  const contains_illegal = /[.";<>]/.test(display_name_without_quotes);
  if (contains_illegal) {
    const is_quoted = display_name_without_quotes !== display_name;
    if (!is_quoted) {
      return false;
    }

    const all_start_with_back_slash =
      display_name_without_quotes.split('"').length ===
      display_name_without_quotes.split('\\"').length;
    if (!all_start_with_back_slash) {
      return false;
    }
  }

  return true;
}

export function isEmail(value: unknown, options?: IsEmailOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let strVal = s;
  options = merge(options, default_email_options);

  if (options.require_display_name || options.allow_display_name) {
    const display_email = strVal.match(splitNameAddress);
    if (display_email) {
      let display_name = display_email[1];

      // Not done in the regex: that would introduce a ReDoS (validator.js #1597).
      const address = strVal.replace(display_name, '');
      if (!address.endsWith('>')) {
        return false;
      }
      strVal = address.slice(1, -1);

      if (display_name.endsWith(' ')) {
        display_name = display_name.slice(0, -1);
      }

      if (!validateDisplayName(display_name)) {
        return false;
      }
    } else if (options.require_display_name) {
      return false;
    }
  }
  if (!options.ignore_max_length && strVal.length > defaultMaxEmailLength) {
    return false;
  }

  const parts = strVal.split('@');
  const domain = parts.pop() as string;
  const lower_domain = domain.toLowerCase();

  const host_blacklist = hostList(options.host_blacklist, 'host_blacklist');
  const host_whitelist = hostList(options.host_whitelist, 'host_whitelist');

  if (host_blacklist.length > 0 && checkHost(lower_domain, host_blacklist)) {
    return false;
  }

  if (host_whitelist.length > 0 && !checkHost(lower_domain, host_whitelist)) {
    return false;
  }

  let user = parts.join('@');

  if (
    options.domain_specific_validation &&
    (lower_domain === 'gmail.com' || lower_domain === 'googlemail.com')
  ) {
    user = user.toLowerCase();

    const username = user.split('+')[0];

    if (!isByteLength(username.replace(/\./g, ''), { min: 6, max: 30 })) {
      return false;
    }

    const user_parts = username.split('.');
    for (const part of user_parts) {
      if (!gmailUserPart.test(part)) {
        return false;
      }
    }
  }

  if (
    !options.ignore_max_length &&
    (!isByteLength(user, { max: 64 }) || !isByteLength(domain, { max: 254 }))
  ) {
    return false;
  }

  if (
    !isFQDN(domain, {
      require_tld: options.require_tld,
      ignore_max_length: options.ignore_max_length,
      allow_underscores: options.allow_underscores,
    })
  ) {
    if (!options.allow_ip_domain) {
      return false;
    }

    if (!isIP(domain)) {
      if (!domain.startsWith('[') || !domain.endsWith(']')) {
        return false;
      }

      const noBracketdomain = domain.slice(1, -1);

      if (noBracketdomain.length === 0 || !isIP(noBracketdomain)) {
        return false;
      }
    }
  }

  if (options.blacklisted_chars) {
    if (typeof options.blacklisted_chars !== 'string') {
      throw new ValidationConfigError(
        `blacklisted_chars must be a string, got ${configText(options.blacklisted_chars)}`,
      );
    }
    if (new RegExp(`[${escapeRegExp(options.blacklisted_chars)}]`).test(user)) return false;
  }

  if (invisibleLocalPart.test(user)) {
    return false;
  }

  if (user[0] === '"' && user[user.length - 1] === '"') {
    user = user.slice(1, user.length - 1);
    return options.allow_utf8_local_part
      ? quotedEmailUserUtf8.test(user)
      : quotedEmailUser.test(user);
  }

  const pattern = options.allow_utf8_local_part ? emailUserUtf8Part : emailUserPart;

  const user_parts = user.split('.');
  for (const part of user_parts) {
    if (!pattern.test(part)) {
      return false;
    }
  }

  return true;
}
