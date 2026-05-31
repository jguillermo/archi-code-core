import coerceToString from './util/coerceToString';

// see http://isrc.ifpi.org/en/isrc-standard/code-syntax
const isrc = /^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$/;

export default function isISRC(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return isrc.test(str);
}
