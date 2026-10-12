import { toString } from '../convert/string';
import { checkHost, hostList } from '../helpers/checkHost';
import { configText } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';
import { isFQDN } from './isFQDN';
import { isIP } from './isIP';
import { merge } from '../helpers/merge';

export interface IsURLOptions {
  protocols?: string[];
  require_tld?: boolean;
  require_protocol?: boolean;
  require_host?: boolean;
  require_port?: boolean;
  require_valid_protocol?: boolean;
  allow_underscores?: boolean;
  allow_trailing_dot?: boolean;
  allow_protocol_relative_urls?: boolean;
  allow_fragments?: boolean;
  allow_query_components?: boolean;
  disallow_auth?: boolean;
  validate_length?: boolean;
  max_allowed_length?: number;
  host_whitelist?: (string | RegExp)[];
  host_blacklist?: (string | RegExp)[];
  allow_wildcard?: boolean;
  allow_numeric_tld?: boolean;
  ignore_max_length?: boolean;
}

const default_url_options = {
  protocols: ['http', 'https', 'ftp'],
  require_tld: true,
  require_protocol: false,
  require_host: true,
  require_port: false,
  require_valid_protocol: true,
  allow_underscores: false,
  allow_trailing_dot: false,
  allow_protocol_relative_urls: false,
  allow_fragments: true,
  allow_query_components: true,
  validate_length: true,
  max_allowed_length: 2084,
};

const wrapped_ipv6 = /^\[([^\]]+)\](?::([0-9]+))?$/;
// eslint-disable-next-line no-control-regex
const forbiddenUrlCharactersRegex = /[\s<>\x00-\x1f\x7f]/;
// RFC 3986 userinfo characters plus Unicode letters, marks and digits.
const userinfoPartRegex = /^(?:[\p{L}\p{M}\p{N}\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*$/u;
const codeExecutingSchemes = ['javascript', 'vbscript', 'data'];
const protocolRegex = /^([a-z][a-z0-9+\-.]*):/i;
const validAuthRegex = /^[a-zA-Z0-9\-_.%:]*$/;
const encodedContentRegex = /%[0-9a-fA-F]{2}/;
const leadingDigitRegex = /^[0-9]/;
const digitsOnlyRegex = /^[0-9]+$/;

export function isURL(value: unknown, options?: IsURLOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let url: string = s;
  if (!url || forbiddenUrlCharactersRegex.test(url)) {
    return false;
  }
  if (url.indexOf('mailto:') === 0) {
    return false;
  }
  options = merge(options, default_url_options);
  if (!Array.isArray(options.protocols) || !options.protocols.every((p) => typeof p === 'string')) {
    // A string would be matched by substring ('http'.indexOf('ht') ≥ 0).
    throw new ValidationConfigError(
      `protocols must be an array of strings, got ${configText(options.protocols)}`,
    );
  }
  if (options.validate_length && typeof options.max_allowed_length !== 'number') {
    throw new ValidationConfigError(
      `max_allowed_length must be a number, got ${configText(options.max_allowed_length)}`,
    );
  }
  const host_whitelist =
    options.host_whitelist === undefined
      ? undefined
      : hostList(options.host_whitelist, 'host_whitelist');
  const host_blacklist =
    options.host_blacklist === undefined
      ? undefined
      : hostList(options.host_blacklist, 'host_blacklist');

  if (options.validate_length && url.length > (options.max_allowed_length as number)) {
    return false;
  }

  if (!options.allow_fragments && url.includes('#')) {
    return false;
  }

  if (!options.allow_query_components && (url.includes('?') || url.includes('&'))) {
    return false;
  }

  let protocol, auth, host, port, port_str, split, ipv6;

  split = url.split('#');
  url = split.shift() as string;

  split = url.split('?');
  url = split.shift() as string;

  const protocol_match = url.match(protocolRegex);
  let had_explicit_protocol = false;

  const cleanUpProtocol = (potential_protocol: string): string | false => {
    had_explicit_protocol = true;
    protocol = potential_protocol.toLowerCase();

    if (
      options.require_valid_protocol &&
      (options.protocols as string[]).indexOf(protocol) === -1
    ) {
      return false;
    }

    return url.substring((protocol_match as RegExpMatchArray)[0].length);
  };

  if (protocol_match) {
    const potential_protocol = protocol_match[1];
    const after_colon = url.substring(protocol_match[0].length);

    // Without `//`, `user:password@host` and `host:port` also look like `scheme:`.
    const starts_with_slashes = after_colon.slice(0, 2) === '//';

    if (!starts_with_slashes) {
      const first_slash_position = after_colon.indexOf('/');
      const before_slash =
        first_slash_position === -1 ? after_colon : after_colon.substring(0, first_slash_position);
      const at_position = before_slash.indexOf('@');

      if (at_position !== -1) {
        const before_at = before_slash.substring(0, at_position);
        const is_valid_auth = validAuthRegex.test(before_at);

        const has_encoded_content = encodedContentRegex.test(before_at);

        const is_code_executing_scheme = codeExecutingSchemes.includes(
          potential_protocol.toLowerCase(),
        );

        if (is_valid_auth && !has_encoded_content && !is_code_executing_scheme) {
          if (options.require_protocol) {
            return false;
          }
        } else {
          const cleaned1 = cleanUpProtocol(potential_protocol);
          if (cleaned1 === false) {
            return false;
          }
          url = cleaned1;
        }
      } else {
        const looks_like_port = leadingDigitRegex.test(after_colon);

        if (looks_like_port) {
          if (options.require_protocol) {
            return false;
          }
        } else {
          const cleaned2 = cleanUpProtocol(potential_protocol);
          if (cleaned2 === false) {
            return false;
          }
          url = cleaned2;
        }
      }
    } else {
      const cleaned3 = cleanUpProtocol(potential_protocol);
      if (cleaned3 === false) {
        return false;
      }
      url = cleaned3;
    }
  } else if (options.require_protocol) {
    return false;
  }

  if (url.slice(0, 2) === '//') {
    if (!had_explicit_protocol && !options.allow_protocol_relative_urls) {
      return false;
    }

    url = url.slice(2);
  }

  if (url === '') {
    return false;
  }

  split = url.split('/');
  url = split.shift() as string;

  // WHATWG parsers read `\` as `/`: the host of `http://evil.com\@good.com` is evil.com.
  if (url.includes('\\')) {
    return false;
  }

  if (url === '' && !options.require_host) {
    return true;
  }

  split = url.split('@');
  if (split.length > 1) {
    if (options.disallow_auth) {
      return false;
    }
    if (split[0] === '') {
      return false;
    }
    auth = split.shift();
    if (auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
      return false;
    }
    const [user, password] = auth.split(':');
    if (user === '' && password === '') {
      return false;
    }
    if (
      !userinfoPartRegex.test(user) ||
      (password !== undefined && !userinfoPartRegex.test(password))
    ) {
      return false;
    }
  }
  const hostname = split.join('@');

  port_str = null;
  ipv6 = null;
  const ipv6_match = hostname.match(wrapped_ipv6);
  if (ipv6_match) {
    host = '';
    ipv6 = ipv6_match[1];
    port_str = ipv6_match[2] || null;
  } else {
    split = hostname.split(':');
    host = split.shift();
    if (split.length) {
      port_str = split.join(':');
    }
  }

  if (port_str !== null && port_str.length > 0) {
    port = parseInt(port_str, 10);
    if (!digitsOnlyRegex.test(port_str) || port <= 0 || port > 65535) {
      return false;
    }
  } else if (options.require_port) {
    return false;
  }

  // The whitelist narrows the accepted hosts; it does not skip the host validation below.
  if (host_whitelist && !checkHost(host || ipv6 || '', host_whitelist)) {
    return false;
  }

  if (host === '' && !options.require_host) {
    return true;
  }

  if (!isIP(host) && !isFQDN(host, options) && (!ipv6 || !isIP(ipv6, { version: 6 }))) {
    return false;
  }

  host = host || ipv6;

  if (host_blacklist && checkHost(host, host_blacklist)) {
    return false;
  }

  return true;
}
