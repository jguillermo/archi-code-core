import { ownValidations } from './validations';
import type { Validation, ValidatedClass } from './validations';

/**
 * Returns the validations of a class, inherited ones included, in validation order: the root
 * parent's first, then each subclass down to `target`. A subclass that declares a validator of its
 * parent replaces the parent's declaration, which keeps its place in the order.
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
  const byName = new Map<string, Validation>();
  for (const cls of chain) {
    for (const validation of ownValidations.get(cls) ?? []) {
      byName.set(validation.validator, validation);
    }
  }
  return [...byName.values()];
}
