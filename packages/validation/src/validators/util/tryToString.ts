import { asString } from '../../core/coerce';

/**
 * Validator-side string coercion: strings as-is, booleans and finite numbers as their text,
 * anything else → `false`. Delegates to the dependency-free `core/coerce` leaf so validators
 * never import `convert`/`canBe` (keeps the import graph acyclic by structure).
 */
export default function tryToString(input: unknown): string | false {
  const s = asString(input);
  return s === undefined ? false : s;
}
