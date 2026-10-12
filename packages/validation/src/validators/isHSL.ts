import { toString } from '../convert/string';

const hslComma =
  /^hsla?\(((\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?|\.[0-9]+(e(\+|-)?[0-9]+)?))(deg|grad|rad|turn)?(,(\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?|\.[0-9]+(e(\+|-)?[0-9]+)?)%){2}(,((\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?|\.[0-9]+(e(\+|-)?[0-9]+)?)%?))?\)$/i;
const hslSpace =
  /^hsla?\(((\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?|\.[0-9]+(e(\+|-)?[0-9]+)?))(deg|grad|rad|turn)?(\s(\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?|\.[0-9]+(e(\+|-)?[0-9]+)?)%){2}\s?(\/\s((\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?|\.[0-9]+(e(\+|-)?[0-9]+)?)%?)\s?)?\)$/i;

export function isHSL(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;

  // Whitespace is normalised here rather than in the regexes (validator.js #1598).
  const strippedStr = str.replace(/\s+/g, ' ').replace(/\s?(hsla?\(|\)|,)\s?/gi, '$1');

  if (strippedStr.indexOf(',') !== -1) {
    return hslComma.test(strippedStr);
  }

  return hslSpace.test(strippedStr);
}
