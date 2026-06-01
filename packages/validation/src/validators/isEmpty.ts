import tryToString from './util/tryToString';
import merge from './util/merge';

const default_is_empty_options = {
  ignore_whitespace: false,
};

export default function isEmpty(str: unknown, options?: { ignore_whitespace?: boolean }): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  options = merge(options, default_is_empty_options);

  return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
}
