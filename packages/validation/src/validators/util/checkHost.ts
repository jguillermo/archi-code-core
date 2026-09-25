import { configText } from './config';
import { ValidationConfigError } from './errors';

/**
 * Host names are case-insensitive and `example.com.` is the same host as `example.com`, so both
 * sides are compared lower-cased and without one trailing dot. Otherwise `EVIL.com` or `evil.com.`
 * would slip past a blacklist. RegExp entries are tested against the normalized host.
 */
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
    // Global/sticky regexes keep state in lastIndex between calls; reset so results are stable.
    match.lastIndex = 0;
    if (match.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Reads a `host_whitelist` / `host_blacklist` option. A plain string would be walked character by
 * character (silently disabling a blacklist), so anything that is not an array of strings/RegExps
 * is a configuration error. `undefined` / `null` → no list.
 */
export function hostList(list: unknown, name: string): (string | RegExp)[] {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || !list.every((m) => typeof m === 'string' || m instanceof RegExp)) {
    throw new ValidationConfigError(
      `${name} must be an array of strings or RegExps, got ${configText(list)}`,
    );
  }
  return list;
}
