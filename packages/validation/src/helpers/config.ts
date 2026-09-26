import { anyToString } from '../convert/any-to-string';
import { ValidationConfigError } from './errors';

/**
 * Reads an optional options argument. `undefined` and `null` both mean "no options" (the same as
 * `merge`); any other non-object (a string, a number, a Symbol…) is a configuration error.
 */
export function optionsOf<T extends object>(
  options: T | null | undefined,
  name = 'options',
): Partial<T> {
  if (options === undefined || options === null) return {};
  if (typeof options !== 'object') {
    throw new ValidationConfigError(`${name} must be an object, got ${configText(options)}`);
  }
  return options;
}

/** Text of a configuration value for an error message. Never throws (Symbols, hostile objects…). */
export function configText(value: unknown): string {
  return anyToString(value);
}

/**
 * Reads the `(optionsOrMin, max)` arguments of isLength / isByteLength: an options object, or the
 * legacy positional `min [, max]`. `null` means "no options". A bound that cannot be compared with
 * a number (Symbol, function, object) is a configuration error; falsy `min` means 0 (historic).
 */
export function boundsOf<T extends { min?: number; max?: number }>(
  optionsOrMin: T | number | null | undefined,
  maxArg: number | null | undefined,
): { options: Partial<T>; min: number; max: number | undefined } {
  const legacy = optionsOrMin === null || typeof optionsOrMin !== 'object';
  const options: Partial<T> = legacy ? {} : optionsOrMin;
  return {
    options,
    min: bound(legacy ? optionsOrMin : options.min, 'min') || 0,
    max: bound(legacy ? maxArg : options.max, 'max'),
  };
}

function bound(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'symbol' || typeof value === 'function' || typeof value === 'object') {
    throw new ValidationConfigError(`${name} must be a number, got ${configText(value)}`);
  }
  return value as number;
}
