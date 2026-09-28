import { keyOf, ownValidations } from './validations';
import type { Validation, ValidatedClass } from './validations';

/**
 * Returns the validations of a class, inherited ones included, in validation order: the root
 * parent's first, then each subclass down to `target`. A subclass that declares a validation of its
 * parent (same built-in validator, or same custom name) replaces the parent's declaration, which
 * keeps its place in the order. A built-in and a custom with the same name are independent.
 */
export function getValidations(target: ValidatedClass): Validation[] {
  const chain: ValidatedClass[] = [];
  for (
    let current = target;
    current !== Function.prototype && current !== null;
    current = Object.getPrototypeOf(current)
  ) {
    chain.unshift(current);
  }
  const byKey = new Map<string, Validation>();
  for (const cls of chain) {
    for (const validation of ownValidations.get(cls) ?? []) {
      byKey.set(keyOf(validation), validation);
    }
  }
  return [...byKey.values()];
}
