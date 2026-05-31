import coerceToString from './util/coerceToString';
import toString from './util/toString';
import merge from './util/merge';

const defaultContainsOptions = {
  ignoreCase: false,
  minOccurrences: 1,
};

export default function contains(str, elem, options) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  options = merge(options, defaultContainsOptions);

  if (options.ignoreCase) {
    return str.toLowerCase().split(toString(elem).toLowerCase()).length > options.minOccurrences;
  }

  return str.split(toString(elem)).length > options.minOccurrences;
}
