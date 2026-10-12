import { assertString } from '../helpers/assertString';

const hasNativeTrimEnd = typeof String.prototype.trimEnd === 'function';

// A backwards scan: the former `/[chars]+$/g` regex was quadratic (ReDoS) on long runs of `chars`
// not at the end, e.g. `'a'.repeat(100_000) + 'b'`.
export function rtrim(str: string, chars?: string): string {
  assertString(str);
  if (!chars && hasNativeTrimEnd) {
    return str.trimEnd();
  }
  let i = str.length - 1;
  if (chars) {
    while (i >= 0 && chars.includes(str.charAt(i))) i--;
  } else {
    while (/\s/.test(str.charAt(i))) i--;
  }
  return str.slice(0, i + 1);
}
