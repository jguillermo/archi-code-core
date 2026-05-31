import coerceToString from './util/coerceToString';
import merge from './util/merge';

const default_is_empty_options = {
  ignore_whitespace: false,
};

export default function isEmpty(str, options) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  options = merge(options, default_is_empty_options);

  return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
}
