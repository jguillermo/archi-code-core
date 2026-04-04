/**
 * typeOf — returns a more specific type string than `typeof`.
 * Matches the behaviour expected by the original validator.js util tests.
 */
export function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * assertString — throws TypeError when the argument is not a string.
 * Replicates the assertString guard used throughout validator.js.
 */
export function assertString(input?: unknown): asserts input is string {
  const isString = typeof input === 'string' || input instanceof String;
  if (!isString) {
    let invalidType: string = typeof input;
    if (input === null) invalidType = 'null';
    else if (typeof input === 'object' && input !== null) {
      invalidType = (input as object).constructor?.name ?? 'Object';
    }
    throw new TypeError(`Expected a string but received a ${invalidType}`);
  }
}
