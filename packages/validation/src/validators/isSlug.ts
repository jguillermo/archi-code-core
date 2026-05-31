import coerceToString from './util/coerceToString';

const charsetRegex = /^[a-z0-9](?!.*[-_]{2,})(?:[a-z0-9_-]*[a-z0-9])?$/;

export default function isSlug(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return charsetRegex.test(str);
}
