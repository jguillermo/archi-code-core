import { validator } from '../validators';
import type { ValidatorRegistry } from '../validators';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';

export type ValidatorName = {
  [K in keyof ValidatorRegistry]: ValidatorRegistry[K] extends (...args: any[]) => boolean
    ? K
    : never;
}[keyof ValidatorRegistry];

type Params<K extends ValidatorName> = ValidatorRegistry[K] extends (
  value: any,
  ...rest: infer R
) => boolean
  ? R
  : never;

export type ValidationProperties<K extends ValidatorName> =
  Params<K> extends [] ? never : NonNullable<Params<K>[0]>;

type PropertiesField<P> = [P] extends [never]
  ? { properties?: undefined }
  : Record<never, never> extends P
    ? { properties?: P }
    : { properties: P };

export type BuiltInValidation = {
  [K in ValidatorName]: {
    validator: K;
    message?: string;
    custom?: undefined;
    fn?: undefined;
  } & PropertiesField<ValidationProperties<K>>;
}[ValidatorName];

export interface CustomValidation {
  custom: string;
  fn: (value: unknown) => boolean;
  message?: string;
  validator?: undefined;
}

export type Validation = BuiltInValidation | CustomValidation;

export type ValidatedClass = abstract new (...args: any[]) => unknown;

// Symbol.for so the CJS and ESM builds, and installed copies, share one registry. Bump `v1` when
// the stored shape changes.
const REGISTRY = Symbol.for('@archi-code/validation/decorator.v1');

export const ownValidations: WeakMap<ValidatedClass, Validation[]> = ((
  globalThis as { [REGISTRY]?: WeakMap<ValidatedClass, Validation[]> }
)[REGISTRY] ??= new WeakMap());

export function isCustom(validation: Validation): validation is CustomValidation {
  return validation.custom !== undefined;
}

export function isValidatorName(name: unknown): name is ValidatorName {
  return hasOwn(validator, name) && typeof validator[name] === 'function';
}

function assertShape(validation: unknown): asserts validation is Validation {
  if (validation === null || typeof validation !== 'object')
    throw new ValidationConfigError('A validation must be an object');
  const { validator: name, custom, fn } = validation as Record<string, unknown>;
  if (name !== undefined && custom !== undefined)
    throw new ValidationConfigError('A validation cannot have both "validator" and "custom"');
  if (custom !== undefined) {
    if (typeof custom !== 'string' || custom === '')
      throw new ValidationConfigError('"custom" must be a non-empty string');
    if (typeof fn !== 'function')
      throw new ValidationConfigError(`Custom "${custom}" needs a "fn" function`);
    return;
  }
  if (name === undefined)
    throw new ValidationConfigError('A validation needs "validator" or "custom"');
  if (!isValidatorName(name))
    throw new ValidationConfigError(`Unknown validator "${String(name)}"`);
}

export function keyOf(validation: Validation): string {
  return isCustom(validation) ? `custom:${validation.custom}` : `validator:${validation.validator}`;
}

// Only plain objects and arrays are copied and frozen: freezing a RegExp would break `lastIndex`.
function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(snapshot)) as T;
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = snapshot(item);
    return Object.freeze(copy) as T;
  }
  return value;
}

export function Validations(validations: Validation[]) {
  return (target: ValidatedClass): void => {
    if (typeof target !== 'function')
      throw new ValidationConfigError('@Validations can only decorate a class');
    if (!Array.isArray(validations))
      throw new ValidationConfigError('@Validations expects an array of validations');
    const declared = new Set<string>();
    for (const validation of validations) {
      assertShape(validation);
      const key = keyOf(validation);
      if (declared.has(key))
        throw new ValidationConfigError(
          isCustom(validation)
            ? `Custom "${validation.custom}" is declared more than once`
            : `Validator "${validation.validator}" is declared more than once`,
        );
      declared.add(key);
    }
    const own = new Map((ownValidations.get(target) ?? []).map((v) => [keyOf(v), v]));
    for (const validation of validations) own.set(keyOf(validation), snapshot(validation));
    ownValidations.set(target, [...own.values()]);
  };
}
