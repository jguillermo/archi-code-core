import tryToString from './util/tryToString';
import { toString } from '../convert';
import merge from './util/merge';

const defaultContainsOptions = {
  ignoreCase: false,
  minOccurrences: 1,
};

export default function contains(str, elem, options) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  options = merge(options, defaultContainsOptions);

  let elemStr: string;
  try {
    elemStr = toString(elem);
  } catch {
    return false;
  }

  if (options.ignoreCase) {
    return str.toLowerCase().split(elemStr.toLowerCase()).length > options.minOccurrences;
  }

  return str.split(elemStr).length > options.minOccurrences;
}
