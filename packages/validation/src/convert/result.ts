/**
 * Shared result shape and fixed failure messages of the converters (internal to `convert/`,
 * `Converted`, `ConvertMessages` and `ConvertMessage` are re-exported publicly by the index).
 */
/** Fixed messages returned in `error` when a conversion fails. */
export const ConvertMessages = Object.freeze({
  STRING: 'Value cannot be converted to string',
  BOOLEAN: 'Value cannot be converted to boolean',
  INTEGER: 'Value is not an integer',
  INTEGER_OVERFLOW:
    'Integer exceeds the safe integer limits (-9007199254740991 to 9007199254740991)',
  FLOAT: 'Value is not a finite decimal number',
  DATE: 'Value is not a valid date',
  JSON: 'Value is not a non-empty JSON object',
  JSON_VALUE: 'Value is not an accepted JSON value',
  ARRAY: 'Value is not an array',
  ENUM: 'Value is not one of the enum options',
} as const);

export type ConvertMessage = (typeof ConvertMessages)[keyof typeof ConvertMessages];

/**
 * Result of a conversion:
 *   - `{ ok: true, value, error: null }` when `v` is of (or convertible to) the requested type;
 *   - `{ ok: false, value: null, error }` otherwise, `error` being one of the fixed `ConvertMessages`.
 * Checking `result.ok` narrows the type: inside `if (r.ok)` `r.value` is `T`, otherwise `r.error` is set.
 */
export type Converted<T> = Success<T> | Failure;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
  readonly error: null;
}

export interface Failure {
  readonly ok: false;
  readonly value: null;
  readonly error: ConvertMessage;
}

/** Builds a failed result: `{ ok: false, value: null, error }`. */
export function failure(error: ConvertMessage): Failure {
  return { ok: false, value: null, error };
}

/** Builds a successful result: `{ ok: true, value, error: null }`. */
export function success<T>(value: T): Success<T> {
  return { ok: true, value, error: null };
}
