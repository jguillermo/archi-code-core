import tryToString from './util/tryToString';
import { asString } from '../core/coerce';
import merge from './util/merge';

const defaultContainsOptions = {
  ignoreCase: false,
  minOccurrences: 1,
};

export default function contains(
  input: unknown,
  elem: unknown,
  options?: { ignoreCase?: boolean; minOccurrences?: number },
): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  const opts = merge(options, defaultContainsOptions) as typeof defaultContainsOptions;

  const elemStr = asString(elem);
  if (elemStr === undefined) return false;

  if (opts.ignoreCase) {
    return str.toLowerCase().split(elemStr.toLowerCase()).length > opts.minOccurrences;
  }

  return str.split(elemStr).length > opts.minOccurrences;
}
