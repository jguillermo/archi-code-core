import { toString } from '../convert/string';
import { merge } from '../helpers/merge';
import { optionsOf } from '../helpers/config';

export interface ContainsOptions {
  /** Text to look for. */
  elem: unknown;
  ignoreCase?: boolean;
  /** Minimum number of occurrences. Default: 1. */
  minOccurrences?: number;
}

const defaultContainsOptions = {
  ignoreCase: false,
  minOccurrences: 1,
};

export function contains(value: unknown, options: ContainsOptions): boolean {
  const { elem } = optionsOf(options);
  const stringResult = toString(value);
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
