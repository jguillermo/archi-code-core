import { toString } from '../convert/string';
import { merge } from './util/merge';

export interface IsEmptyOptions {
  ignore_whitespace?: boolean;
}

const default_is_empty_options = {
  ignore_whitespace: false,
};

export function isEmpty(input: unknown, options?: IsEmptyOptions): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  options = merge(options, default_is_empty_options);

  return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
}
