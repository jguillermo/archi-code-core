export function checkHost(host: string, matches: (string | RegExp)[]): boolean {
  for (const match of matches) {
    if (typeof match === 'string') {
      if (host === match) return true;
      continue;
    }
    // Global/sticky regexes keep state in lastIndex between calls; reset so results are stable.
    match.lastIndex = 0;
    if (match.test(host)) {
      return true;
    }
  }
  return false;
}
