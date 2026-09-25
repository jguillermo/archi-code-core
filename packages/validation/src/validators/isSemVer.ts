import { toString } from '../convert/string';

// https://semver.org/
const semanticVersioningRegex = new RegExp(
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
    '(?:-((?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*))*))' +
    '?(?:\\+([0-9a-z-]+(?:\\.[0-9a-z-]+)*))?$',
  'i',
);

export default function isSemVer(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;

  return semanticVersioningRegex.test(str);
}
