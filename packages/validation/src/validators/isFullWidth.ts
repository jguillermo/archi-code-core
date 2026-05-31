import coerceToString from './util/coerceToString';

export const fullWidth = /[^\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;

export default function isFullWidth(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return fullWidth.test(str);
}
