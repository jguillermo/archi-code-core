import tryToString from './util/tryToString';

export const fullWidth = /[^\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;

export default function isFullWidth(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return fullWidth.test(str);
}
