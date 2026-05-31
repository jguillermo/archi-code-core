import tryToString from './util/tryToString';

const octal = /^(0o)?[0-7]+$/i;

export default function isOctal(str) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return octal.test(str);
}
