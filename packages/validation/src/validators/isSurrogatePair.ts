import { toString } from '../convert/string';

const surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

export function isSurrogatePair(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return surrogatePair.test(str);
}
