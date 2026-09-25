/**
 * Leaf module: base coercion shared by the three tools (validator, canBe, convertTo).
 *
 * It MUST NOT import anything. Keeping it dependency-free is what lets the validator,
 * `canBe` and `convert` (convertTo) all depend on it without ever forming an
 * import cycle — enforced by `test/architecture/imports.spec.ts`.
 */

/**
 * Returns the string form of `v` when it can safely be read as text, otherwise `undefined`.
 * Accepted: strings (as-is), booleans (`'true'`/`'false'`) and finite numbers.
 */
export function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : undefined;
  return undefined;
}
