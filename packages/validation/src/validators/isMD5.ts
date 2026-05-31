import tryToString from './util/tryToString';

const md5 = /^[a-f0-9]{32}$/;

export default function isMD5(str) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return md5.test(str);
}
