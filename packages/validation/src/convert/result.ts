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

export function failure(error: ConvertMessage): Failure {
  return { ok: false, value: null, error };
}

export function success<T>(value: T): Success<T> {
  return { ok: true, value, error: null };
}
