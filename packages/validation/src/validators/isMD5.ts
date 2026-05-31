import coerceToString from './util/coerceToString';

const md5 = /^[a-f0-9]{32}$/;

export default function isMD5(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return md5.test(str);
}
