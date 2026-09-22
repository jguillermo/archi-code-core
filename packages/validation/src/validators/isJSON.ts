import type { IsJSONOptions } from '../types';
import tryToString from './util/tryToString';
import merge from './util/merge';

const default_json_options = {
  allow_primitives: false,
  allow_any_value: false,
};

/**
 * Returns true if `str` is syntactically valid JSON.
 * Arrays (`[1,2,3]`) and primitive JSON (`"hello"`, `42`) are accepted by default.
 *
 * For domain object validation (plain records only, no arrays),
 * use `canBeJson()` from the primitives module instead.
 */
export default function isJSON(str: unknown, options?: IsJSONOptions): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  try {
    options = merge(options, default_json_options);
    const obj = JSON.parse(s);

    // When allow_any_value is true, accept anything that JSON.parse successfully parses
    if (options.allow_any_value) {
      return true;
    }

    let primitives: (null | boolean)[] = [];
    if (options.allow_primitives) {
      primitives = [null, false, true];
    }

    return primitives.includes(obj) || (!!obj && typeof obj === 'object');
  } catch {
    /* ignore */
  }
  return false;
}
