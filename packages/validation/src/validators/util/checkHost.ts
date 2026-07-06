export default function checkHost(host: string, matches: (string | RegExp)[]): boolean {
  for (const match of matches) {
    if (typeof match === 'string' ? host === match : match.test(host)) {
      return true;
    }
  }
  return false;
}
