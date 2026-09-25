import tryToString from './util/tryToString';

// https://semver.org/
const semanticVersioningRegex = new RegExp(
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
    '(?:-((?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*))*))' +
    '?(?:\\+([0-9a-z-]+(?:\\.[0-9a-z-]+)*))?$',
  'i',
);

export default function isSemVer(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;

  return semanticVersioningRegex.test(str);
}
