import assertString from './util/assertString';

/**
 * Converts a string to boolean using loose semantics.
 * Returns the boolean value or throws if strict mode is used and value is not
 * a boolean-like string. Does NOT throw a ConvertError on invalid input.
 *
 * For strict boolean coercion that throws `ConvertError` on invalid input,
 * use `toBoolean` from `convert.ts` instead.
 */
export default function toBoolean(str, strict) {
  assertString(str);
  if (strict) {
    return str === '1' || /^true$/i.test(str);
  }
  return str !== '0' && !/^false$/i.test(str) && str !== '';
}
