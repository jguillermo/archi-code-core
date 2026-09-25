import { toString } from '../convert/string';
import merge from './util/merge';

const default_is_empty_options = {
  ignore_whitespace: false,
};

export default function isEmpty(
  input: unknown,
  options?: { ignore_whitespace?: boolean },
): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  options = merge(options, default_is_empty_options);

  return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
}
