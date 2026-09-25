import { assertString } from '../validators/util/assertString';

// Native since ES2019 (same whitespace set as /\s/). Detected once: older engines use the scan.
const hasNativeTrimEnd = typeof String.prototype.trimEnd === 'function';

/**
 * Removes trailing `chars` (default: whitespace). Implemented as a backwards scan: the former
 * `/[chars]+$/g` regex retried the match from every position and was quadratic (ReDoS) on long
 * runs of `chars` not at the end, e.g. `'a'.repeat(100_000) + 'b'`.
 */
export function rtrim(str: string, chars?: string): string {
  assertString(str);
  if (!chars && hasNativeTrimEnd) {
    return str.trimEnd();
  }
  let i = str.length - 1;
  if (chars) {
    // Per UTF-16 code unit, like the non-unicode character class it replaces.
    while (i >= 0 && chars.includes(str.charAt(i))) i--;
  } else {
    while (/\s/.test(str.charAt(i))) i--;
  }
  return str.slice(0, i + 1);
}
