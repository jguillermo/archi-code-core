import { configText } from './config';
import { ValidationConfigError } from './errors';

// Case and one trailing dot are ignored so `EVIL.com` or `evil.com.` cannot slip past a blacklist.
function normalizeHost(host: string): string {
  const lower = host.toLowerCase();
  return lower.endsWith('.') ? lower.slice(0, -1) : lower;
}

export function checkHost(host: string, matches: (string | RegExp)[]): boolean {
  const normalized = normalizeHost(host);
  for (const match of matches) {
    if (typeof match === 'string') {
      if (normalized === normalizeHost(match)) return true;
      continue;
    }
    if (testFromStart(match, normalized)) {
      return true;
    }
  }
  return false;
}

function testFromStart(regex: RegExp, text: string): boolean {
  regex.lastIndex = 0;
  return regex.test(text);
}

// A plain string would be walked character by character, silently disabling a blacklist.
export function hostList(list: unknown, name: string): (string | RegExp)[] {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || !list.every((m) => typeof m === 'string' || m instanceof RegExp)) {
    throw new ValidationConfigError(
      `${name} must be an array of strings or RegExps, got ${configText(list)}`,
    );
  }
  return list;
}
