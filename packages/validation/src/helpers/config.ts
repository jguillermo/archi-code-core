import { anyToString } from '../convert/any-to-string';
import { ValidationConfigError } from './errors';

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

export function configText(value: unknown): string {
  return anyToString(value);
}

export function boundsOf<T extends { min?: number; max?: number }>(
  options: T | null | undefined,
): { options: Partial<T>; min: number; max: number | undefined } {
  const opts = optionsOf(options);
  return {
    options: opts,
    min: bound(opts.min, 'min') || 0,
    max: bound(opts.max, 'max'),
  };
}

function bound(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'symbol' || typeof value === 'function' || typeof value === 'object') {
    throw new ValidationConfigError(`${name} must be a number, got ${configText(value)}`);
  }
  return value as number;
}
