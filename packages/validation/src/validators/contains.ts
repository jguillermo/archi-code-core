import { toString } from '../convert/string';
import { merge } from '../helpers/merge';

export interface ContainsOptions {
  ignoreCase?: boolean;
  /** Minimum number of occurrences. Default: 1. */
  minOccurrences?: number;
}

const defaultContainsOptions = {
  ignoreCase: false,
  minOccurrences: 1,
};

export function contains(input: unknown, elem: unknown, options?: ContainsOptions): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  const opts = merge(options, defaultContainsOptions) as typeof defaultContainsOptions;

  const elemResult = toString(elem);
  if (!elemResult.ok) return false;
  const elemStr = elemResult.value;

  if (opts.ignoreCase) {
    return str.toLowerCase().split(elemStr.toLowerCase()).length > opts.minOccurrences;
  }

  return str.split(elemStr).length > opts.minOccurrences;
}
