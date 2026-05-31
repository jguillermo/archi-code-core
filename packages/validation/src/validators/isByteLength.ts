import tryToString from './util/tryToString';

export default function isByteLength(str, options) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  let min;
  let max;
  if (typeof options === 'object') {
    min = options.min || 0;
    max = options.max;
  } else {
    // backwards compatibility: isByteLength(str, min [, max])
    min = arguments[1];
    max = arguments[2];
  }
  const len = encodeURI(str).split(/%..|./).length - 1;
  return len >= min && (typeof max === 'undefined' || len <= max);
}
