import { trim } from '../sanitizer/trim';
import { isEmail } from './isEmail';
import type { IsEmailOptions } from './isEmail';

export interface IsMailtoURIOptions extends IsEmailOptions {}
import { toString } from '../convert/string';

function parseMailtoQueryString(queryString: string): { cc: string; bcc: string } | false {
  const unusedAllowedParams = new Set(['subject', 'body', 'cc', 'bcc']),
    query = { cc: '', bcc: '' };
  let isParseFailed = false;

  const queryParams = queryString.split('&');

  if (queryParams.length > 4) {
    return false;
  }

  for (const q of queryParams) {
    const [key, value] = q.split('=');

    if (key && !unusedAllowedParams.has(key)) {
      isParseFailed = true;
      break;
    }

    if (value && (key === 'cc' || key === 'bcc')) {
      query[key] = value;
    }

    if (key) {
      unusedAllowedParams.delete(key);
    }
  }

  return isParseFailed ? false : query;
}

export function isMailtoURI(value: unknown, options?: IsMailtoURIOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const url: string = s;

  if (url.indexOf('mailto:') !== 0) {
    return false;
  }

  const [to, queryString = ''] = url.replace('mailto:', '').split('?');

  if (!to && !queryString) {
    return true;
  }

  const query = parseMailtoQueryString(queryString);

  if (!query) {
    return false;
  }

  return `${to},${query.cc},${query.bcc}`.split(',').every((email) => {
    email = trim(email, ' ');

    if (email) {
      return isEmail(email, options);
    }

    return true;
  });
}
