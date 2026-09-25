import assertString from './validators/util/assertString';
import escapeRegExp from './validators/util/escapeRegExp';
export { default as normalizeEmail } from './normalizeEmail';

// ─── String transformers ──────────────────────────────────────────────────────

export function ltrim(str: string, chars?: string): string {
  assertString(str);
  const pattern = chars ? new RegExp(`^[${escapeRegExp(chars)}]+`, 'g') : /^\s+/g;
  return str.replace(pattern, '');
}

export function rtrim(str: string, chars?: string): string {
  assertString(str);
  if (chars) {
    return str.replace(new RegExp(`[${escapeRegExp(chars)}]+$`, 'g'), '');
  }
  let i = str.length - 1;
  while (/\s/.test(str.charAt(i))) i--;
  return str.slice(0, i + 1);
}

export function trim(str: string, chars?: string): string {
  return rtrim(ltrim(str, chars), chars);
}

export function escape(str: string): string {
  assertString(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;');
}

export function unescape(str: string): string {
  assertString(str);
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x5C;/g, '\\')
    .replace(/&#96;/g, '`')
    .replace(/&amp;/g, '&');
}

/** Removes every character contained in `chars` (taken literally — no regex syntax). */
export function blacklist(str: string, chars: string): string {
  assertString(str);
  if (!chars) return str;
  return str.replace(new RegExp(`[${escapeRegExp(chars)}]+`, 'g'), '');
}

/** Keeps only the characters contained in `chars` (taken literally — no regex syntax). */
export function whitelist(str: string, chars: string): string {
  assertString(str);
  if (!chars) return '';
  return str.replace(new RegExp(`[^${escapeRegExp(chars)}]+`, 'g'), '');
}

/* eslint-disable no-control-regex */
const lowChars = /[\x00-\x1F\x7F]+/g;
const lowCharsKeepNewLines = /[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/g;
/* eslint-enable no-control-regex */

export function stripLow(str: string, keepNewLines?: boolean): string {
  assertString(str);
  return str.replace(keepNewLines ? lowCharsKeepNewLines : lowChars, '');
}
