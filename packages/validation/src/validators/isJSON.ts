import tryToString from './util/tryToString';
import merge from './util/merge';

const default_json_options = {
  allow_primitives: false,
  allow_any_value: false,
};

export default function isJSON(str, options) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  try {
    options = merge(options, default_json_options);
    const obj = JSON.parse(str);

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
