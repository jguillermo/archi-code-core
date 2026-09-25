import { toString } from './string';

/**
 * Human-readable text for ANY value (diagnostics, error messages, logs). Never fails.
 *
 * Strings, booleans and finite numbers are read with `toString` (convert/string), the single
 * string rule of the package; every other value gets a descriptive form (`'null'`, `'NaN'`,
 * `'Date(…)'`, `'Map({…})'`, `'Function(name)'`…).
 */
export function anyToString(value: any): string {
  const text = toString(value);
  if (text.ok) {
    return text.value;
  } else if (value === null) {
    return 'null';
  } else if (value === undefined) {
    return 'undefined';
  } else if (typeof value === 'number' && isNaN(value)) {
    return 'NaN';
  } else if (value instanceof Date) {
    return `Date(${value.toISOString()})`;
  } else if (value instanceof Map) {
    const entries = Array.from(value, ([key, val]) => `${anyToString(key)}: ${anyToString(val)}`);
    return `Map({${entries.join(', ')}})`;
  } else if (value instanceof Set) {
    const entries = Array.from(value, anyToString);
    return `Set(${entries.join(', ')})`;
  } else if (value instanceof RegExp) {
    return `RegExp(${value.toString()})`;
  } else if (value instanceof Error) {
    return `new ${value.name}(${value.message})`;
  } else if (value instanceof Promise) {
    return 'Promise';
  } else if (typeof value === 'object') {
    try {
      return JSON.stringify(value) || value.toString();
    } catch {
      return '[Circular or too complex to stringify]';
    }
  } else if (typeof value === 'function') {
    return `Function(${value.name || 'anonymous'})`;
  } else if (typeof value === 'symbol') {
    return value.toString();
  }

  return String(value);
}
