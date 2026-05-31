import 'reflect-metadata';
import { validateSync } from 'class-validator';

/**
 * Applies a class-validator decorator factory (e.g. `() => IsEmail()`) to the
 * `value` property of a fresh dummy class, so we can benchmark the real
 * decorator + metadata + validateSync path without hand-writing one class per
 * validator.
 */
export function makeDecoratedClass(
  decoratorFactory: () => PropertyDecorator,
): new () => { value: unknown } {
  class Dynamic {
    value: unknown;
  }
  decoratorFactory()(Dynamic.prototype, 'value');
  return Dynamic;
}

/** Instantiates the class with `input` and returns whether it passes validation. */
export function validateDecorator(
  Klass: new () => { value: unknown },
  input: unknown,
): boolean {
  const instance = new Klass();
  instance.value = input;
  return validateSync(instance).length === 0;
}
