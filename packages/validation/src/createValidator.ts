import validator from './validators';
import type { ValidatorRegistry } from './types';

/**
 * Creates a new object that combines the built-in validator registry with
 * caller-supplied extensions, typed as `ValidatorRegistry & T`.
 *
 * The built-in `validator` singleton is NOT mutated.
 *
 * @example
 * const myValidator = createValidator({
 *   isSpanishPhone: (v: unknown) => validator.isMobilePhone(v as string, 'es-ES'),
 *   isPositiveInt: (v: unknown) => validator.isInt(v as string, { min: 1 }),
 * });
 * // myValidator.isEmail and myValidator.isSpanishPhone are both typed
 */
export function createValidator<T extends Record<string, unknown>>(
  extensions: T,
): ValidatorRegistry & T {
  return Object.assign(Object.create(null), validator, extensions) as ValidatorRegistry & T;
}
