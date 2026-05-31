import coerceToString from './util/coerceToString';

const defaultOptions = { loose: false };
const strictBooleans = ['true', 'false', '1', '0'];
const looseBooleans = [...strictBooleans, 'yes', 'no'];

export default function isBoolean(str: unknown, options = defaultOptions) {
  // Fast path: native boolean — always valid
  if (typeof str === 'boolean') return true;
  // Fast path: number acting as boolean (1/0 only)
  if (typeof str === 'number') return str === 1 || str === 0;
  // Non-string: coerce if possible, otherwise reject
  const s = coerceToString(str);
  if (s === false) return false;
  if (options.loose) {
    return looseBooleans.includes(s.toLowerCase());
  }
  return strictBooleans.includes(s);
}
