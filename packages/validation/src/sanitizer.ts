import assertString from './validators/util/assertString';
export { default as normalizeEmail } from './normalizeEmail';

// ─── String transformers ──────────────────────────────────────────────────────

export function ltrim(str: string, chars?: string): string {
  assertString(str);
  const pattern = chars
    ? new RegExp(`^[${chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+`, 'g')
    : /^\s+/g;
  return str.replace(pattern, '');
}

export function rtrim(str: string, chars?: string): string {
  assertString(str);
  if (chars) {
    return str.replace(new RegExp(`[${chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`, 'g'), '');
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

export function blacklist(str: string, chars: string): string {
  assertString(str);
  return str.replace(new RegExp(`[${chars}]+`, 'g'), '');
}

export function whitelist(str: string, chars: string): string {
  assertString(str);
  return str.replace(new RegExp(`[^${chars}]+`, 'g'), '');
}

export function stripLow(str: string, keepNewLines?: boolean): string {
  assertString(str);
  const chars = keepNewLines
    ? '\\x00-\\x09\\x0B\\x0C\\x0E-\\x1F\\x7F'
    : '\\x00-\\x1F\\x7F';
  return blacklist(str, chars);
}
