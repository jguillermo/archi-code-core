import tryToString from './util/tryToString';

// https://semver.org/
const semanticVersioningRegex = new RegExp(
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
    '(?:-((?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*))*))'  +
    '?(?:\\+([0-9a-z-]+(?:\\.[0-9a-z-]+)*))?$',
  'i',
);

export default function isSemVer(str) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;

  return semanticVersioningRegex.test(str);
}
